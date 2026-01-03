<?php

namespace Piwik\Plugins\FunnelInsights;

use Piwik\Piwik;
use Piwik\Archive;
use Piwik\DataTable;
use Piwik\DataTable\Map;
use Piwik\Plugins\FunnelInsights\DAO\FunnelConfig;

class API extends \Piwik\Plugin\API
{
    private $dao;

    public function __construct(FunnelConfig $dao = null)
    {
        $this->dao = $dao ?: new FunnelConfig();
    }

    /**
     * Extracts a single DataTable from an archive result.
     * Archive::getDataTable() may return a DataTable or a DataTable\Map (for date ranges).
     * This helper normalizes the result to a single DataTable.
     *
     * @param DataTable|Map|null $result
     * @return DataTable|null
     */
    private function extractDataTable($result): ?DataTable
    {
        if ($result === null) {
            return null;
        }

        // If it's a Map (date range), get the last table in the range (most recent)
        // Note: Map implements DataTableInterface but does NOT extend DataTable
        if ($result instanceof Map) {
            $tables = $result->getDataTables();
            if (empty($tables)) {
                return null;
            }
            return end($tables);
        }

        // If it's a plain DataTable, return it directly (must be DataTable at this point)
        return $result;
    }

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
        $invalidator = \Piwik\Container\StaticContainer::get('Piwik\Archive\ArchiveInvalidator');
        $invalidator->rememberToInvalidateArchivedReportsLater($idSite, \Piwik\Date::today());

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
        $result = $archive->getDataTable('FunnelInsights_Funnel_' . $idFunnel);
        $dataTable = $this->extractDataTable($result);

        if (!$dataTable || $dataTable->getRowsCount() === 0) {
            return array();
        }

        $data = array();
        foreach ($dataTable->getRows() as $row) {
            $data[] = $row->getColumns();
        }

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
                 
                 // Process Drop-offs (stored as JSON string in archive, decode if needed)
                 $dropoffUrls = array();
                 if (isset($row['dropoff_urls'])) {
                     if (is_string($row['dropoff_urls'])) {
                         $decoded = json_decode($row['dropoff_urls'], true);
                         $dropoffUrls = is_array($decoded) ? $decoded : array();
                     } elseif (is_array($row['dropoff_urls'])) {
                         $dropoffUrls = $row['dropoff_urls'];
                     }
                 }
                 if (!empty($dropoffUrls)) {
                     arsort($dropoffUrls); // Sort desc by count
                     $row['top_dropoffs'] = array_slice($dropoffUrls, 0, 5, true);
                     $row['dropoff_urls'] = $dropoffUrls;
                 } else {
                     $row['top_dropoffs'] = array();
                     $row['dropoff_urls'] = array();
                 }
            }
        }

        return $data;
    }
    
    public function getFunnelEvolution($idSite, $period, $date, $idFunnel)
    {
        Piwik::checkUserHasViewAccess($idSite);

        // Fetch evolution of the specific Funnel
        // This returns a Set of DataTables (one per period)
        $archive = Archive::build($idSite, $period, $date);
        $dataTable = $archive->getDataTable('FunnelInsights_Funnel_' . $idFunnel);

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
            $result = $archive->getDataTable('FunnelInsights_Funnel_' . $idFunnel);
            $dataTable = $this->extractDataTable($result);

            if (!$dataTable || $dataTable->getRowsCount() === 0) {
                $reportData[] = array(
                    'label' => $funnel['name'],
                    'idfunnel' => $idFunnel,
                    'entries' => 0,
                    'conversions' => 0,
                    'conversion_rate' => '0%'
                );
                continue;
            }

            $entries = 0;
            $conversions = 0;

            $rows = $dataTable->getRows();
            if (!empty($rows)) {
                // Step 0 is usually entry
                $firstRow = $dataTable->getFirstRow();
                $entries = $firstRow ? ($firstRow->getColumn('entries') ?: 0) : 0;

                // Last step is conversion
                $lastRow = $dataTable->getLastRow();
                $conversions = $lastRow ? ($lastRow->getColumn('visits') ?: 0) : 0;
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
        
        $matcher = new \Piwik\Plugins\FunnelInsights\Model\StepMatcher();
        
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