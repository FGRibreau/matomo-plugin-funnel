<?php

namespace Piwik\Plugins\FunnelInsights;

use Piwik\Plugin\Controller as AbstractController;
use Piwik\Piwik;
use Piwik\View;

class Controller extends AbstractController
{
    public function index()
    {
        Piwik::checkUserHasViewAccess($this->idSite);

        $view = new View('@FunnelInsights/index');
        $view->funnels = API::getInstance()->getFunnels($this->idSite);
        $this->setBasicVariablesView($view);

        return $view->render();
    }

    public function manage()
    {
        Piwik::checkUserHasAdminAccess($this->idSite);
        
        $view = new View('@FunnelInsights/manage');
        $view->funnels = API::getInstance()->getFunnels($this->idSite);
        $this->setBasicVariablesView($view);
        
        return $view->render();
    }

    public function edit()
    {
        Piwik::checkUserHasAdminAccess($this->idSite);
        
        $idFunnel = \Piwik\Common::getRequestVar('idFunnel', 0, 'int');
        
        $view = new View('@FunnelInsights/edit');
        if ($idFunnel > 0) {
            $view->funnel = API::getInstance()->getFunnel($this->idSite, $idFunnel);
        }
        
        // Fetch Goals
        $goals = \Piwik\Plugins\Goals\API::getInstance()->getGoals($this->idSite);
        $view->goals = $goals;

        $this->setBasicVariablesView($view);
        
        return $view->render();
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
