<?php

namespace Piwik\Plugins\Funnels\DAO;

use Piwik\Common;
use Piwik\Db;
use Piwik\Date;

class FunnelConfig
{
    private $table;

    public function __construct()
    {
        $this->table = Common::prefixTable('log_funnel');
    }

    public function create($idSite, $name, $steps, $goalId = null, $active = 0, $strictMode = 0, $stepTimeLimit = 0)
    {
        $db = Db::get();
        $date = Date::now()->getDatetime();
        
        $sql = "INSERT INTO {$this->table} (idsite, name, steps_json, goal_id, active, strict_mode, step_time_limit, created_date, updated_date) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $db->query($sql, array($idSite, $name, json_encode($steps), $goalId, $active, $strictMode, $stepTimeLimit, $date, $date));
        
        return $db->lastInsertId();
    }

    public function update($idFunnel, $name, $steps, $goalId, $active, $strictMode, $stepTimeLimit)
    {
        $db = Db::get();
        $date = Date::now()->getDatetime();
        
        $sql = "UPDATE {$this->table} 
                SET name = ?, steps_json = ?, goal_id = ?, active = ?, strict_mode = ?, step_time_limit = ?, updated_date = ? 
                WHERE idfunnel = ?";
        
        $db->query($sql, array($name, json_encode($steps), $goalId, $active, $strictMode, $stepTimeLimit, $date, $idFunnel));
    }

    public function delete($idFunnel)
    {
        $db = Db::get();
        // Soft delete
        $sql = "UPDATE {$this->table} SET deleted = 1, updated_date = ? WHERE idfunnel = ?";
        $db->query($sql, array(Date::now()->getDatetime(), $idFunnel));
    }

    public function get($idFunnel)
    {
        $db = Db::get();
        // Ignore deleted status for get? Usually yes, or return null if deleted.
        // Let's filter deleted.
        $sql = "SELECT * FROM {$this->table} WHERE idfunnel = ? AND deleted = 0";
        $row = $db->fetchRow($sql, array($idFunnel));
        
        if ($row && isset($row['steps_json'])) {
            $row['steps'] = json_decode($row['steps_json'], true);
        }
        
        return $row;
    }

    public function getAllForSite($idSite)
    {
        $db = Db::get();
        $sql = "SELECT * FROM {$this->table} WHERE idsite = ? AND deleted = 0";
        $rows = $db->fetchAll($sql, array($idSite));
        
        foreach ($rows as &$row) {
            if (isset($row['steps_json'])) {
                $row['steps'] = json_decode($row['steps_json'], true);
            }
        }
        
        return $rows;
    }
}
