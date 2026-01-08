<?php

namespace Piwik\Plugins\FunnelInsights\tests\Integration;

use PHPUnit\Framework\TestCase;

/**
 * HTTP-based integration tests for FunnelInsights API.
 * These tests run against a live Matomo instance (Docker-based).
 *
 * Run with: MATOMO_URL=http://localhost:8080 MATOMO_TOKEN=xxx vendor/bin/phpunit tests/Integration/FunnelApiHttpTest.php
 */
class FunnelApiHttpTest extends TestCase
{
    private string $baseUrl;
    private string $tokenAuth;
    private int $idSite = 1;

    protected function setUp(): void
    {
        $this->baseUrl = getenv('MATOMO_URL') ?: 'http://localhost:8080';
        $this->tokenAuth = getenv('MATOMO_TOKEN') ?: '';

        // Check if Matomo is reachable
        $context = stream_context_create(['http' => ['timeout' => 5]]);
        $headers = @get_headers($this->baseUrl, false, $context);
        if (!$headers || strpos($headers[0], '200') === false) {
            $this->markTestSkipped('Matomo not reachable at ' . $this->baseUrl . '. Start with: ./scripts/run-e2e-tests.sh');
        }

        if (empty($this->tokenAuth)) {
            $this->markTestSkipped('MATOMO_TOKEN environment variable not set. Get token from Matomo admin settings.');
        }
    }

    private function callApi(string $method, array $params = []): array
    {
        $defaultParams = [
            'module' => 'API',
            'format' => 'JSON',
            'token_auth' => $this->tokenAuth,
        ];

        $params = array_merge($defaultParams, $params);
        $params['method'] = $method;

        $url = $this->baseUrl . '/index.php?' . http_build_query($params);

        $context = stream_context_create([
            'http' => [
                'timeout' => 30,
                'ignore_errors' => true,
            ]
        ]);

        $response = @file_get_contents($url, false, $context);
        $this->assertNotFalse($response, "API call to $method failed");

        $data = json_decode($response, true);
        $this->assertNotNull($data, "Invalid JSON response from $method: " . substr($response, 0, 500));

        return $data;
    }

    public function testGetFunnelsReturnsArray(): void
    {
        $result = $this->callApi('FunnelInsights.getFunnels', [
            'idSite' => $this->idSite,
        ]);

        // Should return an array (possibly empty)
        $this->assertIsArray($result);
    }

    public function testCreateAndGetFunnel(): void
    {
        $funnelName = 'Integration Test Funnel ' . time();
        $steps = json_encode([
            ['name' => 'Step 1', 'conditions' => [['attribute' => 'url', 'comparator' => 'contains', 'value' => '/step1']]],
            ['name' => 'Step 2', 'conditions' => [['attribute' => 'url', 'comparator' => 'contains', 'value' => '/step2']]],
        ]);

        // Create funnel
        $createResult = $this->callApi('FunnelInsights.createFunnel', [
            'idSite' => $this->idSite,
            'name' => $funnelName,
            'steps' => $steps,
            'active' => 1,
        ]);

        // Should return funnel ID
        $this->assertIsInt($createResult, 'createFunnel should return funnel ID');
        $idFunnel = $createResult;

        // Get the funnel
        $funnel = $this->callApi('FunnelInsights.getFunnel', [
            'idSite' => $this->idSite,
            'idFunnel' => $idFunnel,
        ]);

        $this->assertIsArray($funnel);
        $this->assertEquals($funnelName, $funnel['name']);
        $this->assertEquals(1, $funnel['active']);
        $this->assertCount(2, $funnel['steps']);

        // Cleanup: delete the funnel
        $deleteResult = $this->callApi('FunnelInsights.deleteFunnel', [
            'idSite' => $this->idSite,
            'idFunnel' => $idFunnel,
        ]);

        $this->assertTrue($deleteResult);
    }

    public function testGetFunnelReportWithDateRange(): void
    {
        // Create a test funnel
        $funnelName = 'Report Test Funnel ' . time();
        $steps = json_encode([
            ['name' => 'Landing', 'conditions' => [['attribute' => 'url', 'comparator' => 'contains', 'value' => '/']]],
        ]);

        $idFunnel = $this->callApi('FunnelInsights.createFunnel', [
            'idSite' => $this->idSite,
            'name' => $funnelName,
            'steps' => $steps,
            'active' => 1,
        ]);

        $this->assertIsInt($idFunnel);

        // Test getFunnelReport - this was causing the DataTable\Map error
        $report = $this->callApi('FunnelInsights.getFunnelReport', [
            'idSite' => $this->idSite,
            'period' => 'day',
            'date' => 'yesterday',
            'idFunnel' => $idFunnel,
        ]);

        // Should return array (even if empty)
        $this->assertIsArray($report);

        // Test with date range (this triggers DataTable\Map)
        $reportRange = $this->callApi('FunnelInsights.getFunnelReport', [
            'idSite' => $this->idSite,
            'period' => 'day',
            'date' => 'last7',
            'idFunnel' => $idFunnel,
        ]);

        $this->assertIsArray($reportRange);

        // Cleanup
        $this->callApi('FunnelInsights.deleteFunnel', [
            'idSite' => $this->idSite,
            'idFunnel' => $idFunnel,
        ]);
    }

