<?php

namespace Piwik\Plugins\FunnelInsights;

use Piwik\Menu\MenuAdmin;
use Piwik\Piwik;

/**
 * FunnelInsights Menu configuration.
 *
 * In Matomo 5+, reports appear in the sidebar automatically based on:
 * - Reports with categoryId and subcategoryId
 * - Widgets that define category and subcategory
 *
 * The FunnelOverview widget creates the "Funnels" category in the reporting UI.
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
