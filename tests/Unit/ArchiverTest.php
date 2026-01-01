<?php

namespace Piwik\Plugins\Funnels\tests\Unit;

require_once __DIR__ . '/../stubs.php';

use Piwik\Plugins\Funnels\Archiver;
use Piwik\Plugins\Funnels\Model\StepMatcher;
use PHPUnit\Framework\TestCase;

class ArchiverTest extends TestCase
{
    public function testCalculateFunnelMetrics()
    {
        $archiver = new Archiver(new \Piwik\Plugin\Processor(
             new \Piwik\Plugin\ArchiveProcessor\Params(
                 new \Piwik\Site(1),
                 new \Piwik\Period\Day(new \Piwik\Date('today'))
             )
        ));

        // Funnel Definition
        $funnel = [
            'steps' => [
                ['comparison' => 'url', 'operator' => 'contains', 'pattern' => 'step1'],
                ['comparison' => 'url', 'operator' => 'contains', 'pattern' => 'step2'],
                ['comparison' => 'url', 'operator' => 'contains', 'pattern' => 'step3']
            ]
        ];

        // Visits Data (Mocked from log_link_visit_action)
        $visits = [
            // Visit 1: Complete flow
            1 => [
                ['url' => 'http://site.com/home', 'server_time' => '10:00:00'],
                ['url' => 'http://site.com/step1', 'server_time' => '10:00:10'],
                ['url' => 'http://site.com/step2', 'server_time' => '10:00:20'],
                ['url' => 'http://site.com/step3', 'server_time' => '10:00:30'],
                ['url' => 'http://site.com/thanks', 'server_time' => '10:00:40']
            ],
            // Visit 2: Drop off after step 1
            2 => [
                ['url' => 'http://site.com/step1', 'server_time' => '10:00:00'],
                ['url' => 'http://site.com/other', 'server_time' => '10:00:10']
            ],
            // Visit 3: Skip step 2 (should not count as complete flow in strict mode)
            3 => [
                ['url' => 'http://site.com/step1', 'server_time' => '10:00:00'],
                ['url' => 'http://site.com/step3', 'server_time' => '10:00:10']
            ],
            // Visit 4: Entry at step 2 (should not count as Entry if strict? Spec says "Entry: Did a visit hit Step 1")
            4 => [
                ['url' => 'http://site.com/step2', 'server_time' => '10:00:00'],
                ['url' => 'http://site.com/step3', 'server_time' => '10:00:10']
            ],

            // Visit 5: Loopback behavior (Step 1 -> Step 2 -> Step 1 -> Step 2 -> Step 3)
            5 => [
                 ['url' => 'http://site.com/step1', 'server_time' => '10:00:00'],
                 ['url' => 'http://site.com/step2', 'server_time' => '10:00:10'],
                 ['url' => 'http://site.com/step1', 'server_time' => '10:00:20'],
                 ['url' => 'http://site.com/step2', 'server_time' => '10:00:30'],
                 ['url' => 'http://site.com/step3', 'server_time' => '10:00:40']
            ]
        ];

        $matcher = new StepMatcher();

        // Access private method
        $reflection = new \ReflectionClass(Archiver::class);
        $method = $reflection->getMethod('calculateFunnelMetrics');
        $method->setAccessible(true);
        $stats = $method->invokeArgs($archiver, [$funnel, $visits, $matcher]);

        // Assertions
        $this->assertEquals(4, $stats[0]['visits'], 'Step 1 Visits');
        $this->assertEquals(4, $stats[0]['entries'], 'Step 1 Entries');
        $this->assertEquals(3, $stats[0]['proceeded'], 'Step 1 Proceeded');
        $this->assertEquals(3, $stats[1]['visits'], 'Step 2 Visits');
        $this->assertEquals(4, $stats[2]['visits'], 'Step 3 Visits');
    }

