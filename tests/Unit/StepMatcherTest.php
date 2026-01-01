<?php

namespace Piwik\Plugins\FunnelInsights\tests\Unit;

use Piwik\Plugins\FunnelInsights\Model\StepMatcher;
use PHPUnit\Framework\TestCase;

class StepMatcherTest extends TestCase
{
    public function testUrlEquals()
    {
        $matcher = new StepMatcher();
        $step = ['comparison' => 'url', 'operator' => 'equals', 'pattern' => 'http://example.com/foo'];
        
        $this->assertTrue($matcher->match($step, ['url' => 'http://example.com/foo']));
        $this->assertFalse($matcher->match($step, ['url' => 'http://example.com/bar']));
    }

    public function testUrlContains()
    {
        $matcher = new StepMatcher();
        $step = ['comparison' => 'url', 'operator' => 'contains', 'pattern' => 'foo'];
        
        $this->assertTrue($matcher->match($step, ['url' => 'http://example.com/foo/bar']));
        $this->assertFalse($matcher->match($step, ['url' => 'http://example.com/baz']));
    }

    public function testPath()
    {
        $matcher = new StepMatcher();
        $step = ['comparison' => 'path', 'operator' => 'equals', 'pattern' => '/foo'];
        
        $this->assertTrue($matcher->match($step, ['url' => 'http://example.com/foo?query=1']));
        $this->assertFalse($matcher->match($step, ['url' => 'http://example.com/bar']));
    }

    public function testRegex()
    {
        $matcher = new StepMatcher();
        $step = ['comparison' => 'url', 'operator' => 'regex', 'pattern' => '/\/foo\/[0-9]+/'];
        
        $this->assertTrue($matcher->match($step, ['url' => 'http://example.com/foo/123']));
        $this->assertFalse($matcher->match($step, ['url' => 'http://example.com/foo/bar']));
    }
    
    public function testPageTitle()
    {
        $matcher = new StepMatcher();
        $step = ['comparison' => 'title', 'operator' => 'contains', 'pattern' => 'Checkout'];
        
        $this->assertTrue($matcher->match($step, ['pageTitle' => 'Checkout - My Shop']));
        $this->assertFalse($matcher->match($step, ['pageTitle' => 'Home']));
    }

    public function testEvents()
    {
        $matcher = new StepMatcher();
        $step = ['comparison' => 'event_action', 'operator' => 'equals', 'pattern' => 'Click'];
        
        $this->assertTrue($matcher->match($step, ['eventAction' => 'Click']));
        $this->assertFalse($matcher->match($step, ['eventAction' => 'View']));
    }

    public function testSearchQuery()
    {
        $matcher = new StepMatcher();
        $step = ['comparison' => 'search_query', 'operator' => 'contains', 'pattern' => 'shoes'];
        
        // StepMatcher implementation expected 'search_term' key in hit
        $this->assertTrue($matcher->match($step, ['search_term' => 'red shoes']));
        $this->assertFalse($matcher->match($step, ['search_term' => 'blue jeans']));
    }
}