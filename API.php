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
    
    /**
     * Returns funnel evolution data for row evolution graphs.
     * Always returns a DataTable\Map to be compatible with Matomo's RowEvolution feature.
     *
     * @param int $idSite
     * @param string $period
     * @param string $date
     * @param int $idFunnel
     * @return Map
     */
    public function getFunnelEvolution($idSite, $period, $date, $idFunnel)
    {
        Piwik::checkUserHasViewAccess($idSite);

        // Fetch evolution of the specific Funnel
        $archive = Archive::build($idSite, $period, $date);
        /** @var DataTable|Map|null $result */
        $result = $archive->getDataTable('FunnelInsights_Funnel_' . $idFunnel);

        // RowEvolution always expects a DataTable\Map (one table per period).
        // Already a Map - return as-is
        if ($result instanceof Map) {
            return $result;
        }

        // For single dates, Archive::getDataTable() returns a plain DataTable,
        // so we wrap it in a Map to maintain API compatibility.
        if ($result instanceof DataTable) {
            $map = new Map();
            $map->setKeyName('date');
            $map->addTable($result, $date);
            return $map;
        }

        // If null or empty, return an empty Map
        $map = new Map();
        $map->setKeyName('date');
        return $map;
    }
    
    /**
     * Returns a summary report of all active funnels for the site.
     * Metrics: Entries, Conversions (Visits at last step), Conversion Rate.
     *
     * Returns DataTable for single dates (for HTML table rendering)
     * Returns DataTable\Map for date ranges (for Row Evolution support)
     *
     * CRITICAL: For Row Evolution to work, the returned Map must have:
     * 1. Same key format as archive (date strings like "2024-01-15")
     * 2. Period metadata copied from archive tables (for Period::factory())
     *
     * @return DataTable|Map
     */
    public function getOverview($idSite, $period, $date)
    {
        Piwik::checkUserHasViewAccess($idSite);

        $funnels = $this->dao->getAllForSite($idSite);
        $activeFunnels = array_filter($funnels, function($f) { return $f['active']; });

        // If no active funnels, return empty DataTable
        if (empty($activeFunnels)) {
            return new DataTable();
        }

        $archive = Archive::build($idSite, $period, $date);

        // Get first funnel's data as template to detect Map vs DataTable
        $firstFunnel = reset($activeFunnels);
        $templateResult = $archive->getDataTable('FunnelInsights_Funnel_' . $firstFunnel['idfunnel']);

        // Single date: Archive returns plain DataTable
        if (!($templateResult instanceof Map)) {
            return $this->buildOverviewTableSingle($archive, $activeFunnels);
        }

        // Date range: Archive returns Map - MUST preserve metadata for Row Evolution
        // Pre-fetch all funnel archives to avoid repeated queries
        $funnelArchives = array();
        foreach ($activeFunnels as $funnel) {
            $funnelArchives[$funnel['idfunnel']] = $archive->getDataTable('FunnelInsights_Funnel_' . $funnel['idfunnel']);
        }

        // Create result Map with same key name as template
        // NOTE: Map does NOT have getMetadata() - only DataTable does
        // The period metadata lives on individual DataTables, not on the Map itself
        $resultMap = new Map();
        $resultMap->setKeyName($templateResult->getKeyName());

        // Build overview table for each date, copying period metadata from template tables
        foreach ($templateResult->getDataTables() as $dateKey => $templateTable) {
            $summaryTable = new DataTable();

            // CRITICAL: Copy period metadata from template table
            // Row Evolution uses this to call Period::factory() and getDateStart()
            // NOTE: getMetadata($key) requires 1 arg, use getAllTableMetadata() for all
            if ($templateTable instanceof DataTable) {
                foreach ($templateTable->getAllTableMetadata() as $metaKey => $metaValue) {
                    $summaryTable->setMetadata($metaKey, $metaValue);
                }
            }

            // Build summary data for this date
            $reportData = array();
            foreach ($activeFunnels as $funnel) {
                $idFunnel = $funnel['idfunnel'];
                $funnelMap = $funnelArchives[$idFunnel];

                $dataTable = null;
                if ($funnelMap instanceof Map) {
                    $tables = $funnelMap->getDataTables();
                    if (isset($tables[$dateKey])) {
                        $dataTable = $tables[$dateKey];
                    }
                }

                $reportData[] = $this->buildFunnelSummaryRow($funnel, $dataTable);
            }

            $summaryTable->addRowsFromSimpleArray($reportData);
            $resultMap->addTable($summaryTable, $dateKey);
        }

        return $resultMap;
    }

    /**
     * Build overview summary for a single date (when archive returns plain DataTable).
     */
    private function buildOverviewTableSingle($archive, $activeFunnels): DataTable
    {
        $reportData = array();

        foreach ($activeFunnels as $funnel) {
            $idFunnel = $funnel['idfunnel'];
            $result = $archive->getDataTable('FunnelInsights_Funnel_' . $idFunnel);
            $dataTable = $this->extractDataTable($result);

            $reportData[] = $this->buildFunnelSummaryRow($funnel, $dataTable);
        }

        $resultTable = new DataTable();
        $resultTable->addRowsFromSimpleArray($reportData);
        return $resultTable;
    }

    /**
     * Build a summary row for a single funnel from its archived data.
     */
    private function buildFunnelSummaryRow($funnel, $dataTable): array
    {
        $idFunnel = $funnel['idfunnel'];

        if (!$dataTable || $dataTable->getRowsCount() === 0) {
            return array(
                'label' => $funnel['name'],
                'idfunnel' => $idFunnel,
                'entries' => 0,
                'conversions' => 0,
                'conversion_rate' => 0
            );
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

        return array(
            'label' => $funnel['name'],
            'idfunnel' => $idFunnel,
            'entries' => $entries,
            'conversions' => $conversions,
            'conversion_rate' => round($rate, 1)
        );
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

    /**
     * Returns evolution data for a specific step in a funnel.
     * Enables Row Evolution popup for individual funnel steps.
     *
     * @param int $idSite
     * @param string $period
     * @param string $date
     * @param int $idFunnel
     * @param int $stepIndex The 0-based index of the step
     * @return Map
     */
    public function getStepEvolution($idSite, $period, $date, $idFunnel, $stepIndex)
    {
        Piwik::checkUserHasViewAccess($idSite);

        $archive = Archive::build($idSite, $period, $date);
        $result = $archive->getDataTable('FunnelInsights_Funnel_' . $idFunnel);

        $resultMap = new Map();
        $resultMap->setKeyName('date');

        // For single date, wrap in Map
        if ($result instanceof DataTable) {
            $stepTable = $this->extractStepRow($result, $stepIndex);
            $resultMap->addTable($stepTable, $date);
            return $resultMap;
        }

        // For date ranges (Map) or any other case
        if ($result instanceof Map) {
            foreach ($result->getDataTables() as $dateKey => $table) {
                $stepTable = $this->extractStepRow($table, $stepIndex);
                // Copy period metadata
                if ($table instanceof DataTable) {
                    foreach ($table->getAllTableMetadata() as $metaKey => $metaValue) {
                        $stepTable->setMetadata($metaKey, $metaValue);
                    }
                }
                $resultMap->addTable($stepTable, $dateKey);
            }
        }

        return $resultMap;
    }

    /**
     * Extract a single step's data as a DataTable with one row.
     */
    private function extractStepRow(DataTable $table, $stepIndex): DataTable
    {
        $stepTable = new DataTable();
        $rows = $table->getRows();

        if (isset($rows[$stepIndex])) {
            $row = $rows[$stepIndex];
            $stepTable->addRowsFromSimpleArray(array($row->getColumns()));
        }

        return $stepTable;
    }

    /**
     * Returns sparkline data for a specific funnel or overview.
     * Returns conversion rate trends over time for mini-graphs.
     *
     * @param int $idSite
     * @param string $period
     * @param string $date
     * @param int|null $idFunnel If null, returns data for all active funnels
     * @param string $metric The metric to return: 'conversion_rate', 'entries', 'conversions'
     * @return array
     */
    public function getSparklineData($idSite, $period, $date, $idFunnel = null, $metric = 'conversion_rate')
    {
        Piwik::checkUserHasViewAccess($idSite);

        if ($idFunnel) {
            // Single funnel sparkline
            return $this->getFunnelSparkline($idSite, $period, $date, $idFunnel, $metric);
        }

        // All active funnels sparklines
        $funnels = $this->dao->getAllForSite($idSite);
        $activeFunnels = array_filter($funnels, function($f) { return $f['active']; });

        $result = array();
        foreach ($activeFunnels as $funnel) {
            $result[$funnel['idfunnel']] = array(
                'name' => $funnel['name'],
                'data' => $this->getFunnelSparkline($idSite, $period, $date, $funnel['idfunnel'], $metric)
            );
        }

        return $result;
    }

    /**
     * Get sparkline data for a single funnel.
     */
    private function getFunnelSparkline($idSite, $period, $date, $idFunnel, $metric): array
    {
        $archive = Archive::build($idSite, $period, $date);
        $result = $archive->getDataTable('FunnelInsights_Funnel_' . $idFunnel);

        $sparklineData = array();

        if ($result instanceof Map) {
            foreach ($result->getDataTables() as $dateKey => $table) {
                $value = $this->extractMetricValue($table, $metric);
                $sparklineData[] = array(
                    'date' => $dateKey,
                    'value' => $value
                );
            }
        } elseif ($result instanceof DataTable) {
            $value = $this->extractMetricValue($result, $metric);
            $sparklineData[] = array(
                'date' => $date,
                'value' => $value
            );
        }

        return $sparklineData;
    }

    /**
     * Extract a metric value from a funnel DataTable.
     */
    private function extractMetricValue(DataTable $table, $metric)
    {
        if ($table->getRowsCount() === 0) {
            return 0;
        }

        $firstRow = $table->getFirstRow();
        $lastRow = $table->getLastRow();

        $entries = $firstRow ? ($firstRow->getColumn('entries') ?: 0) : 0;
        $conversions = $lastRow ? ($lastRow->getColumn('visits') ?: 0) : 0;

        switch ($metric) {
            case 'entries':
                return $entries;
            case 'conversions':
                return $conversions;
            case 'conversion_rate':
            default:
                return ($entries > 0) ? round($conversions / $entries * 100, 1) : 0;
        }
    }

    /**
     * Returns visitor log data for visitors who participated in a funnel.
     * Filters visitors to only those who hit funnel steps.
     *
     * @param int $idSite
     * @param string $period
     * @param string $date
     * @param int $idFunnel
     * @param int|null $stepIndex If provided, filter to visitors who hit this specific step
     * @param int $limit
     * @param int $offset
     * @return array
     */
    public function getVisitorLog($idSite, $period, $date, $idFunnel, $stepIndex = null, $limit = 50, $offset = 0)
    {
        Piwik::checkUserHasViewAccess($idSite);

        $funnel = $this->getFunnel($idSite, $idFunnel);
        if (!$funnel) {
            throw new \Exception("Funnel not found.");
        }

        $steps = $funnel['steps'];
        $matcher = new \Piwik\Plugins\FunnelInsights\Model\StepMatcher();

        // Build SQL to find visits that match funnel patterns
        $logVisit = \Piwik\Common::prefixTable('log_visit');
        $logAction = \Piwik\Common::prefixTable('log_link_visit_action');
        $logActionTable = \Piwik\Common::prefixTable('log_action');

        // Get date range for period
        $periodObj = \Piwik\Period\Factory::build($period, $date);
        $startDate = $periodObj->getDateStart()->toString('Y-m-d');
        $endDate = $periodObj->getDateEnd()->toString('Y-m-d 23:59:59');

        // Get visits in the period
        $sql = "SELECT DISTINCT v.idvisit, v.idvisitor, v.visit_first_action_time,
                       v.visit_last_action_time, v.referer_url, v.referer_name,
                       v.visit_total_actions, v.visit_total_time
                FROM $logVisit v
                INNER JOIN $logAction la ON la.idvisit = v.idvisit
                WHERE v.idsite = ?
                  AND v.visit_first_action_time >= ?
                  AND v.visit_first_action_time <= ?
                ORDER BY v.visit_first_action_time DESC
                LIMIT ? OFFSET ?";

        $visits = \Piwik\Db::get()->fetchAll($sql, array($idSite, $startDate, $endDate, $limit, $offset));

        $result = array();
        foreach ($visits as $visit) {
            // Get actions for this visit
            $actionSql = "SELECT la.server_time, a.name as url,
                                 COALESCE(t.name, '') as page_title
                          FROM $logAction la
                          LEFT JOIN $logActionTable a ON la.idaction_url = a.idaction
                          LEFT JOIN $logActionTable t ON la.idaction_name = t.idaction
                          WHERE la.idvisit = ?
                          ORDER BY la.server_time ASC";

            $actions = \Piwik\Db::get()->fetchAll($actionSql, array($visit['idvisit']));

            // Check which steps were hit
            $stepsHit = array();
            foreach ($actions as $action) {
                $hit = array(
                    'url' => $action['url'] ?: '',
                    'pageTitle' => $action['page_title'] ?: '',
                    'eventCategory' => '',
                    'eventAction' => '',
                    'eventName' => '',
                    'search_term' => ''
                );

                foreach ($steps as $idx => $step) {
                    if (!isset($stepsHit[$idx]) && $matcher->match($step, $hit)) {
                        $stepsHit[$idx] = array(
                            'step_index' => $idx,
                            'step_name' => $step['name'],
                            'timestamp' => $action['server_time'],
                            'url' => $action['url']
                        );
                    }
                }
            }

            // Filter by step if requested
            if ($stepIndex !== null && !isset($stepsHit[$stepIndex])) {
                continue;
            }

            // Only include visits that hit at least one step
            if (empty($stepsHit)) {
                continue;
            }

            ksort($stepsHit);
            $entry = min(array_keys($stepsHit));
            $exit = max(array_keys($stepsHit));
            $completed = count($stepsHit);

            $result[] = array(
                'idvisit' => $visit['idvisit'],
                'idvisitor' => bin2hex($visit['idvisitor']),
                'visit_time' => $visit['visit_first_action_time'],
                'visit_duration' => $visit['visit_total_time'],
                'total_actions' => $visit['visit_total_actions'],
                'referer_url' => $visit['referer_url'],
                'referer_name' => $visit['referer_name'],
                'steps_hit' => array_values($stepsHit),
                'entry_step' => $entry,
                'exit_step' => $exit,
                'steps_completed' => $completed,
                'total_steps' => count($steps),
                'converted' => $exit === count($steps) - 1
            );
        }

        return array(
            'visitors' => $result,
            'total' => count($result),
            'funnel_name' => $funnel['name'],
            'funnel_steps' => array_map(function($s) { return $s['name']; }, $steps)
        );
    }
}