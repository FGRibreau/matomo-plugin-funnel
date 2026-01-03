<?php

namespace Piwik\Plugins\FunnelInsights\Reports;

use Piwik\Piwik;
use Piwik\Plugin\Report;
use Piwik\Plugin\ViewDataTable;
use Piwik\Plugins\FunnelInsights\Columns\FunnelName;

class GetOverview extends Report
{
    protected function init()
    {
        $this->categoryId = 'FunnelInsights_Funnels';
        $this->subcategoryId = 'FunnelInsights_Overview';
        $this->name = Piwik::translate('FunnelInsights_Overview');
        $this->action = 'getOverview';
        $this->order = 1;
        $this->dimension = new FunnelName();
    }

    public function configureView(ViewDataTable $view)
    {
        $view->config->show_all_views_icons = false;
        $view->config->title = Piwik::translate('FunnelInsights_Overview');
        $view->config->show_exclude_low_population = false;
    }
}
