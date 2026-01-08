<?php

namespace Piwik\Plugins\FunnelInsights\tests\Integration;

use PHPUnit\Framework\TestCase;

/**
 * Integration tests for Funnels plugin with Matomo 5.x
 *
 * Requirements:
 * - Docker containers running (matomo:5-fpm-alpine, mariadb:10.6)
 * - Matomo 5.x installed and configured
 * - Plugin activated
 */
class EndToEndTest extends TestCase
{
    private string $baseUrl = 'http://localhost:8080';
    private int $idSite = 1;

    public function setUp(): void
    {
        // Wait for Matomo 5.x to be ready
        $maxRetries = 15;
        $connected = false;
        for ($i = 0; $i < $maxRetries; $i++) {
            $headers = @get_headers($this->baseUrl);
            if ($headers && strpos($headers[0], '200') !== false) {
                $connected = true;
                break;
            }
            sleep(2);
        }

        if (!$connected) {
            $this->markTestSkipped('Matomo 5.x not ready at ' . $this->baseUrl);
        }
    }

    public function testMatomoVersionIs5OrHigher(): void
    {
        $versionUrl = $this->baseUrl . "/index.php?module=API&method=API.getMatomoVersion&format=JSON";
        $response = @file_get_contents($versionUrl);

        if (!$response) {
            $this->markTestSkipped('Cannot retrieve Matomo version');
        }

        $result = json_decode($response, true);
        $version = $result['value'] ?? '0.0.0';

        $this->assertTrue(
            version_compare($version, '5.0.0', '>='),
            "Matomo version should be 5.0.0 or higher, got: $version"
        );
    }

    public function testFullFlow(): void
    {
        // 1. Login
        $token = $this->getToken();
        $this->assertNotEmpty($token, 'Could not get token auth');

        // 2. Create Funnel
        $steps = [
            ['name' => 'Step1', 'comparison' => 'url', 'operator' => 'contains', 'pattern' => 'step1'],
            ['name' => 'Step2', 'comparison' => 'url', 'operator' => 'contains', 'pattern' => 'step2']
        ];

        $createUrl = $this->baseUrl . "/index.php?module=API&method=Funnels.createFunnel&idSite=1&name=TestFunnel&active=1&goal_id=1&steps=" . urlencode(json_encode($steps)) . "&format=JSON&token_auth=" . $token;
        $response = file_get_contents($createUrl);
        $result = json_decode($response, true);

        $this->assertArrayHasKey('value', $result);
        $idFunnel = $result['value'];
        $this->assertGreaterThan(0, $idFunnel);

        // Verify Goal ID persistence
        $getFunnelUrl = $this->baseUrl . "/index.php?module=API&method=Funnels.getFunnel&idSite=1&idFunnel=" . $idFunnel . "&format=JSON&token_auth=" . $token;
        $funnelData = json_decode(file_get_contents($getFunnelUrl), true);
        $this->assertEquals(1, $funnelData['goal_id'], 'Goal ID not persisted');

        // 3. Track Visits
        // Visit 1: Step 1 -> Step 2 (Conversion)
        $this->trackVisit(['/step1', '/step2']);

        // Visit 2: Step 1 -> Exit (Dropoff)
        $this->trackVisit(['/step1', '/other']);

        // 4. Archive
        // Trigger archiving via API
        $archiveUrl = $this->baseUrl . "/index.php?module=API&method=CoreAdminHome.runScheduledTasks&format=JSON&token_auth=" . $token;
        file_get_contents($archiveUrl);

        // 5. Get Overview Report
        $overviewUrl = $this->baseUrl . "/index.php?module=API&method=Funnels.getOverview&idSite=1&period=day&date=today&format=JSON&token_auth=" . $token;
        $overviewResponse = file_get_contents($overviewUrl);
        $overview = json_decode($overviewResponse, true);

        $this->assertIsArray($overview);
        // We expect at least one row for our TestFunnel
        $found = false;
        foreach ($overview as $row) {
            if ($row['label'] === 'TestFunnel') {
                $found = true;
                // Entries: Visit 1 + Visit 2 = 2
                $this->assertEquals(2, $row['entries']);
                // Conversions: Visit 1 = 1
                $this->assertEquals(1, $row['conversions']);
                $this->assertEquals('50.0%', $row['conversion_rate']);
                break;
            }
        }
        $this->assertTrue($found, 'TestFunnel not found in Overview');

        // 6. Get Detail Report
        $reportUrl = $this->baseUrl . "/index.php?module=API&method=Funnels.getFunnelReport&idSite=1&idFunnel=" . $idFunnel . "&period=day&date=today&format=JSON&token_auth=" . $token;
        $reportResponse = file_get_contents($reportUrl);
        $report = json_decode($reportResponse, true);

        // Verify
        // We expect:
        // Step 1: 2 entries, 2 visits. 1 Proceeded (Visit 1), 1 Dropoff (Visit 2).
        // Step 2: 1 visit.

        // Check structure
        $this->assertIsArray($report);
        // Find Step 1
        $step1 = $report[0];
        $this->assertEquals('Step1', $step1['label']);
        $this->assertEquals(2, $step1['entries']);

        // Find Step 2
        $step2 = $report[1];
        $this->assertEquals('Step2', $step2['label']);
        $this->assertEquals(1, $step2['visits']);
    }

    public function testPluginIsActivatedInMatomo5(): void
    {
        $token = $this->getToken();
        if (!$token) {
            $this->markTestSkipped('Cannot get auth token');
        }

        $pluginsUrl = $this->baseUrl . "/index.php?module=API&method=API.getPluginNames&format=JSON&token_auth=" . $token;
        $response = @file_get_contents($pluginsUrl);

        if (!$response) {
            $this->markTestSkipped('Cannot retrieve plugin list');
        }

        $result = json_decode($response, true);
        $plugins = $result['value'] ?? [];

        $this->assertContains('Funnels', $plugins, 'Funnels plugin should be activated in Matomo 5.x');
    }

    private function getToken(): ?string
    {
        // Try default credentials for Matomo 5.x
        $url = $this->baseUrl . "/index.php?module=API&method=UsersManager.getTokenAuth&userLogin=admin&md5Password=" . md5("password") . "&format=JSON";
        $res = @file_get_contents($url);
        if (!$res) {
            return null;
        }
        $json = json_decode($res, true);
        return $json['value'] ?? null;
    }

    private function trackVisit(array $urls): void
    {
        // Simple tracker simulation for Matomo 5.x
        $visitorId = substr(md5(uniqid('', true)), 0, 16);

        foreach ($urls as $url) {
            $trackUrl = $this->baseUrl . "/matomo.php?idsite=1&rec=1&url=" . urlencode("http://localhost:8080" . $url) . "&_id=" . $visitorId;
            @file_get_contents($trackUrl);
            usleep(100000);
        }
    }
}
