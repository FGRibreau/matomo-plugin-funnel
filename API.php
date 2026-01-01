<?php

namespace Piwik\Plugins\Funnels;

use Piwik\Piwik;
use Piwik\Archive;
use Piwik\Plugins\Funnels\DAO\FunnelConfig;

class API extends \Piwik\Plugin\API
{
    private $dao;

    public function __construct(FunnelConfig $dao = null)
    {
        $this->dao = $dao ?: new FunnelConfig();
    }

    // ... (Management methods from previous step - assuming they are preserved or I need to re-include them?
    // The previous write_file overwrote API.php? NO, I need to Append or Merge.
    // The previous tool usage was write_file with full content. I must include previous methods.)

    public function createFunnel($idSite, $name, $steps, $goalId = null, $active = 0, $strictMode = 0, $stepTimeLimit = 0)
    {
        Piwik::checkUserHasAdminAccess($idSite);
        return $this->dao->create($idSite, $name, $steps, $goalId, $active, $strictMode, $stepTimeLimit);
    }

    public function updateFunnel($idFunnel, $idSite, $name, $steps, $goalId = null, $active = 0, $strictMode = 0, $stepTimeLimit = 0)
    {
        Piwik::checkUserHasAdminAccess($idSite);
        $funnel = $this->dao->get($idFunnel);
        if (!$funnel || $funnel['idsite'] != $idSite) {
            throw new \Exception("Funnel not found or access denied.");
        }
        
        $this->dao->update($idFunnel, $name, $steps, $goalId, $active, $strictMode, $stepTimeLimit);
        
        // Invalidate archives so the funnel is re-processed with new steps
        // We invalidate for the specific site
        $invalidator = new \Piwik\Archive\Invalidator();
        $invalidator->rememberToInvalidateArchivedReports($idSite, \Piwik\Date::today());
        
        return true;
    }

    public function deleteFunnel($idSite, $idFunnel)
    {
        Piwik::checkUserHasAdminAccess($idSite);
         $funnel = $this->dao->get($idFunnel);
        if (!$funnel || $funnel['idsite'] != $idSite) {
            throw new \Exception("Funnel not found or access denied.");
        }
        $this->dao->delete($idFunnel);
        return true;
    }

    public function duplicateFunnel($idSite, $idFunnel)
    {
        Piwik::checkUserHasAdminAccess($idSite);
        $funnel = $this->getFunnel($idSite, $idFunnel);
        
        if (!$funnel) {
            throw new \Exception("Funnel to duplicate not found.");
        }
        
        $newName = $funnel['name'] . " (Copy)";
        $steps = $funnel['steps']; // Array
        $goalId = $funnel['goal_id'];
        $active = 0; // Default to inactive
        $strictMode = isset($funnel['strict_mode']) ? $funnel['strict_mode'] : 0;
        $stepTimeLimit = isset($funnel['step_time_limit']) ? $funnel['step_time_limit'] : 0;
        
        return $this->createFunnel($idSite, $newName, $steps, $goalId, $active, $strictMode, $stepTimeLimit);
    }

    public function getFunnels($idSite)
    {
        Piwik::checkUserHasViewAccess($idSite);
        return $this->dao->getAllForSite($idSite);
    }

    public function getFunnel($idSite, $idFunnel)
    {
        Piwik::checkUserHasViewAccess($idSite);
        $funnel = $this->dao->get($idFunnel);
        if ($funnel && $funnel['idsite'] == $idSite) {
            return $funnel;
        }
        return null;
    }
    
    // Reporting API
    public function getFunnelReport($idSite, $period, $date, $idFunnel)
    {
        Piwik::checkUserHasViewAccess($idSite);
        
        $archive = Archive::build($idSite, $period, $date);
        $dataTable = $archive->getBlob('Funnel_' . $idFunnel);
        
        if (!$dataTable) {
            return array();
        }

        $dataTable->queueFilter('ReplaceColumnNames');
        $data = $dataTable->getDataTable()->asArray();

        // Fetch definition to label the rows
        $funnelDef = $this->getFunnel($idSite, $idFunnel);
        if ($funnelDef) {
            $steps = $funnelDef['steps'];
            // Enrich with step names and process new metrics
            foreach ($data as $index => &$row) {
                 if (isset($steps[$index])) {
                     $row['label'] = $steps[$index]['name'];
                     $row['step_config'] = $steps[$index];
                 }
                 
                 // Process Time Stats
                 if (isset($row['time_hits']) && $row['time_hits'] > 0) {
                     $avgSeconds = $row['time_spent'] / $row['time_hits'];
                     $row['avg_time_on_step'] = round($avgSeconds, 1) . 's';
                     $row['avg_time_on_step_raw'] = $avgSeconds;
                 } else {
                     $row['avg_time_on_step'] = '-';
                     $row['avg_time_on_step_raw'] = 0;
                 }
                 
                 // Process Drop-offs
                 if (isset($row['dropoff_urls']) && is_array($row['dropoff_urls'])) {
                     arsort($row['dropoff_urls']); // Sort desc by count
                     $row['top_dropoffs'] = array_slice($row['dropoff_urls'], 0, 5, true);
                     // Clean up raw full list from output if too large? 
                     // For API it might be fine, but for UI we might want just top 5.
                     // Let's keep raw but maybe truncated in a real scenario.
                 } else {
                     $row['top_dropoffs'] = array();
                 }
            }
        }

        return $data;
    }
    
