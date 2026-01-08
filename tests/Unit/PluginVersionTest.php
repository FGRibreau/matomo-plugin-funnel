<?php

namespace Piwik\Plugins\FunnelInsights\tests\Unit;

use PHPUnit\Framework\TestCase;

class PluginVersionTest extends TestCase
{
    private array $pluginJson;

    protected function setUp(): void
    {
        $pluginJsonPath = __DIR__ . '/../../plugin.json';
        $this->pluginJson = json_decode(file_get_contents($pluginJsonPath), true);
    }

    public function testPluginVersion()
    {
        $this->assertMatchesRegularExpression('/^3\.\d+\.\d+$/', $this->pluginJson['version'], 'Plugin version should follow semver 3.x.x');
    }

    public function testRequiresMatomoVersion5()
    {
        $matomoRequirement = $this->pluginJson['require']['matomo'];
        $this->assertStringContainsString('>=5.0.0', $matomoRequirement, 'Plugin should require Matomo 5.0.0 or higher');
    }

    public function testRequiresPhp74OrHigher()
    {
        $phpRequirement = $this->pluginJson['require']['php'];
        $this->assertEquals('>=7.4.0', $phpRequirement, 'Plugin should require PHP 7.4.0 or higher');
    }

    public function testPluginName()
    {
        $this->assertEquals('FunnelInsights', $this->pluginJson['name'], 'Plugin name should be FunnelInsights');
    }

    public function testPluginLicense()
    {
        $this->assertEquals('GPL-3.0+', $this->pluginJson['license'], 'Plugin license should be GPL-3.0+');
    }
}
