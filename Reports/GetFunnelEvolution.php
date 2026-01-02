<?php

namespace Piwik\Plugins\FunnelInsights\Reports;

use Piwik\Piwik;
use Piwik\Plugin\Report;

class GetFunnelEvolution extends Report
{
    protected function init()
    {
        $this->categoryId = 'FunnelInsights_Funnels';
        $this->subcategoryId = 'FunnelInsights_Overview';
        $this->name = Piwik::translate('FunnelInsights_Evolution');
        $this->action = 'getFunnelEvolution';
        $this->order = 3;
    }
}
