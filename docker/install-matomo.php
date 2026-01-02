<?php
/**
 * Automated Matomo installation script for E2E testing
 * Uses Matomo's Application Environment to properly bootstrap
 */

// Configuration
$dbHost = 'db';
$dbName = 'matomo';
$dbUser = 'matomo';
$dbPass = 'matomo';
$adminLogin = 'admin';
$adminEmail = 'admin@test.com';
$adminPass = 'adminpassword123';
$siteName = 'Test Website';
$siteUrl = 'http://localhost:8080';

define('PIWIK_DOCUMENT_ROOT', '/var/www/html/');
define('PIWIK_USER_PATH', '/var/www/html/');
define('PIWIK_INCLUDE_PATH', '/var/www/html/');

// Step 1: Create config file first (before bootstrapping)
echo "Creating config file...\n";

$configDir = PIWIK_DOCUMENT_ROOT . 'config';
if (!is_dir($configDir)) {
    mkdir($configDir, 0755, true);
}

$configFile = $configDir . '/config.ini.php';
$salt = bin2hex(random_bytes(16));

$configContent = <<<CONFIG
; <?php exit; ?> DO NOT REMOVE THIS LINE
[database]
host = "$dbHost"
username = "$dbUser"
password = "$dbPass"
dbname = "$dbName"
tables_prefix = "matomo_"
charset = "utf8mb4"

[General]
salt = "$salt"
trusted_hosts[] = "localhost"
trusted_hosts[] = "localhost:8080"
enable_update_communication = 0
enable_auto_update = 0
installation_in_progress = 0
login_allowlist_ip[] = "0.0.0.0/0"
login_allowlist_ip[] = "::/0"
session_cookie_name = "MATOMO_SESSID"
session_save_handler = "files"
login_cookie_expire = 1209600
remember_login_cookie_expire = 1209600
login_password_recovery_email_expiretime = 604800

[Tracker]
debug = 0

[brute_force_detection]
enabled = 0

CONFIG;

file_put_contents($configFile, $configContent);
chmod($configFile, 0644);
echo "Config file created.\n";

// Step 2: Now bootstrap Matomo properly
require_once PIWIK_DOCUMENT_ROOT . 'core/bootstrap.php';

use Piwik\Application\Environment;
use Piwik\Access;
use Piwik\Config;
use Piwik\Db;
use Piwik\DbHelper;
use Piwik\Updater;
use Piwik\Plugins\UsersManager\API as UsersManagerAPI;

try {
    echo "Starting Matomo installation...\n";

    // Initialize the Matomo environment
    $environment = new Environment('cli-install');
    $environment->init();

    // Create database tables
    echo "Creating database tables...\n";

    $tablesInstalled = DbHelper::getTablesInstalled();
    if (empty($tablesInstalled)) {
        DbHelper::createTables();
        DbHelper::createAnonymousUser();
        echo "Core database tables created.\n";
    } else {
        echo "Core tables already exist.\n";
    }

    // Set install version before running updates
    \Piwik\Option::set('install_version', \Piwik\Version::VERSION);

    // Run database updates to create plugin tables
    echo "Running database updates to create plugin tables...\n";

    $updater = new Updater();
    $componentsWithUpdateFile = $updater->getComponentUpdates();
    if (!empty($componentsWithUpdateFile)) {
        $updater->updateComponents($componentsWithUpdateFile);
        echo "Plugin tables created via updater.\n";
    } else {
        echo "No component updates needed.\n";
    }

    // Grant super user access for remaining operations
    Access::getInstance()->setSuperUserAccess(true);

    // Create admin user using Matomo's API (proper password hashing)
    echo "Creating admin user...\n";

    $db = Db::get();
    $userExists = $db->fetchOne("SELECT login FROM matomo_user WHERE login = ?", [$adminLogin]);

    if (!$userExists) {
        // Use Matomo's API to create user with proper password hashing
        UsersManagerAPI::getInstance()->addUser($adminLogin, $adminPass, $adminEmail);
        UsersManagerAPI::getInstance()->setSuperUserAccess($adminLogin, true);
        echo "Admin user created via API.\n";
    } else {
        echo "Admin user already exists.\n";
    }

    // Create first website directly via SQL to avoid hook issues
    echo "Creating first website...\n";

    $siteExists = $db->fetchOne("SELECT idsite FROM matomo_site WHERE idsite = 1");

    if (!$siteExists) {
        $db->query(
            "INSERT INTO matomo_site (idsite, name, main_url, ts_created, type)
             VALUES (1, ?, ?, NOW(), 'website')",
            [$siteName, $siteUrl]
        );
        echo "Website created with ID: 1\n";
    } else {
        echo "Website already exists.\n";
    }

    // Mark installation as complete
    echo "Finalizing installation...\n";

    $config = Config::getInstance();
    $config->General['installation_in_progress'] = 0;
    $config->forceSave();

    echo "Installation completed successfully!\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