    public function testRequiredSteps()
    {
        $archiver = new Archiver(new \Piwik\Plugin\Processor(
             new \Piwik\Plugin\ArchiveProcessor\Params(
                 new \Piwik\Site(1),
                 new \Piwik\Period\Day(new \Piwik\Date('today'))
             )
        ));

        // Funnel with Required Steps
        $funnel = [
            'steps' => [
                ['comparison' => 'url', 'operator' => 'contains', 'pattern' => 'step1', 'required' => true],
                ['comparison' => 'url', 'operator' => 'contains', 'pattern' => 'step2', 'required' => false],
                ['comparison' => 'url', 'operator' => 'contains', 'pattern' => 'step3', 'required' => true]
            ]
        ];

        $visits = [
            // Visit 1: 1 -> 2 -> 3 (Standard)
            1 => [
                ['url' => '/step1', 'server_time' => '10:00'], 
                ['url' => '/step2', 'server_time' => '10:01'], 
                ['url' => '/step3', 'server_time' => '10:02']
            ],
            // Visit 2: 1 -> 3 (Skip optional step 2)
            2 => [
                ['url' => '/step1', 'server_time' => '10:00'], 
                ['url' => '/step3', 'server_time' => '10:01']
            ],
            // Visit 3: 2 -> 3 (Start at middle - Should fail because Step 1 is required)
            3 => [
                ['url' => '/step2', 'server_time' => '10:00'], 
                ['url' => '/step3', 'server_time' => '10:01']
            ]
        ];

        $matcher = new StepMatcher();
        $reflection = new \ReflectionClass(Archiver::class);
        $method = $reflection->getMethod('calculateFunnelMetrics');
        $method->setAccessible(true);
        $stats = $method->invokeArgs($archiver, [$funnel, $visits, $matcher]);

        // Assertions
        $this->assertEquals(2, $stats[0]['visits'], 'Step 1 Visits');
        $this->assertEquals(1, $stats[1]['visits'], 'Step 2 Visits');
        $this->assertEquals(1, $stats[1]['skips'], 'Step 2 Skips');
        $this->assertEquals(2, $stats[2]['visits'], 'Step 3 Visits');
    }

    public function testEntryWithOptionalSteps()
    {
        $archiver = new Archiver(new \Piwik\Plugin\Processor(
             new \Piwik\Plugin\ArchiveProcessor\Params(
                 new \Piwik\Site(1),
                 new \Piwik\Period\Day(new \Piwik\Date('today'))
             )
        ));

        // Step 1: Optional
        // Step 2: Required
        // Step 3: Required
        $funnel = [
            'steps' => [
                ['comparison' => 'url', 'operator' => 'contains', 'pattern' => 'step1', 'required' => false],
                ['comparison' => 'url', 'operator' => 'contains', 'pattern' => 'step2', 'required' => true],
                ['comparison' => 'url', 'operator' => 'contains', 'pattern' => 'step3', 'required' => true]
            ]
        ];

        $visits = [
            // Visit 1: Step 1 -> Step 2 -> Step 3 (Standard Entry at 1)
            1 => [['url' => '/step1', 'server_time' => '10:00'], ['url' => '/step2', 'server_time' => '10:01'], ['url' => '/step3', 'server_time' => '10:02']],
            // Visit 2: Step 2 -> Step 3 (Entry at 2, skipping optional 1)
            2 => [['url' => '/step2', 'server_time' => '10:00'], ['url' => '/step3', 'server_time' => '10:01']],
            // Visit 3: Step 3 (Entry at 3? No, Step 2 was required. Cannot enter at 3 if 2 missed)
            3 => [['url' => '/step3', 'server_time' => '10:00']]
        ];

        $matcher = new StepMatcher();
        $reflection = new \ReflectionClass(Archiver::class);
        $method = $reflection->getMethod('calculateFunnelMetrics');
        $method->setAccessible(true);
        $stats = $method->invokeArgs($archiver, [$funnel, $visits, $matcher]);

        // Assertions
        $this->assertEquals(1, $stats[0]['visits'], 'Step 1 Visits');
        $this->assertEquals(1, $stats[0]['entries'], 'Step 1 Entries');
        $this->assertEquals(1, $stats[0]['skips'], 'Step 1 Skips (from Visit 2)');

        $this->assertEquals(2, $stats[1]['visits'], 'Step 2 Visits');
        $this->assertEquals(1, $stats[1]['entries'], 'Step 2 Entries (from Visit 2)');
        
        $this->assertEquals(2, $stats[2]['visits'], 'Step 3 Visits');
    }

