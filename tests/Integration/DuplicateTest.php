<?php

namespace Piwik\Plugins\FunnelInsights\tests\Integration;

use Piwik\Plugins\FunnelInsights\API;
use Piwik\Tests\Framework\TestCase\IntegrationTestCase;

class DuplicateFunnelTest extends IntegrationTestCase
{
    public function testDuplicate()
    {
        $idSite = 1;
        $name = 'Original Funnel';
        $steps = [['name' => 'Step1', 'comparison' => 'url', 'pattern' => 'foo']];
        
        $api = API::getInstance();
        
        // Create Original
        $idOriginal = $api->createFunnel($idSite, $name, $steps, null, 1);
        
        // Duplicate
        $idCopy = $api->duplicateFunnel($idSite, $idOriginal);
        
        $this->assertNotEquals($idOriginal, $idCopy);
        
        $copy = $api->getFunnel($idSite, $idCopy);
        
        $this->assertEquals($name . ' (Copy)', $copy['name']);
        $this->assertEquals(0, $copy['active']); // Should be inactive
        $this->assertEquals($steps, $copy['steps']);
    }
}

