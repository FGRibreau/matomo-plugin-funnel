<?php
/**
 * Seed funnel archive data for realistic screenshots
 * Run this from the Matomo container:
 *   php /var/www/html/plugins/FunnelInsights/scripts/seed-funnel-archive.php
 */

// Bootstrap Matomo using Environment
define('PIWIK_INCLUDE_PATH', '/var/www/html');
define('PIWIK_USER_PATH', '/var/www/html');
define('PIWIK_DOCUMENT_ROOT', '/var/www/html');

require_once PIWIK_INCLUDE_PATH . '/vendor/autoload.php';

$environment = new \Piwik\Application\Environment('cli');
$environment->init();

\Piwik\Access::getInstance()->setSuperUserAccess(true);

use Piwik\Db;
use Piwik\Common;
use Piwik\DataTable;
use Piwik\DataTable\Row;
use Piwik\Archive;

echo "Seeding funnel archive data...\n";

$idSite = 1;
$idFunnel = 1;
// Use fixed date that matches take-screenshots.js
$targetDate = '2026-01-09';

// Create realistic funnel step data (E-commerce checkout)
// Starting with ~10,000 visits, realistic drop-off at each step
// Step 1: Homepage - 10,247 entries
// Step 2: Product Page - 7,534 (26.5% drop-off)
// Step 3: Add to Cart - 4,218 (44% drop-off)
// Step 4: Checkout - 2,847 (32.5% drop-off)
// Step 5: Order Complete - 1,923 (32.4% drop-off) = 18.8% overall conversion
$funnelSteps = [
    [
        'visits' => 10247,
        'entries' => 10247,
        'exits' => 2713,
        'proceeded' => 7534,
        'skips' => 0,
        'time_spent' => 452300,
        'time_hits' => 7534,
        'dropoff_urls' => json_encode([
            '/about' => 542,
            '/contact' => 421,
            '/blog' => 387,
            '/faq' => 312,
            '/search' => 289,
            '/careers' => 198,
            '/terms' => 156
        ])
    ],
    [
        'visits' => 7534,
        'entries' => 0,
        'exits' => 3316,
        'proceeded' => 4218,
        'skips' => 0,
        'time_spent' => 894200,
        'time_hits' => 4218,
        'dropoff_urls' => json_encode([
            '/' => 812,
            '/products' => 623,
            '/category' => 489,
            '/search' => 412,
            '/compare' => 347,
            '/wishlist' => 298
        ])
    ],
    [
        'visits' => 4218,
        'entries' => 0,
        'exits' => 1371,
        'proceeded' => 2847,
        'skips' => 0,
        'time_spent' => 678900,
        'time_hits' => 2847,
        'dropoff_urls' => json_encode([
            '/product/other' => 312,
            '/wishlist' => 287,
            '/compare' => 234,
            '/' => 198,
            '/products' => 167,
            '/shipping-info' => 123
        ])
    ],
    [
        'visits' => 2847,
        'entries' => 0,
        'exits' => 924,
        'proceeded' => 1923,
        'skips' => 0,
        'time_spent' => 1234500,
        'time_hits' => 1923,
        'dropoff_urls' => json_encode([
            '/cart' => 245,
            '/shipping-info' => 198,
            '/payment-methods' => 167,
            '/' => 134,
            '/contact' => 98,
            '/faq' => 82
        ])
    ],
    [
        'visits' => 1923,
        'entries' => 0,
        'exits' => 0,
        'proceeded' => 1923,
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

// Serialize - Matomo stores blobs gzcompressed
$serialized = $dataTable->getSerialized();
$blobData = gzcompress(reset($serialized));

// Get archive ID
$yearMonth = date('Y_m', strtotime($targetDate));
$archiveTableNumeric = Common::prefixTable('archive_numeric_' . $yearMonth);
$archiveTableBlob = Common::prefixTable('archive_blob_' . $yearMonth);

// Tables should already exist for 2026_01

// Find the archive ID that has the 'done' flag for this date
$idArchive = Db::fetchOne("SELECT idarchive FROM $archiveTableNumeric WHERE idsite = ? AND date1 = ? AND name = 'done' ORDER BY idarchive DESC LIMIT 1", [$idSite, $targetDate]);
if (!$idArchive) {
    // No existing archive, create new one
    $idArchive = Db::fetchOne("SELECT COALESCE(MAX(idarchive), 0) + 1 FROM $archiveTableNumeric");
    // Insert done flag
    Db::get()->query("INSERT INTO $archiveTableNumeric (idarchive, name, idsite, date1, date2, period, ts_archived, value)
              VALUES (?, 'done', ?, ?, ?, 1, NOW(), 1)
              ON DUPLICATE KEY UPDATE value = 1",
              [$idArchive, $idSite, $targetDate, $targetDate]);
}
echo "Using archive ID: $idArchive\n";

// Insert blob data
$recordName = 'FunnelInsights_Funnel_' . $idFunnel;
Db::get()->query("INSERT INTO $archiveTableBlob (idarchive, name, idsite, date1, date2, period, ts_archived, value)
          VALUES (?, ?, ?, ?, ?, 1, NOW(), ?)
          ON DUPLICATE KEY UPDATE value = VALUES(value), ts_archived = NOW()",
          [$idArchive, $recordName, $idSite, $targetDate, $targetDate, $blobData]);

echo "SUCCESS: Inserted funnel archive data\n";
echo "  Archive ID: $idArchive\n";
echo "  Date: $targetDate\n";
echo "  Record: $recordName\n";
echo "  Steps: " . count($funnelSteps) . "\n";
echo "  Total Entries: 10,247\n";
echo "  Conversions: 1,923\n";
echo "  Conversion Rate: 18.8%\n";
