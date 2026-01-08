<?php

namespace Piwik\Plugins\FunnelInsights\Widgets;

use Piwik\Common;
use Piwik\Piwik;
use Piwik\Widget\Widget;
use Piwik\Widget\WidgetConfig;
use Piwik\Plugins\FunnelInsights\API;

/**
 * Widget to display the Funnel Overview report.
 * This makes the report accessible from the Matomo reporting UI and dashboards.
 *
 * Data is fetched server-side to ensure proper authentication through proxy setups.
 */
class FunnelOverview extends Widget
{
    public static function configure(WidgetConfig $config)
    {
        $config->setCategoryId('FunnelInsights_Funnels');
        $config->setSubcategoryId('FunnelInsights_Overview');
        $config->setName('FunnelInsights_Overview');
        $config->setOrder(1);
        $config->setIsEnabled(true);
    }

    public function render()
    {
        $idSite = Common::getRequestVar('idSite', 0, 'int');
        $period = Common::getRequestVar('period', 'day', 'string');
        $date = Common::getRequestVar('date', 'yesterday', 'string');

        // Check view access (will throw if no access)
        Piwik::checkUserHasViewAccess($idSite);

        // Fetch data server-side - this ensures authentication is handled correctly
        $overviewData = [];
        $error = null;

        $api = API::getInstance();
        $result = $api->getOverview($idSite, $period, $date);

        // Convert DataTable result to array for template
        if ($result instanceof \Piwik\DataTable) {
            foreach ($result->getRows() as $row) {
                $overviewData[] = $row->getColumns();
            }
        } elseif ($result instanceof \Piwik\DataTable\Map) {
            // For date ranges, get the last table
            $tables = $result->getDataTables();
            if (!empty($tables)) {
                $lastTable = end($tables);
                if ($lastTable instanceof \Piwik\DataTable) {
                    foreach ($lastTable->getRows() as $row) {
                        $overviewData[] = $row->getColumns();
                    }
                }
            }
        }

        return $this->renderTemplate('@FunnelInsights/widgetOverview', [
            'overviewData' => $overviewData,
            'idSite' => $idSite,
            'period' => $period,
            'date' => $date,
        ]);
    }
}
