<?php

namespace Piwik\Plugins\Funnels\tests\Unit;

require_once __DIR__ . '/../stubs.php';

use Piwik\Plugins\Funnels\API;
use Piwik\Plugins\Funnels\DAO\FunnelConfig;
use PHPUnit\Framework\TestCase;

class DuplicateUnitTest extends TestCase
{
    public function testDuplicate()
    {
        // Mock DAO
        $daoMock = $this->createMock(FunnelConfig::class);
        
        $original = [
            'idfunnel' => 10,
            'name' => 'Original',
            'idsite' => 1,
            'steps' => ['s1'],
            'goal_id' => null,
            'active' => 1,
            'strict_mode' => 0,
            'step_time_limit' => 0
        ];
        
        $daoMock->method('get')
            ->with(10)
            ->willReturn($original);
            
        $daoMock->expects($this->once())
            ->method('create')
            ->with(
                1, 
                'Original (Copy)', 
                ['s1'], 
                null, 
                0, // Active = 0
                0, // Strict
                0  // Time Limit
            )
            ->willReturn(11);
            
        $api = new API($daoMock);
        
        // Mock Admin Access check (Static method needs special handling or ignore if stubbed globally)
        // Since stubs.php defines static Piwik methods but empty, it passes.
        
        $newId = $api->duplicateFunnel(1, 10);
        
        $this->assertEquals(11, $newId);
    }
}
