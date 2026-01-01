<?php

namespace Piwik\Plugins\Funnels\Reports;

use Piwik\Plugin\Report;
use Piwik\View;

class GetFunnel extends Report
{
    protected function init()
    {
        $this->category = 'Funnels';
        $this->name = 'Funnel Overview';
        $this->action = 'getFunnelReport'; // Maps to API::getFunnelReport
    }

    public function configureView(View $view)
    {
        $view->config->show_all_views_icons = false;
        $view->config->title = 'Funnel Overview';
        $view->config->show_exclude_low_population = false;
        
        // Custom template for the report
        $view->template = '@Funnels/report.twig';
    }
}