    public function testGetOverviewWithDateRange(): void
    {
        // Test getOverview - this uses extractDataTable internally
        $overview = $this->callApi('FunnelInsights.getOverview', [
            'idSite' => $this->idSite,
            'period' => 'day',
            'date' => 'yesterday',
        ]);

        // Should return a DataTable (array of rows)
        $this->assertIsArray($overview);

        // Test with date range
        $overviewRange = $this->callApi('FunnelInsights.getOverview', [
            'idSite' => $this->idSite,
            'period' => 'day',
            'date' => 'last7',
        ]);

        $this->assertIsArray($overviewRange);
    }

    public function testUpdateFunnel(): void
    {
        // Create funnel
        $originalName = 'Update Test ' . time();
        $steps = json_encode([
            ['name' => 'Original', 'conditions' => [['attribute' => 'url', 'comparator' => 'contains', 'value' => '/orig']]],
        ]);

        $idFunnel = $this->callApi('FunnelInsights.createFunnel', [
            'idSite' => $this->idSite,
            'name' => $originalName,
            'steps' => $steps,
        ]);

        // Update funnel
        $updatedName = $originalName . ' Updated';
        $updatedSteps = json_encode([
            ['name' => 'Updated Step', 'conditions' => [['attribute' => 'url', 'comparator' => 'contains', 'value' => '/updated']]],
        ]);

        $updateResult = $this->callApi('FunnelInsights.updateFunnel', [
            'idFunnel' => $idFunnel,
            'idSite' => $this->idSite,
            'name' => $updatedName,
            'steps' => $updatedSteps,
            'active' => 1,
        ]);

        $this->assertTrue($updateResult);

        // Verify update
        $funnel = $this->callApi('FunnelInsights.getFunnel', [
            'idSite' => $this->idSite,
            'idFunnel' => $idFunnel,
        ]);

        $this->assertEquals($updatedName, $funnel['name']);

        // Cleanup
        $this->callApi('FunnelInsights.deleteFunnel', [
            'idSite' => $this->idSite,
            'idFunnel' => $idFunnel,
        ]);
    }

    public function testDuplicateFunnel(): void
    {
        // Create funnel
        $originalName = 'Duplicate Test ' . time();
        $steps = json_encode([
            ['name' => 'Dup Step', 'conditions' => [['attribute' => 'url', 'comparator' => 'contains', 'value' => '/dup']]],
        ]);

        $idFunnel = $this->callApi('FunnelInsights.createFunnel', [
            'idSite' => $this->idSite,
            'name' => $originalName,
            'steps' => $steps,
        ]);

        // Duplicate
        $newIdFunnel = $this->callApi('FunnelInsights.duplicateFunnel', [
            'idSite' => $this->idSite,
            'idFunnel' => $idFunnel,
        ]);

        $this->assertIsInt($newIdFunnel);
        $this->assertNotEquals($idFunnel, $newIdFunnel);

        // Verify duplicate
        $duplicate = $this->callApi('FunnelInsights.getFunnel', [
            'idSite' => $this->idSite,
            'idFunnel' => $newIdFunnel,
        ]);

        $this->assertEquals($originalName . ' (Copy)', $duplicate['name']);

        // Cleanup
        $this->callApi('FunnelInsights.deleteFunnel', ['idSite' => $this->idSite, 'idFunnel' => $idFunnel]);
        $this->callApi('FunnelInsights.deleteFunnel', ['idSite' => $this->idSite, 'idFunnel' => $newIdFunnel]);
    }

    public function testValidateFunnelSteps(): void
    {
        $steps = json_encode([
            ['name' => 'Checkout', 'conditions' => [['attribute' => 'url', 'comparator' => 'contains', 'value' => 'checkout']]],
        ]);

        $result = $this->callApi('FunnelInsights.validateFunnelSteps', [
            'idSite' => $this->idSite,
            'steps' => $steps,
            'testUrl' => 'https://example.com/checkout/step1',
        ]);

        $this->assertIsArray($result);
        $this->assertCount(1, $result);
        $this->assertTrue($result[0]['matched']);
    }
}
