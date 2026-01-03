<?php

namespace Piwik\Plugins\FunnelInsights;

use Piwik\Common;
use Piwik\Db;

/**
 * FunnelInsights scheduled tasks.
 */
class Tasks extends \Piwik\Plugin\Tasks
{
    /**
     * Schedule tasks.
     */
    public function schedule(): void
    {
        $this->daily('cleanupDeletedFunnels', null, self::LOW_PRIORITY);
    }

    /**
     * Cleanup funnels that have been soft-deleted for more than 30 days.
     */
    public function cleanupDeletedFunnels(): void
    {
        $table = Common::prefixTable('funnel');
        $sql = "DELETE FROM `$table` WHERE deleted = 1 AND updated_date < DATE_SUB(NOW(), INTERVAL 30 DAY)";
        Db::get()->query($sql);
    }
}
