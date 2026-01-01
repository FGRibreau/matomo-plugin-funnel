<?php

namespace Piwik\Plugins\FunnelInsights;

use Piwik\Menu\MenuAdmin;
use Piwik\Menu\MenuReporting;
use Piwik\Piwik;

class Menu extends \Piwik\Plugin\Menu
{
    public function configureReportingMenu(MenuReporting $menu)
    {
        $menu->addItem(
            'FunnelInsights_Funnels',
            'FunnelInsights_Overview',
            $this->urlForAction('index'),
            $order = 30
        );
    }

    public function configureAdminMenu(MenuAdmin $menu)
    {
        if (Piwik::isUserHasSomeAdminAccess()) {
            $menu->addMeasurableItem(
                'FunnelInsights_ManageFunnels',
                $this->urlForAction('manage'),
                $order = 30
            );
        }
    }
}
