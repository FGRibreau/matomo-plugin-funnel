<?php

namespace Piwik\Plugins\FunnelInsights;

use Piwik\Menu\MenuAdmin;
use Piwik\Piwik;

/**
 * FunnelInsights Menu configuration.
 * Note: configureReportingMenu was removed in Matomo 3+ - use widgets instead.
 */
class Menu extends \Piwik\Plugin\Menu
{
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
