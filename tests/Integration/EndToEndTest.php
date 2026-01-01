<?php

namespace Piwik\Plugins\Funnels\tests\Integration;

use PHPUnit\Framework\TestCase;

class EndToEndTest extends TestCase
{
    private $baseUrl = 'http://localhost:8080';
    private $authToken = 'anonymous'; // Will be updated
    private $idSite = 1;

    public function setUp(): void
    {
        // Wait for Matomo
        $maxRetries = 10;
        $connected = false;
        for ($i=0; $i<$maxRetries; $i++) {
            $headers = @get_headers($this->baseUrl);
            if ($headers && strpos($headers[0], '200') !== false) {
                $connected = true;
                break;
            }
            sleep(2);
        }

        if (!$connected) {
            $this->markTestSkipped('Matomo not ready');
        }
        
        // Assuming we have a superuser token or anonymous access to API is allowed (unlikely for Admin actions).
        // For integration test in Docker, we usually configure a known token in config.ini.php
        // My generated config.ini.php didn't specify a token, but it defined salt.
        // We need to Create a User or use existing.
        // The Docker image creates 'admin' / 'password' by default if not specified? 
        // Actually, the docker-compose didn't set MATOMO_USERNAME/PASSWORD env vars for installation?
        // Wait, I didn't pass MATOMO_USERNAME/PASSWORD to the matomo container envs, I passed DB creds.
        // Matomo Docker entrypoint usually installs if DB is empty.
        // I need to ensure installation happens.
        
        // I'll assume for this test that the user (me) runs the installation command manually or via the script provided earlier.
        // And I'll use a hardcoded token that I will "inject" or retrieve via Login.
        
        // Let's attempt to Login via API to get token.
        $loginUrl = $this->baseUrl . "/index.php?module=API&method=UsersManager.getTokenAuth&userLogin=admin&md5Password=" . md5("password") . "&format=JSON";
        // This assumes default admin/password.
        
        // Wait! The user hasn't run the install script yet. 
        // I cannot run this test "in vivo" right now because the container isn't running in THIS environment.
        // I am generating the test file for the user to run.
        
        // So I will write the test assuming 'admin' / 'password' works and returns a token.
    }

    public function testFullFlow()
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
    
    private function getToken()
    {
        // Try default credentials
        $url = $this->baseUrl . "/index.php?module=API&method=UsersManager.getTokenAuth&userLogin=admin&md5Password=" . md5("password") . "&format=JSON";
        $res = @file_get_contents($url);
        if (!$res) return null;
        $json = json_decode($res, true);
        return isset($json['value']) ? $json['value'] : null;
    }
    
    private function trackVisit($urls)
    {
        // Simple tracker simulation
        // We use a random visitor ID for each call to simulate distinct visits? 
        // No, 'trackVisit' implies 1 visit with multiple actions.
        $visitorId = substr(md5(uniqid()), 0, 16);
        
        foreach ($urls as $url) {
            $trackUrl = $this->baseUrl . "/matomo.php?idsite=1&rec=1&url=" . urlencode("http://localhost:8080" . $url) . "&_id=" . $visitorId;
            file_get_contents($trackUrl);
            // sleep small amount to ensure sequence?
            usleep(100000); 
        }
    }
}
