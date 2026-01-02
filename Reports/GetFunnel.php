<?php

namespace Piwik\Plugins\FunnelInsights\Reports;

use Piwik\Piwik;
use Piwik\Plugin\Report;
use Piwik\Plugin\ViewDataTable;

class GetFunnel extends Report
{
    protected function init()
    {
        $this->categoryId = 'FunnelInsights_Funnels';
        $this->subcategoryId = 'FunnelInsights_Overview';
        $this->name = Piwik::translate('FunnelInsights_FunnelDetails');
        $this->action = 'getFunnelReport';
        $this->order = 2;
    }

    public function configureView(ViewDataTable $view)
    {
        $view->config->show_all_views_icons = false;
        $view->config->title = Piwik::translate('FunnelInsights_FunnelDetails');
        $view->config->show_exclude_low_population = false;
    }
}
