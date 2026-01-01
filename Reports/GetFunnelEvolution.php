<?php

namespace Piwik\Plugins\FunnelInsights\Reports;

use Piwik\Plugin\Report;

class GetFunnelEvolution extends Report
{
    protected function init()
    {
        $this->categoryId = 'FunnelInsights';
        $this->name = 'Funnel Evolution';
        $this->action = 'getFunnelEvolution';
    }
}
