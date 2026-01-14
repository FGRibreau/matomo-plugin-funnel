<?php

namespace Piwik\Plugins\FunnelInsights;

use Piwik\Plugin\Archiver as AbstractArchiver;
use Piwik\Plugins\FunnelInsights\DAO\FunnelConfig;
use Piwik\Plugins\FunnelInsights\Model\StepMatcher;
use Piwik\Db;
use Piwik\Common;
use Piwik\DataTable;
use Piwik\Metrics\Formatter;

class Archiver extends AbstractArchiver
{
    public function aggregateDayReport()
    {
        $idSite = $this->getProcessor()->getParams()->getSite()->getId();
        $period = $this->getProcessor()->getParams()->getPeriod();
        
        $dao = new FunnelConfig();
        $funnels = $dao->getAllForSite($idSite);
        
        if (empty($funnels)) {
            return;
        }

        $matcher = new StepMatcher();
        $dateStart = $period->getDateStart()->getDatetime();
        // getDatetime() may return empty for end date, use end of day explicitly
        $dateEnd = $period->getDateEnd()->toString('Y-m-d') . ' 23:59:59';
        $segment = $this->getProcessor()->getParams()->getSegment();

        // Initialize Aggregated Stats for all funnels
        $aggregatedStats = array();
        foreach ($funnels as $funnel) {
            if (!$funnel['active']) continue;
            // Always initialize the funnel key, even if no steps
            $aggregatedStats[$funnel['idfunnel']] = array();
            $steps = isset($funnel['steps']) ? $funnel['steps'] : array();
            foreach ($steps as $index => $step) {
                $aggregatedStats[$funnel['idfunnel']][$index] = array(
                    'visits' => 0, 'entries' => 0, 'exits' => 0, 'proceeded' => 0, 'skips' => 0,
                    'time_spent' => 0, 'time_hits' => 0, 'dropoff_urls' => array()
                );
            }
        }

        // Batch Processing Configuration
        $limit = 5000; // Process 5000 actions/rows per batch
        $offset = 0;
        
        $logLinkVisitAction = Common::prefixTable('log_link_visit_action');
        $logAction = Common::prefixTable('log_action');
        $logVisit = Common::prefixTable('log_visit');
        $logConversion = Common::prefixTable('log_conversion');

        $bind = array($idSite, $dateStart, $dateEnd);

        do {
            // Note: LIMIT/OFFSET must be interpolated directly (not as bound params)
            // because MariaDB/MySQL treat bound LIMIT params as strings
            $sqlVisits = "
                SELECT DISTINCT l.idvisit
                FROM {$logLinkVisitAction} AS l
                LEFT JOIN {$logVisit} AS v ON l.idvisit = v.idvisit
                WHERE l.idsite = ? AND l.server_time >= ? AND l.server_time <= ?
                ORDER BY l.idvisit
                LIMIT " . (int)$limit . " OFFSET " . (int)$offset . "
            ";

            $visitIdsRows = Db::get()->fetchAll($sqlVisits, $bind);
            $visitIds = array_map(function($r) { return $r['idvisit']; }, $visitIdsRows);
            
            if (empty($visitIds)) {
                break; // No more visits
            }
            
            $placeholders = implode(',', array_fill(0, count($visitIds), '?'));
            // Event data: category & action have dedicated columns, event name uses idaction_name
            // Site search: search term is in idaction_name when url action type = 8
            $sqlActions = "
                SELECT
                    l.idvisit, l.server_time,
                    a_url.name AS url,
                    a_url.type AS url_type,
                    a_name.name AS pageTitle,
                    a_name.type AS name_type,
                    a_cat.name AS eventCategory,
                    a_act.name AS eventAction
                FROM {$logLinkVisitAction} AS l
                LEFT JOIN {$logAction} AS a_url ON l.idaction_url = a_url.idaction
                LEFT JOIN {$logAction} AS a_name ON l.idaction_name = a_name.idaction
                LEFT JOIN {$logAction} AS a_cat ON l.idaction_event_category = a_cat.idaction
                LEFT JOIN {$logAction} AS a_act ON l.idaction_event_action = a_act.idaction
                WHERE l.idvisit IN ({$placeholders})
                ORDER BY l.idvisit, l.server_time ASC
            ";

            $rows = Db::get()->fetchAll($sqlActions, $visitIds);

            $visits = array();
            foreach ($rows as $row) {
                // Derive search_term and eventName based on Matomo action types
                // Type 8 = TYPE_SITE_SEARCH (search term is in pageTitle/name)
                // Type 10 = TYPE_EVENT_NAME (event name is in pageTitle/name)
                $row['search_term'] = ($row['url_type'] == 8) ? $row['pageTitle'] : null;
                $row['eventName'] = ($row['name_type'] == 10) ? $row['pageTitle'] : null;

                $visits[$row['idvisit']][] = $row;
            }

             // 2. Fetch Goal Conversions
            $conversions = array();
            $neededGoals = false;
            foreach ($funnels as $f) {
                if (!empty($f['goal_id'])) {
                    $neededGoals = true;
                    break;
                }
            }

            if ($neededGoals && !empty($visits)) {
                $visitIdsList = array_keys($visits);
                $convSql = "
                    SELECT idvisit, idgoal
                    FROM {$logConversion}
                    WHERE idsite = ? AND server_time >= ? AND server_time <= ?
                    AND idvisit IN (" . implode(',', $visitIdsList) . ")
                ";
                $cRows = Db::get()->fetchAll($convSql, array($idSite, $dateStart, $dateEnd));
                foreach ($cRows as $cRow) {
                    $conversions[$cRow['idvisit']][] = $cRow['idgoal'];
                }
            }
            
            // Process Batch
            foreach ($funnels as $funnel) {
                if (!$funnel['active']) continue;
                
                $batchStats = $this->calculateFunnelMetrics($funnel, $visits, $matcher, $conversions);
                
                // Merge Stats
                foreach ($batchStats as $stepIdx => $metrics) {
                    foreach ($metrics as $key => $val) {
                        if ($key === 'dropoff_urls') {
                            // Merge URL counts
                            foreach ($val as $url => $count) {
                                if (!isset($aggregatedStats[$funnel['idfunnel']][$stepIdx][$key][$url])) {
                                    $aggregatedStats[$funnel['idfunnel']][$stepIdx][$key][$url] = 0;
                                }
                                $aggregatedStats[$funnel['idfunnel']][$stepIdx][$key][$url] += $count;
                            }
                        } else {
                            $aggregatedStats[$funnel['idfunnel']][$stepIdx][$key] += $val;
                        }
                    }
                }
            }
            
            // Prepare next batch
            $offset += $limit;
            
            // Safety break
            if (count($visitIds) < $limit) {
                break;
            }
            
        } while (true);
        
        // Finalize: Save Blobs
        foreach ($funnels as $funnel) {
            if (!$funnel['active']) continue;

            $funnelId = $funnel['idfunnel'];
            $finalStats = isset($aggregatedStats[$funnelId]) ? $aggregatedStats[$funnelId] : array();

            // Prepare rows with 'label' column for proper aggregation
            // Matomo requires a 'label' column to merge rows in addDataTable()
            foreach ($finalStats as $stepIdx => $stepData) {
                // Add label column (step index as string)
                $finalStats[$stepIdx]['label'] = (string)$stepIdx;

                // Serialize dropoff_urls array to JSON
                if (isset($stepData['dropoff_urls']) && is_array($stepData['dropoff_urls'])) {
                    $finalStats[$stepIdx]['dropoff_urls'] = json_encode($stepData['dropoff_urls']);
                }
            }

            $dataTable = new DataTable();
            $dataTable->addRowsFromSimpleArray(array_values($finalStats));

            $this->getProcessor()->insertBlobRecord('FunnelInsights_Funnel_' . $funnelId, $dataTable->getSerialized());
        }
    }

