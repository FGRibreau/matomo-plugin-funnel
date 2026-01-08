<?php
/**
 * Simple endpoint to retrieve the E2E test token
 * Only used for automated testing - not included in production
 */

header('Content-Type: text/plain');

$tokenFile = '/var/www/html/tmp/e2e-token.txt';
if (file_exists($tokenFile)) {
    echo trim(file_get_contents($tokenFile));
} else {
    http_response_code(404);
    echo 'Token file not found';
}
