<?php

namespace Piwik\Plugins\FunnelInsights;

use Piwik\Plugin\Controller as PluginController;
use Piwik\Piwik;

class Controller extends PluginController
{
    public function index()
    {
        Piwik::checkUserHasViewAccess($this->idSite);

        return $this->renderTemplate('@FunnelInsights/index', [
            'funnels' => API::getInstance()->getFunnels($this->idSite),
        ]);
    }

    public function viewFunnel()
    {
        Piwik::checkUserHasViewAccess($this->idSite);

        $idFunnel = \Piwik\Common::getRequestVar('idFunnel', 0, 'int');

        if ($idFunnel <= 0) {
            $this->redirectToIndex('FunnelInsights', 'index');
            return;
        }

        $funnel = API::getInstance()->getFunnel($this->idSite, $idFunnel);

        if (!$funnel) {
            $this->redirectToIndex('FunnelInsights', 'index');
            return;
        }

        return $this->renderTemplate('@FunnelInsights/viewFunnel', [
            'funnel' => $funnel,
            'funnelReport' => API::getInstance()->getFunnelReport($this->idSite, $idFunnel),
        ]);
    }

    public function manage()
    {
        Piwik::checkUserHasAdminAccess($this->idSite);

        return $this->renderTemplate('@FunnelInsights/manage', [
            'funnels' => API::getInstance()->getFunnels($this->idSite),
        ]);
    }

    public function edit()
    {
        Piwik::checkUserHasAdminAccess($this->idSite);

        $idFunnel = \Piwik\Common::getRequestVar('idFunnel', 0, 'int');

        $funnel = null;
        if ($idFunnel > 0) {
            $funnel = API::getInstance()->getFunnel($this->idSite, $idFunnel);
        }

        $goals = \Piwik\Plugins\Goals\API::getInstance()->getGoals($this->idSite);

        return $this->renderTemplate('@FunnelInsights/edit', [
            'funnel' => $funnel,
            'goals' => $goals,
        ]);
    }
    
    public function save()
    {
        Piwik::checkUserHasAdminAccess($this->idSite);
        $this->checkTokenInUrl();
        
        $idFunnel = \Piwik\Common::getRequestVar('idFunnel', 0, 'int');
        $name = \Piwik\Common::getRequestVar('name', '', 'string');
        $stepsJson = \Piwik\Common::getRequestVar('steps', '[]', 'string');
        $active = \Piwik\Common::getRequestVar('active', 0, 'int');
        $goalId = \Piwik\Common::getRequestVar('goal_id', '', 'string');
        $strictMode = \Piwik\Common::getRequestVar('strict_mode', 0, 'int');
        $stepTimeLimit = \Piwik\Common::getRequestVar('step_time_limit', 0, 'int');
        
        $goalId = ($goalId === '') ? null : (int)$goalId;
        
        $steps = json_decode($stepsJson, true);
        
        if ($idFunnel > 0) {
            API::getInstance()->updateFunnel($idFunnel, $this->idSite, $name, $steps, $goalId, $active, $strictMode, $stepTimeLimit);
        } else {
            API::getInstance()->createFunnel($this->idSite, $name, $steps, $goalId, $active, $strictMode, $stepTimeLimit);
        }
        
        $this->redirectToIndex('FunnelInsights', 'manage');
    }
    
    public function duplicate()
    {
        Piwik::checkUserHasAdminAccess($this->idSite);
        $this->checkTokenInUrl();
        
        $idFunnel = \Piwik\Common::getRequestVar('idFunnel', 0, 'int');
        if ($idFunnel > 0) {
            API::getInstance()->duplicateFunnel($this->idSite, $idFunnel);
        }
        
        $this->redirectToIndex('FunnelInsights', 'manage');
    }
    
    public function delete()
    {
        Piwik::checkUserHasAdminAccess($this->idSite);
        $this->checkTokenInUrl();
        
        $idFunnel = \Piwik\Common::getRequestVar('idFunnel', 0, 'int');
        if ($idFunnel > 0) {
            API::getInstance()->deleteFunnel($this->idSite, $idFunnel);
        }
        
        $this->redirectToIndex('FunnelInsights', 'manage');
    }
}
