<?php

namespace Piwik\Plugins\FunnelInsights\Widgets;

use Piwik\Widget\Widget;
use Piwik\Widget\WidgetConfig;

/**
 * Widget to display the Funnel Overview report.
 * This makes the report accessible from the Matomo reporting UI and dashboards.
 */
class FunnelOverview extends Widget
{
    public static function configure(WidgetConfig $config)
    {
        $config->setCategoryId('FunnelInsights_Funnels');
        $config->setSubcategoryId('FunnelInsights_Overview');
        $config->setName('FunnelInsights_Overview');
        $config->setOrder(1);
        $config->setIsEnabled(true);
    }

    public function render()
    {
        return $this->renderTemplate('@FunnelInsights/widgetOverview');
    }
}
