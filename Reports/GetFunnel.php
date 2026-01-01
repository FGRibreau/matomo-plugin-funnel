<?php

namespace Piwik\Plugins\FunnelInsights\Reports;

use Piwik\Plugin\Report;
use Piwik\Plugin\ViewDataTable;

class GetFunnel extends Report
{
    protected function init()
    {
        $this->categoryId = 'FunnelInsights';
        $this->name = 'Funnel Overview';
        $this->action = 'getFunnelReport';
    }

    public function configureView(ViewDataTable $view)
    {
        $view->config->show_all_views_icons = false;
        $view->config->title = 'Funnel Overview';
        $view->config->show_exclude_low_population = false;
    }
}
