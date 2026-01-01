<?php

namespace Piwik\Plugins\Funnels\Reports;

use Piwik\Plugin\Report;
use Piwik\View;

class GetOverview extends Report
{
    protected function init()
    {
        $this->category = 'Funnels';
        $this->name = 'Funnels Overview';
        $this->action = 'getOverview'; // Maps to API::getOverview
        $this->order = 1; // Show first
    }

    public function configureView(View $view)
    {
        $view->config->show_all_views_icons = false;
        $view->config->title = 'Funnels Overview';
        $view->config->show_exclude_low_population = false;
        // Standard table view is fine for the summary list
    }
}
