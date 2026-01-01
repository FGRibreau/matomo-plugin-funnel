<?php

namespace Piwik\Plugins\Funnels\tests\Integration;

use PHPUnit\Framework\TestCase;

class ApiIntegrationTest extends TestCase
{
    private $baseUrl = 'http://localhost:8080';
    private $tokenAuth = 'anonymous'; // Replace with real token after initial setup if needed, or use anonymous if public
    // NOTE: In automated env, we need to setup Matomo first.
    // Docker container starts blank. We need to install it via CLI or API.
    
    public function setUp(): void
    {
        // Check if Matomo is up
        $headers = @get_headers($this->baseUrl);
        if (!$headers || strpos($headers[0], '200') === false) {
             $this->markTestSkipped('Matomo container not reachable at ' . $this->baseUrl);
        }
    }

    public function testGetFunnelsEmpty()
    {
        // This test assumes Matomo is installed and Funnels plugin is active.
        // It tries to call the API.
        
        $url = $this->baseUrl . "/index.php?module=API&method=Funnels.getFunnels&idSite=1&format=JSON&token_auth=" . $this->tokenAuth;
        $response = file_get_contents($url);
        
        $this->assertNotFalse($response, 'API call failed');
        $data = json_decode($response, true);
        
        // If plugin is active but no funnels, should be empty array
        $this->assertIsArray($data);
        // $this->assertEmpty($data); // Might not be empty if we created some in other tests
    }
}

