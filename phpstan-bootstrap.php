<?php
/**
 * PHPStan bootstrap file for FunnelInsights plugin.
 * Sets up Matomo constants and autoloading for static analysis.
 */

// Define Matomo constants
if (!defined('PIWIK_INCLUDE_PATH')) {
    define('PIWIK_INCLUDE_PATH', __DIR__ . '/.matomo');
}

if (!defined('PIWIK_USER_PATH')) {
    define('PIWIK_USER_PATH', PIWIK_INCLUDE_PATH);
}

if (!defined('PIWIK_DOCUMENT_ROOT')) {
    define('PIWIK_DOCUMENT_ROOT', PIWIK_INCLUDE_PATH);
}

// Set include path for Matomo's legacy PEAR-style includes
set_include_path(
    PIWIK_INCLUDE_PATH . PATH_SEPARATOR .
    PIWIK_INCLUDE_PATH . '/core' . PATH_SEPARATOR .
    PIWIK_INCLUDE_PATH . '/libs' . PATH_SEPARATOR .
    get_include_path()
);

// Load Matomo's autoloader
require_once PIWIK_INCLUDE_PATH . '/vendor/autoload.php';