    public function testStrictMode()
    {
        $archiver = new Archiver(new \Piwik\Plugin\Processor(
             new \Piwik\Plugin\ArchiveProcessor\Params(
                 new \Piwik\Site(1),
                 new \Piwik\Period\Day(new \Piwik\Date('today'))
             )
        ));

        $funnel = [
            'strict_mode' => true,
            'steps' => [
                ['comparison' => 'url', 'operator' => 'contains', 'pattern' => 'step1'],
                ['comparison' => 'url', 'operator' => 'contains', 'pattern' => 'step2']
            ]
        ];

        $visits = [
            // Valid strict flow
            1 => [
                ['url' => '/step1', 'server_time' => '2023-01-01 10:00:00'],
                ['url' => '/step2', 'server_time' => '2023-01-01 10:00:10']
            ],
            // Invalid flow: Deviation to /other
            2 => [
                ['url' => '/step1', 'server_time' => '2023-01-01 10:00:00'],
                ['url' => '/other', 'server_time' => '2023-01-01 10:00:05'],
                ['url' => '/step2', 'server_time' => '2023-01-01 10:00:10']
            ]
        ];

        $matcher = new StepMatcher();
        $reflection = new \ReflectionClass(Archiver::class);
        $method = $reflection->getMethod('calculateFunnelMetrics');
        $method->setAccessible(true);
        $stats = $method->invokeArgs($archiver, [$funnel, $visits, $matcher]);

        // Visit 1 (Valid) -> Proceeded: 1
        // Visit 2 (Invalid) -> Proceeded: 0
        $this->assertEquals(1, $stats[0]['proceeded'], 'Strict Mode: Only Visit 1 should proceed');
        
        // Step 2 Visits
        // Visit 1 enters Step 2.
        // Visit 2 does NOT enter Step 2 via flow.
        $this->assertEquals(1, $stats[1]['visits'], 'Strict Mode: Only Visit 1 enters Step 2');
    }

    public function testTimeLimit()
    {
        $archiver = new Archiver(new \Piwik\Plugin\Processor(
             new \Piwik\Plugin\ArchiveProcessor\Params(
                 new \Piwik\Site(1),
                 new \Piwik\Period\Day(new \Piwik\Date('today'))
             )
        ));

        $funnel = [
            'step_time_limit' => 60, // 60 seconds max
            'steps' => [
                ['comparison' => 'url', 'operator' => 'contains', 'pattern' => 'step1'],
                ['comparison' => 'url', 'operator' => 'contains', 'pattern' => 'step2']
            ]
        ];

        $visits = [
            // Valid time
            1 => [
                ['url' => '/step1', 'server_time' => '2023-01-01 10:00:00'],
                ['url' => '/step2', 'server_time' => '2023-01-01 10:00:30'] // +30s
            ],
            // Invalid time
            2 => [
                ['url' => '/step1', 'server_time' => '2023-01-01 10:00:00'],
                ['url' => '/step2', 'server_time' => '2023-01-01 10:02:00'] // +120s
            ]
        ];

        $matcher = new StepMatcher();
        $reflection = new \ReflectionClass(Archiver::class);
        $method = $reflection->getMethod('calculateFunnelMetrics');
        $method->setAccessible(true);
        $stats = $method->invokeArgs($archiver, [$funnel, $visits, $matcher]);

        $this->assertEquals(1, $stats[0]['proceeded'], 'Time Limit: Only Visit 1 should proceed');
        $this->assertEquals(30, $stats[0]['time_spent'], 'Time Limit: Time spent should be tracked');
    }

    public function testDropOffAnalysis()
    {
        $archiver = new Archiver(new \Piwik\Plugin\Processor(
             new \Piwik\Plugin\ArchiveProcessor\Params(
                 new \Piwik\Site(1),
                 new \Piwik\Period\Day(new \Piwik\Date('today'))
             )
        ));

        $funnel = [
            'steps' => [
                ['comparison' => 'url', 'operator' => 'contains', 'pattern' => 'step1'],
                ['comparison' => 'url', 'operator' => 'contains', 'pattern' => 'step2']
            ]
        ];

        $visits = [
            // Visit 1: Step 1 -> /cart (Drop off) -> ...
            1 => [
                ['url' => '/step1', 'server_time' => '10:00'],
                ['url' => '/cart', 'server_time' => '10:01']
            ]
        ];

        $matcher = new StepMatcher();
        $reflection = new \ReflectionClass(Archiver::class);
        $method = $reflection->getMethod('calculateFunnelMetrics');
        $method->setAccessible(true);
        $stats = $method->invokeArgs($archiver, [$funnel, $visits, $matcher]);

        $this->assertEquals(1, $stats[0]['exits'], 'Dropoff: Should exit at Step 1');
        $this->assertArrayHasKey('/cart', $stats[0]['dropoff_urls'], 'Dropoff: URL captured');
        $this->assertEquals(1, $stats[0]['dropoff_urls']['/cart'], 'Dropoff: Count correct');
    }
}
