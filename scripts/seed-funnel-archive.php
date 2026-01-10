<?php
/**
 * Seed funnel archive data for realistic screenshots
 * Run this from the Matomo container:
 *   php /var/www/html/plugins/FunnelInsights/scripts/seed-funnel-archive.php
 */

// Bootstrap Matomo
define('PIWIK_INCLUDE_PATH', '/var/www/html');
define('PIWIK_USER_PATH', PIWIK_INCLUDE_PATH);
require_once PIWIK_INCLUDE_PATH . '/core/bootstrap.php';

use Piwik\Db;
use Piwik\Common;
use Piwik\DataTable;
use Piwik\DataTable\Row;
use Piwik\Archive;

echo "Seeding funnel archive data...\n";

$idSite = 1;
$idFunnel = 1;
$yesterday = date('Y-m-d', strtotime('-1 day'));

// Create realistic funnel step data (E-commerce checkout)
$funnelSteps = [
    [
        'visits' => 1247,
        'entries' => 1247,
        'exits' => 189,
        'proceeded' => 1058,
        'skips' => 0,
        'time_spent' => 45230,
        'time_hits' => 1058,
        'dropoff_urls' => json_encode([
            '/about' => 45,
            '/contact' => 32,
            '/blog' => 28,
            '/faq' => 24,
            '/search' => 20
        ])
    ],
    [
        'visits' => 1058,
        'entries' => 0,
        'exits' => 247,
        'proceeded' => 811,
        'skips' => 0,
        'time_spent' => 89420,
        'time_hits' => 811,
        'dropoff_urls' => json_encode([
            '/' => 62,
            '/products' => 48,
            '/category' => 37,
            '/search' => 30,
            '/compare' => 25
        ])
    ],
    [
        'visits' => 811,
        'entries' => 0,
        'exits' => 156,
        'proceeded' => 655,
        'skips' => 0,
        'time_spent' => 67890,
        'time_hits' => 655,
        'dropoff_urls' => json_encode([
            '/product/other' => 42,
            '/wishlist' => 35,
            '/compare' => 28,
            '/' => 22,
            '/products' => 19
        ])
    ],
    [
        'visits' => 655,
        'entries' => 0,
        'exits' => 187,
        'proceeded' => 468,
        'skips' => 0,
        'time_spent' => 123450,
        'time_hits' => 468,
        'dropoff_urls' => json_encode([
            '/cart' => 52,
            '/shipping-info' => 41,
            '/payment-methods' => 33,
            '/' => 26,
            '/contact' => 20
        ])
    ],
    [
        'visits' => 468,
        'entries' => 0,
        'exits' => 0,
        'proceeded' => 468,
        'skips' => 0,
        'time_spent' => 0,
        'time_hits' => 0,
        'dropoff_urls' => json_encode([])
    ]
];

// Build DataTable
$dataTable = new DataTable();
foreach ($funnelSteps as $stepData) {
    $row = new Row();
    $row->setColumns($stepData);
    $dataTable->addRow($row);
}

// Serialize
$serialized = $dataTable->getSerialized();
$blobData = reset($serialized);

// Get archive ID
$archiveTableNumeric = Common::prefixTable('archive_numeric_' . date('Y_m', strtotime($yesterday)));
$archiveTableBlob = Common::prefixTable('archive_blob_' . date('Y_m', strtotime($yesterday)));

// Create tables if needed
$yearMonth = date('Y_m', strtotime($yesterday));
Db::exec("CREATE TABLE IF NOT EXISTS " . Common::prefixTable("archive_blob_$yearMonth") . " LIKE " . Common::prefixTable("archive_blob_2026_01"));
Db::exec("CREATE TABLE IF NOT EXISTS " . Common::prefixTable("archive_numeric_$yearMonth") . " LIKE " . Common::prefixTable("archive_numeric_2026_01"));

// Find or create archive ID
$idArchive = Db::fetchOne("SELECT MAX(idarchive) FROM $archiveTableNumeric WHERE idsite = ? AND date1 = ?", [$idSite, $yesterday]);
if (!$idArchive) {
    $idArchive = 1;
    // Insert done flag
    Db::exec("INSERT INTO $archiveTableNumeric (idarchive, name, idsite, date1, date2, period, ts_archived, value)
              VALUES (?, 'done', ?, ?, ?, 1, NOW(), 1)
              ON DUPLICATE KEY UPDATE value = 1",
              [$idArchive, $idSite, $yesterday, $yesterday]);
}

// Insert blob data
$recordName = 'FunnelInsights_Funnel_' . $idFunnel;
Db::exec("INSERT INTO $archiveTableBlob (idarchive, name, idsite, date1, date2, period, ts_archived, value)
          VALUES (?, ?, ?, ?, ?, 1, NOW(), ?)
          ON DUPLICATE KEY UPDATE value = VALUES(value), ts_archived = NOW()",
          [$idArchive, $recordName, $idSite, $yesterday, $yesterday, $blobData]);

echo "SUCCESS: Inserted funnel archive data\n";
echo "  Archive ID: $idArchive\n";
echo "  Date: $yesterday\n";
echo "  Record: $recordName\n";
echo "  Steps: " . count($funnelSteps) . "\n";
echo "  Total Entries: 1247\n";
echo "  Conversions: 468\n";
echo "  Conversion Rate: 37.5%\n";