    public function aggregateMultipleReports()
    {
        $idSite = $this->getProcessor()->getParams()->getSite()->getId();
        $dao = new FunnelConfig();
        $funnels = $dao->getAllForSite($idSite);

        foreach ($funnels as $funnel) {
            if (!$funnel['active']) continue;

            $recordName = 'FunnelInsights_Funnel_' . $funnel['idfunnel'];
            $this->getProcessor()->aggregateDataTableRecords($recordName);
        }
    }
    
    private function calculateFunnelMetrics($funnel, $visits, $matcher, $conversions = array())
    {
        $steps = isset($funnel['steps']) ? $funnel['steps'] : array();
        $goalId = isset($funnel['goal_id']) ? $funnel['goal_id'] : null;
        $strictMode = isset($funnel['strict_mode']) && $funnel['strict_mode'];
        // Time limit in seconds between steps (optional)
        $stepTimeLimit = isset($funnel['step_time_limit']) ? (int)$funnel['step_time_limit'] : 0; 

        $stats = array();
        
        foreach ($steps as $index => $step) {
            $stats[$index] = array(
                'visits' => 0,
                'entries' => 0,
                'exits' => 0,
                'proceeded' => 0,
                'skips' => 0,
                'time_spent' => 0, // Total seconds spent before proceeding
                'time_hits' => 0,  // Number of transitions to calculate avg
                'dropoff_urls' => array() // [url => count]
            );
        }
        
        foreach ($visits as $idVisit => $actions) {
            // Check Goal Linking
            if ($goalId) {
                $visitGoals = isset($conversions[$idVisit]) ? $conversions[$idVisit] : array();
                if (!in_array($goalId, $visitGoals)) {
                    continue; // Skip this visit as it didn't convert the required goal
                }
            }

            $currentStepIndex = -1; 
            $currentStepActionIndex = -1; // Index in the $actions array
            
            // Iterate actions to find Entry
            for ($k = 0; $k < count($actions); $k++) {
                $action = $actions[$k];
                
                // Try to find entry
                if ($currentStepIndex === -1) {
                    $matchedEntryStep = -1;
                    
                    for ($i = 0; $i < count($steps); $i++) {
                        $step = $steps[$i];
                        if ($matcher->match($step, $action)) {
                            $matchedEntryStep = $i;
                            break;
                        }
                        if (isset($step['required']) && $step['required']) {
                            break;
                        }
                    }
                    
                    if ($matchedEntryStep > -1) {
                        $currentStepIndex = $matchedEntryStep;
                        $currentStepActionIndex = $k;
                        $stats[$currentStepIndex]['visits']++;
                        $stats[$currentStepIndex]['entries']++;
                        
                        for ($j = 0; $j < $matchedEntryStep; $j++) {
                            $stats[$j]['skips']++;
                        }
                        
                        // Continue to process flow from this action
                        // We don't break the outer loop, we continue to look for next steps
                    }
                } else {
                    // Already in funnel at $currentStepIndex.
                    // Check if we moved to a NEXT step or broke the flow.
                    
                    // 1. Check if this action matches the NEXT step (immediate only)
                    // A visit can only progress to the immediate next step to ensure
                    // visits[N+1] <= visits[N] (proper funnel dependency)
                    $matchFoundIndex = -1;

                    $nextStepIndex = $currentStepIndex + 1;
                    if ($nextStepIndex < count($steps)) {
                        $nextStep = $steps[$nextStepIndex];
                        if ($matcher->match($nextStep, $action)) {
                            $matchFoundIndex = $nextStepIndex;
                        }
                    }
                    
                    if ($matchFoundIndex > -1) {
                        // FOUND NEXT STEP
                        
                        // Logic Check: Strict Mode & Time Limit
                        $validTransition = true;
                        
                        // Time Limit Check
                        $timeDiff = 0;
                        if ($stepTimeLimit > 0) {
                            $prevTime = strtotime($actions[$currentStepActionIndex]['server_time']);
                            $currTime = strtotime($action['server_time']);
                            $timeDiff = $currTime - $prevTime;
                            if ($timeDiff > $stepTimeLimit) {
                                $validTransition = false;
                            }
                        } else {
                             // Calc time anyway for stats
                             $prevTime = strtotime($actions[$currentStepActionIndex]['server_time']);
                             $currTime = strtotime($action['server_time']);
                             $timeDiff = $currTime - $prevTime;
                        }

                        // Strict Mode Check
                        // Ensure no intervening pages between $currentStepActionIndex and $k
                        if ($validTransition && $strictMode) {
                            for ($m = $currentStepActionIndex + 1; $m < $k; $m++) {
                                $intermediateAction = $actions[$m];
                                // If it's a page view (has URL)
                                if (!empty($intermediateAction['url'])) {
                                    // And does not match current step (refresh) 
                                    // (Simplification: Strict means NO other pages. Refreshes of same step might be allowed?)
                                    // Let's assume strict means strict. No other URL.
                                    $validTransition = false;
                                    break;
                                }
                            }
                        }

                        if ($validTransition) {
                            // Transition Success
                            $stats[$currentStepIndex]['proceeded']++;
                            $stats[$currentStepIndex]['time_spent'] += $timeDiff;
                            $stats[$currentStepIndex]['time_hits']++;
                            
                            for ($n = $currentStepIndex + 1; $n < $matchFoundIndex; $n++) {
                                $stats[$n]['skips']++;
                            }
                            
                            $currentStepIndex = $matchFoundIndex;
                            $currentStepActionIndex = $k;
                            $stats[$currentStepIndex]['visits']++;
                        }
                    } 
                    // Else: action didn't match a forward step. 
                    // It might be a refresh of current step, or a deviation.
                    // If Strict Mode, a deviation (page view) that is not the next step 
                    // effectively ends the funnel?
                    // "Strict Mode: The user must not visit any other page."
                    // So if we see a URL that doesn't match next step, we might need to abort?
                    // BUT we iterate linearly. If action K doesn't match next step, we continue to K+1.
                    // Unless strict mode says "Action K MUST be next step".
                    // The implementation above checks "When we find Next Step at K, check gap between Last Step and K".
                    // This handles strict mode correctly for "eventual" success. 
                    // If they visit A -> B (ok). A -> Random -> B (Fail Strict).
                    // So we don't need to break here. We just won't match the transition later.
                }
            }
            
            // After processing all actions for visit, check drop-off
            if ($currentStepIndex > -1) {
                 if ($currentStepIndex < count($steps) - 1) {
                     $stats[$currentStepIndex]['exits']++;
                     
                     // Capture Drop-off URL
                     // The user stopped at $currentStepIndex (action index $currentStepActionIndex).
                     // Did they do anything AFTER?
                     if (isset($actions[$currentStepActionIndex + 1])) {
                         $nextAction = $actions[$currentStepActionIndex + 1];
                         if (!empty($nextAction['url'])) {
                             $url = $nextAction['url'];
                             if (!isset($stats[$currentStepIndex]['dropoff_urls'][$url])) {
                                 $stats[$currentStepIndex]['dropoff_urls'][$url] = 0;
                             }
                             $stats[$currentStepIndex]['dropoff_urls'][$url]++;
                         }
                     }
                 }
            }
        }
        
        return $stats;
    }
}
