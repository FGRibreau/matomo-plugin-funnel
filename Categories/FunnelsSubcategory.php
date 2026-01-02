<?php

namespace Piwik\Plugins\FunnelInsights\Categories;

use Piwik\Category\Subcategory;

class FunnelsSubcategory extends Subcategory
{
    protected $id = 'FunnelInsights_Overview';
    protected $categoryId = 'FunnelInsights_Funnels';
    protected $order = 1;
}
