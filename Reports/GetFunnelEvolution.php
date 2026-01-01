<?php

namespace Piwik\Plugins\Funnels\Reports;

use Piwik\Plugin\Report;
use Piwik\View;

class GetFunnelEvolution extends Report
{
    protected function init()
    {
        $this->category = 'Funnels';
        $this->name = 'Funnel Evolution';
        $this->action = 'getFunnelEvolution';
    }
}
