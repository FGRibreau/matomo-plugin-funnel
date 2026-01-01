<?php

namespace Piwik\Plugins\Funnels\Reports;

use Piwik\Plugin\Report;
use Piwik\Plugin\ViewDataTable;

class GetOverview extends Report
{
    protected function init()
    {
        $this->category = 'Funnels';
        $this->name = 'Funnels Overview';
        $this->action = 'getOverview';
        $this->order = 1;
    }

    public function configureView(ViewDataTable $view)
    {
        $view->config->show_all_views_icons = false;
        $view->config->title = 'Funnels Overview';
        $view->config->show_exclude_low_population = false;
    }
}
