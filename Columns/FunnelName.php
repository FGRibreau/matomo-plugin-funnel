<?php

namespace Piwik\Plugins\FunnelInsights\Columns;

use Piwik\Columns\Dimension;
use Piwik\Piwik;

/**
 * Dimension for Funnel Name, used in reports to enable Row Evolution.
 */
class FunnelName extends Dimension
{
    protected $columnName = 'label';
    protected $segmentName = 'funnelName';
    protected $type = self::TYPE_TEXT;
    protected $nameSingular = 'FunnelInsights_FunnelName';
    protected $namePlural = 'FunnelInsights_FunnelNames';
    protected $category = 'FunnelInsights_Funnels';

    public function getName()
    {
        return Piwik::translate('FunnelInsights_FunnelName');
    }
}
