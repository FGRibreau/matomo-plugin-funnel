<?php

namespace Piwik\Plugins\FunnelInsights\Categories;

use Piwik\Category\Category;

class FunnelsCategory extends Category
{
    protected $id = 'FunnelInsights_Funnels';
    protected $order = 25;
    protected $icon = 'icon-funnel';
}