    public function getFunnelEvolution($idSite, $period, $date, $idFunnel)
    {
        Piwik::checkUserHasViewAccess($idSite);
        
        // Fetch evolution of the specific Funnel blob
        // This returns a Set of DataTables (one per period)
        $archive = Archive::build($idSite, $period, $date);
        $dataTable = $archive->getBlob('Funnel_' . $idFunnel);
        
        return $dataTable;
    }
    
    /**
     * Returns a summary report of all active funnels for the site.
     * Metrics: Entries, Conversions (Visits at last step), Conversion Rate.
     */
    public function getOverview($idSite, $period, $date)
    {
        Piwik::checkUserHasViewAccess($idSite);
        
        $funnels = $this->dao->getAllForSite($idSite);
        $reportData = array();
        
        $archive = Archive::build($idSite, $period, $date);
        
        foreach ($funnels as $funnel) {
            if (!$funnel['active']) continue;
            
            $idFunnel = $funnel['idfunnel'];
            $dataTable = $archive->getBlob('Funnel_' . $idFunnel);
            
            if (!$dataTable) {
                $reportData[] = array(
                    'label' => $funnel['name'],
                    'idfunnel' => $idFunnel,
                    'entries' => 0,
                    'conversions' => 0,
                    'conversion_rate' => '0%'
                );
                continue;
            }
            
            // Process DataTable (summing up if it's a Set/Archive)
            // For 'day', it's a simple DataTable.
            // For 'range', it might need aggregation.
            // Assuming getBlob returns the aggregated table for the requested period/date.
            
            $table = $dataTable->getDataTable();
            $rows = $table->asArray();
            
            $entries = 0;
            $conversions = 0;
            
            if (!empty($rows)) {
                // Step 0 is usually entry
                $firstStep = reset($rows);
                $entries = isset($firstStep['entries']) ? $firstStep['entries'] : 0;
                
                // Last step is conversion
                $lastStep = end($rows);
                $conversions = isset($lastStep['visits']) ? $lastStep['visits'] : 0;
                // Note: 'visits' at last step = completed flow = conversions.
            }
            
            $rate = ($entries > 0) ? ($conversions / $entries * 100) : 0;
            
            $reportData[] = array(
                'label' => $funnel['name'],
                'idfunnel' => $idFunnel,
                'entries' => $entries,
                'conversions' => $conversions,
                'conversion_rate' => number_format($rate, 1) . '%'
            );
        }
        
        // Convert to DataTable for renderer
        $resultTable = new \Piwik\DataTable();
        $resultTable->addRowsFromSimpleArray($reportData);
        
        return $resultTable;
    }

    /**
     * Helper to validate steps against a URL.
     */
    public function validateFunnelSteps($idSite, $steps, $testUrl)
    {
        Piwik::checkUserHasAdminAccess($idSite);
        
        if (is_string($steps)) {
            $steps = json_decode($steps, true);
        }

        // Populate all fields with the test value to allow flexible validation
        $hit = array(
            'url' => $testUrl,
            'pageTitle' => $testUrl,
            'eventCategory' => $testUrl,
            'eventAction' => $testUrl,
            'eventName' => $testUrl,
            'search_term' => $testUrl
        );
        
        $results = array();
        
        $matcher = new \Piwik\Plugins\Funnels\Model\StepMatcher();
        
        foreach ($steps as $index => $step) {
            $match = $matcher->match($step, $hit);
            $results[] = array(
                'step_index' => $index,
                'step_name' => isset($step['name']) ? $step['name'] : "Step $index",
                'matched' => $match
            );
        }
        
        return $results;
    }
    
    /**
     * Helper for "Known Values" autocomplete.
     * Returns recent URLs or Titles to help user config.
     */
    public function getSuggestedValues($idSite, $type)
    {
        Piwik::checkUserHasAdminAccess($idSite);
        
        $idActionType = 1; // Default URL
        if ($type === 'page_title') $idActionType = 2;
        elseif ($type === 'event_category') $idActionType = 10;
        elseif ($type === 'event_action') $idActionType = 11;
        elseif ($type === 'event_name') $idActionType = 12;
        
        // Limit to last 50 distinct values
        $sql = "SELECT name 
                FROM " . \Piwik\Common::prefixTable('log_action') . " 
                WHERE type = ? 
                ORDER BY idaction DESC 
                LIMIT 50";
        
        $rows = \Piwik\Db::get()->fetchAll($sql, array($idActionType));
        
        $values = array();
        foreach ($rows as $row) {
            $values[] = $row['name'];
        }
        
        return array_unique($values);
    }
}