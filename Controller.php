<?php

namespace Piwik\Plugins\FunnelInsights;

use Piwik\Common;
use Piwik\Nonce;
use Piwik\Plugin\ControllerAdmin;
use Piwik\Piwik;

class Controller extends ControllerAdmin
{
    const NONCE_NAME = 'FunnelInsights.saveForm';

    /**
     * Validates CSRF protection from request.
     * Accepts either form_nonce (for traditional form submissions) or token_auth (for AJAX/API calls).
     * When token_auth is present, it serves as CSRF protection since it's a secret tied to the user.
     */
    private function validateCsrfNonce()
    {
        $tokenAuth = Common::getRequestVar('token_auth', '', 'string');
        if ($tokenAuth !== '') {
            return;
        }

        $nonce = Common::getRequestVar('form_nonce', '', 'string');
        if (!Nonce::verifyNonce(self::NONCE_NAME, $nonce)) {
            throw new \Exception(Piwik::translate('General_ExceptionSecurityCheckFailed'));
        }
    }

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

        $idFunnel = Common::getRequestVar('idFunnel', 0, 'int');

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

        $idFunnel = Common::getRequestVar('idFunnel', 0, 'int');

        $funnel = null;
        if ($idFunnel > 0) {
            $funnel = API::getInstance()->getFunnel($this->idSite, $idFunnel);
        }

        $goals = \Piwik\Plugins\Goals\API::getInstance()->getGoals($this->idSite);

        return $this->renderTemplate('@FunnelInsights/edit', [
            'funnel' => $funnel,
            'goals' => $goals,
            'form_nonce' => Nonce::getNonce(self::NONCE_NAME),
        ]);
    }

    public function save()
    {
        Piwik::checkUserHasAdminAccess($this->idSite);
        $this->validateCsrfNonce();

        $idFunnel = Common::getRequestVar('idFunnel', 0, 'int');
        $name = Common::getRequestVar('name', '', 'string');
        $stepsJson = Common::getRequestVar('steps', '[]', 'string');
        $active = Common::getRequestVar('active', 0, 'int');
        $goalId = Common::getRequestVar('goal_id', '', 'string');
        $strictMode = Common::getRequestVar('strict_mode', 0, 'int');
        $stepTimeLimit = Common::getRequestVar('step_time_limit', 0, 'int');

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

        $idFunnel = Common::getRequestVar('idFunnel', 0, 'int');
        if ($idFunnel > 0) {
            API::getInstance()->duplicateFunnel($this->idSite, $idFunnel);
        }

        $this->redirectToIndex('FunnelInsights', 'manage');
    }

    public function validateSteps()
    {
        $idSite = Common::getRequestVar('idSite', 0, 'int');
        Piwik::checkUserHasAdminAccess($idSite);

        $stepsJson = Common::getRequestVar('steps', '[]', 'string');
        $testUrl = Common::getRequestVar('testUrl', '', 'string');

        // Common::getRequestVar HTML-encodes the string, so we need to decode it
        $stepsJson = Common::unsanitizeInputValue($stepsJson);

        $steps = json_decode($stepsJson, true);

        $results = API::getInstance()->validateFunnelSteps($idSite, $steps, $testUrl);

        header('Content-Type: application/json');
        echo json_encode($results);
        exit;
    }

    public function delete()
    {
        Piwik::checkUserHasAdminAccess($this->idSite);

        $idFunnel = Common::getRequestVar('idFunnel', 0, 'int');
        if ($idFunnel > 0) {
            API::getInstance()->deleteFunnel($this->idSite, $idFunnel);
        }

        $this->redirectToIndex('FunnelInsights', 'manage');
    }
}
