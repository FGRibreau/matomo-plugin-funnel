<?php

namespace Piwik\Plugins\FunnelInsights\Tasks;

use Piwik\Plugin\ScheduledTask;

class Cleanup extends ScheduledTask
{
    public function schedule()
    {
        // Run daily
        $this->daily();
    }

    public function execute()
    {
        // Cleanup logic (placeholder)
        // e.g. Delete funnels marked as 'deleted' more than 30 days ago.
        // Current DAO implements soft delete via 'deleted' column.
        
        $db = \Piwik\Db::get();
        $prefix = \Piwik\Common::prefixTable('log_funnel');
        
        // Delete hard
        $sql = "DELETE FROM $prefix WHERE deleted = 1 AND updated_date < DATE_SUB(NOW(), INTERVAL 30 DAY)";
        $db->query($sql);
    }
}
