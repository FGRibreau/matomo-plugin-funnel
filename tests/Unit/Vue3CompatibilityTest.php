<?php

namespace Piwik\Plugins\FunnelInsights\tests\Unit;

use PHPUnit\Framework\TestCase;

/**
 * Non-regression test for Vue 3 compatibility.
 *
 * Matomo 5+ uses Vue 3 which has breaking API changes from Vue 2:
 * - Vue.component() -> defineComponent() or inline components
 * - new Vue({ el }) -> createApp().mount()
 * - this.$set() -> direct array manipulation
 *
 * This test ensures the JavaScript code remains compatible with Vue 3.
 */
class Vue3CompatibilityTest extends TestCase
{
    private string $jsContent;
    private string $jsFilePath;

    protected function setUp(): void
    {
        $this->jsFilePath = __DIR__ . '/../../javascripts/funnelEditor.js';

        if (!file_exists($this->jsFilePath)) {
            $this->fail("JavaScript file not found: {$this->jsFilePath}");
        }

        $this->jsContent = file_get_contents($this->jsFilePath);
    }

    /**
     * Vue.component() is Vue 2 API and does not exist in Vue 3.
     * In Vue 3, components are registered via createApp().component() or inline.
     */
    public function testDoesNotUseVue2ComponentRegistration(): void
    {
        $this->assertStringNotContainsString(
            'Vue.component(',
            $this->jsContent,
            'funnelEditor.js must not use Vue.component() - this is Vue 2 API that does not exist in Vue 3'
        );
    }

    /**
     * new Vue({ el: ... }) is Vue 2 API.
     * In Vue 3, use createApp().mount() instead.
     */
    public function testDoesNotUseVue2Constructor(): void
    {
        $this->assertDoesNotMatchRegularExpression(
            '/new\s+Vue\s*\(/i',
            $this->jsContent,
            'funnelEditor.js must not use new Vue() - this is Vue 2 API. Use createApp().mount() instead'
        );
    }

    /**
     * this.$set() is Vue 2 API for reactive array/object updates.
     * In Vue 3, direct array manipulation (push, splice) triggers reactivity.
     */
    public function testDoesNotUseVue2SetMethod(): void
    {
        $this->assertStringNotContainsString(
            'this.$set(',
            $this->jsContent,
            'funnelEditor.js must not use this.$set() - this is Vue 2 API. Use array methods like splice() in Vue 3'
        );

        $this->assertStringNotContainsString(
            '$set(',
            $this->jsContent,
            'funnelEditor.js must not use $set() - this is Vue 2 API'
        );
    }

    /**
     * Vue 3 requires createApp() for application instantiation.
     */
    public function testUsesVue3CreateApp(): void
    {
        $this->assertStringContainsString(
            'createApp(',
            $this->jsContent,
            'funnelEditor.js must use Vue 3 createApp() for application instantiation'
        );
    }

    /**
     * Vue 3 uses app.mount() instead of the el option.
     */
    public function testUsesVue3MountMethod(): void
    {
        $this->assertStringContainsString(
            '.mount(',
            $this->jsContent,
            'funnelEditor.js must use Vue 3 .mount() method for mounting the application'
        );
    }

    /**
     * Verify Vue 3 availability check is present.
     * The code should check for Vue.createApp existence before using it.
     */
    public function testChecksVue3Availability(): void
    {
        $this->assertMatchesRegularExpression(
            '/Vue\s*===\s*[\'"]undefined[\'"]|typeof\s+.*Vue.*===\s*[\'"]undefined[\'"]|!.*Vue\.createApp/',
            $this->jsContent,
            'funnelEditor.js should check for Vue 3 availability before using it'
        );
    }

    /**
     * Ensure the file is self-contained in an IIFE to avoid polluting global scope.
     */
    public function testUsesIIFEPattern(): void
    {
        $this->assertMatchesRegularExpression(
            '/^\s*\(function\s*\(\)\s*\{/m',
            $this->jsContent,
            'funnelEditor.js should use IIFE pattern for encapsulation'
        );
    }

    /**
     * Ensure strict mode is enabled for better error catching.
     */
    public function testUsesStrictMode(): void
    {
        $this->assertStringContainsString(
            "'use strict'",
            $this->jsContent,
            'funnelEditor.js should use strict mode'
        );
    }
}
