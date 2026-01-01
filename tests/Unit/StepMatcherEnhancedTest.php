<?php

namespace Piwik\Plugins\FunnelInsights\tests\Unit;

require_once __DIR__ . '/../stubs.php';

use Piwik\Plugins\FunnelInsights\Model\StepMatcher;
use PHPUnit\Framework\TestCase;

class StepMatcherEnhancedTest extends TestCase
{
    private $matcher;

    protected function setUp(): void
    {
        $this->matcher = new StepMatcher();
    }

    public function testNegationOperators()
    {
        // Not Equals
        $step = ['comparison' => 'url', 'operator' => 'not_equals', 'pattern' => '/home'];
        $this->assertTrue($this->matcher->match($step, ['url' => '/dashboard']));
        $this->assertFalse($this->matcher->match($step, ['url' => '/home']));

        // Not Contains
        $step = ['comparison' => 'url', 'operator' => 'not_contains', 'pattern' => 'checkout'];
        $this->assertTrue($this->matcher->match($step, ['url' => '/product/1']));
        $this->assertFalse($this->matcher->match($step, ['url' => '/checkout/payment']));

        // Not Starts With
        $step = ['comparison' => 'url', 'operator' => 'not_starts_with', 'pattern' => '/admin'];
        $this->assertTrue($this->matcher->match($step, ['url' => '/user/profile']));
        $this->assertFalse($this->matcher->match($step, ['url' => '/admin/settings']));
    }

    public function testCaseSensitivity()
    {
        // Default (Insensitive)
        $step = ['comparison' => 'url', 'operator' => 'contains', 'pattern' => 'CHECKOUT'];
        $this->assertTrue($this->matcher->match($step, ['url' => '/checkout/payment']));

        // Explicit Sensitive
        $step = ['comparison' => 'url', 'operator' => 'contains', 'pattern' => 'CHECKOUT', 'case_sensitive' => true];
        $this->assertFalse($this->matcher->match($step, ['url' => '/checkout/payment']));
        $this->assertTrue($this->matcher->match($step, ['url' => '/CHECKOUT/payment']));
    }

    public function testSafeRegex()
    {
        // Valid Regex
        $step = ['comparison' => 'url', 'operator' => 'regex', 'pattern' => '/^\/prod/'];
        $this->assertTrue($this->matcher->match($step, ['url' => '/prod/123']));
        
        // Invalid Regex (Should not crash)
        $step = ['comparison' => 'url', 'operator' => 'regex', 'pattern' => '/[unclosed-bracket'];
        // Should return false, not throw exception/error
        $this->assertFalse($this->matcher->match($step, ['url' => '/any']));
    }

    public function testOrLogicGrouping()
    {
        // Group: URL contains 'cart' OR 'basket'
        $step = [
            'conditions' => [
                ['comparison' => 'url', 'operator' => 'contains', 'pattern' => 'cart'],
                ['comparison' => 'url', 'operator' => 'contains', 'pattern' => 'basket']
            ]
        ];

        $this->assertTrue($this->matcher->match($step, ['url' => '/view/cart']));
        $this->assertTrue($this->matcher->match($step, ['url' => '/my/basket']));
        $this->assertFalse($this->matcher->match($step, ['url' => '/product/detail']));
    }

    public function testIgnoreQueryParams()
    {
        // With Ignore Query Params
        $step = [
            'comparison' => 'url', 
            'operator' => 'equals', 
            'pattern' => 'http://example.com/page',
            'ignore_query_params' => true
        ];
        
        // Should match even with params
        $this->assertTrue($this->matcher->match($step, ['url' => 'http://example.com/page?ref=google&id=123']));
        // Should match exact
        $this->assertTrue($this->matcher->match($step, ['url' => 'http://example.com/page']));
        
        // Without Ignore (Default)
        $stepDefault = [
            'comparison' => 'url', 
            'operator' => 'equals', 
            'pattern' => 'http://example.com/page'
        ];
        
        // Should fail because params exist and we are checking exact equals on full URL
        $this->assertFalse($this->matcher->match($stepDefault, ['url' => 'http://example.com/page?ref=google']));
    }
}