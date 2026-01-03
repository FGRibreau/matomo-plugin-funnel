<?php

namespace Piwik\Plugins\FunnelInsights;

use Piwik\Plugin;
use Piwik\Db;
use Piwik\Common;

class FunnelInsights extends Plugin
{
    /**
     * @see Piwik\Plugin::registerEvents
     */
    public function registerEvents()
    {
        return array(
            'AssetManager.getJavaScriptFiles' => 'getJavaScriptFiles',
            'API.getSegments' => 'getSegments',
            'CustomAlerts.getAlertMetrics' => 'getAlertMetrics',
            'CustomAlerts.getAlertConditions' => 'getAlertConditions',
        );
    }

    public function getAlertMetrics(&$metrics)
    {
        $metrics['funnel_conversion_rate'] = array(
            'name' => 'Funnel Conversion Rate',
            'category' => 'FunnelInsights',
            'type' => 'percent'
        );
        $metrics['funnel_conversions'] = array(
            'name' => 'Funnel Conversions',
            'category' => 'FunnelInsights',
            'type' => 'number'
        );
    }

    public function getAlertConditions(&$conditions)
    {
        $conditions = array();
    }

    public function getJavaScriptFiles(&$files)
    {
        $files[] = 'plugins/FunnelInsights/javascripts/funnelEditor.js';
    }

    public function getSegments(&$segments)
    {
        $segments[] = array(
            'segment' => 'funnel_participated',
            'name' => 'Visit participated in funnel',
            'category' => 'FunnelInsights',
            'sqlSegment' => 'funnel_participated',
            'type' => 'dimension',
        );
        $segments[] = array(
            'segment' => 'funnel_participated_step',
            'name' => 'Visit participated in funnel at step position',
            'category' => 'FunnelInsights',
            'sqlSegment' => 'funnel_participated_step',
            'type' => 'dimension',
        );
    }

    public function install()
    {
        $query = "CREATE TABLE IF NOT EXISTS " . Common::prefixTable('log_funnel') . " (
            idfunnel INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
            name VARCHAR(255) NOT NULL,
            idsite INT(11) UNSIGNED NOT NULL,
            goal_id INT(11) UNSIGNED DEFAULT NULL,
            steps_json TEXT NOT NULL,
            active TINYINT(1) DEFAULT 0,
            strict_mode TINYINT(1) DEFAULT 0,
            step_time_limit INT(11) UNSIGNED DEFAULT 0,
            created_date DATETIME NOT NULL,
            updated_date DATETIME DEFAULT NULL,
            deleted TINYINT(1) DEFAULT 0,
            PRIMARY KEY (idfunnel),
            INDEX index_idsite (idsite)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;";

        Db::exec($query);
    }

    public function uninstall()
    {
        $query = "DROP TABLE IF EXISTS " . Common::prefixTable('log_funnel');
        Db::exec($query);
    }
}
