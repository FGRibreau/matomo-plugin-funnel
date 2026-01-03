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
        $dateEnd = $period->getDateEnd()->getDatetime();
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
            $sqlVisits = "
                SELECT DISTINCT l.idvisit
                FROM {$logLinkVisitAction} AS l
                LEFT JOIN {$logVisit} AS v ON l.idvisit = v.idvisit
                WHERE l.idsite = ? AND l.server_time >= ? AND l.server_time <= ?
                ORDER BY l.idvisit
                LIMIT ? OFFSET ?
            ";
            $bindVisits = array_merge($bind, array($limit, $offset));

            $visitIdsRows = Db::get()->fetchAll($sqlVisits, $bindVisits);
            $visitIds = array_map(function($r) { return $r['idvisit']; }, $visitIdsRows);
            
            if (empty($visitIds)) {
                break; // No more visits
            }
            
            $placeholders = implode(',', array_fill(0, count($visitIds), '?'));
            $sqlActions = "
                SELECT
                    l.idvisit, l.server_time,
                    a_url.name AS url,
                    a_name.name AS pageTitle,
                    l.search_term,
                    a_cat.name AS eventCategory,
                    a_act.name AS eventAction,
                    a_evtname.name AS eventName
                FROM {$logLinkVisitAction} AS l
                LEFT JOIN {$logAction} AS a_url ON l.idaction_url = a_url.idaction
                LEFT JOIN {$logAction} AS a_name ON l.idaction_name = a_name.idaction
                LEFT JOIN {$logAction} AS a_cat ON l.idaction_event_category = a_cat.idaction
                LEFT JOIN {$logAction} AS a_act ON l.idaction_event_action = a_act.idaction
                LEFT JOIN {$logAction} AS a_evtname ON l.idaction_event_name = a_evtname.idaction
                WHERE l.idvisit IN ({$placeholders})
                ORDER BY l.idvisit, l.server_time ASC
            ";

            $rows = Db::get()->fetchAll($sqlActions, $visitIds);
            
            $visits = array();
            foreach ($rows as $row) {
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

            // Serialize dropoff_urls array to JSON to avoid "Multidimensional column values not supported" error
            foreach ($finalStats as $stepIdx => $stepData) {
                if (isset($stepData['dropoff_urls']) && is_array($stepData['dropoff_urls'])) {
                    $finalStats[$stepIdx]['dropoff_urls'] = json_encode($stepData['dropoff_urls']);
                }
            }

            $dataTable = new DataTable();
            $dataTable->addRowsFromSimpleArray($finalStats);

            $this->getProcessor()->insertBlobRecord('FunnelInsights_Funnel_' . $funnelId, $dataTable->getSerialized());
        }
    }

    public function aggregateMultipleReports()
    {
         $this->getProcessor()->aggregateDataTableRecords(
            'FunnelInsights_Funnel_*'
        );
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
                    
                    // 1. Check if this action matches a SUBSEQUENT step
                    $matchFoundIndex = -1;
                    
                    for ($i = $currentStepIndex + 1; $i < count($steps); $i++) {
                        $nextStep = $steps[$i];
                        if ($matcher->match($nextStep, $action)) {
                            $matchFoundIndex = $i;
                            break;
                        }
                        if (isset($nextStep['required']) && $nextStep['required']) {
                            break; 
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
