<?php

namespace Piwik\Plugins\FunnelInsights\Reports;

use Piwik\Common;
use Piwik\Piwik;
use Piwik\Plugin\Report;

class GetFunnelEvolution extends Report
{
    protected function init()
    {
        $this->categoryId = 'FunnelInsights_Funnels';
        $this->subcategoryId = 'FunnelInsights_FunnelDetails';
        $this->name = Piwik::translate('FunnelInsights_Evolution');
        $this->action = 'getFunnelEvolution';
        $this->order = 2;
    }

    public function isEnabled()
    {
        $idFunnel = Common::getRequestVar('idFunnel', 0, 'int');
        return $idFunnel > 0;
    }
}
