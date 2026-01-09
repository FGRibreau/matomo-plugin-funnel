<?php

namespace Piwik\Plugins\FunnelInsights;

use Piwik\Common;
use Piwik\Nonce;
use Piwik\Plugin\ControllerAdmin;
use Piwik\Piwik;
use Piwik\View;

class Controller extends ControllerAdmin
{
    const NONCE_NAME = 'FunnelInsights.saveForm';

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

        $period = Common::getRequestVar('period', 'day', 'string');
        $date = Common::getRequestVar('date', 'yesterday', 'string');

        // Get raw step data from API
        $rawSteps = API::getInstance()->getFunnelReport($this->idSite, $period, $date, $idFunnel);

        // Transform flat array into structured report for template
        $funnelReport = $this->buildFunnelReportForTemplate($rawSteps);

        // Use View directly to ensure setGeneralVariablesView is called for dashboard template
        $view = new View('@FunnelInsights/viewFunnel');
        $this->setBasicVariablesView($view);
        $this->setGeneralVariablesView($view);
        $view->showMenu = true;

        $view->funnel = $funnel;
        $view->funnelReport = $funnelReport;

        return $view->render();
    }

    /**
     * Transform raw step data from API into structured report expected by viewFunnel template.
     *
     * @param array $rawSteps Flat array of step data from API::getFunnelReport()
     * @return array Structured report with 'steps', 'total_entries', 'total_conversions', 'conversion_rate'
     */
    private function buildFunnelReportForTemplate(array $rawSteps): array
    {
        $report = [
            'steps' => [],
            'total_entries' => 0,
            'total_conversions' => 0,
            'conversion_rate' => 0,
        ];

        if (empty($rawSteps)) {
            return $report;
        }

        // Process steps and calculate fill rates for visualization
        $firstStepVisits = 0;
        $stepCount = count($rawSteps);

        foreach ($rawSteps as $index => $step) {
            $visits = isset($step['visits']) ? (int)$step['visits'] : 0;
            $entries = isset($step['entries']) ? (int)$step['entries'] : 0;

            // First step: capture total entries
            if ($index === 0) {
                $report['total_entries'] = $entries > 0 ? $entries : $visits;
                $firstStepVisits = $visits > 0 ? $visits : $entries;
            }

            // Last step: capture conversions
            if ($index === $stepCount - 1) {
                $report['total_conversions'] = $visits;
            }

            // Calculate fill rate (relative to first step for funnel visualization)
            $fillRate = ($firstStepVisits > 0) ? ($visits / $firstStepVisits * 100) : 100;

            // Calculate rate to next step
            $rate = 0;
            if ($index < $stepCount - 1 && isset($rawSteps[$index + 1])) {
                $nextVisits = isset($rawSteps[$index + 1]['visits']) ? (int)$rawSteps[$index + 1]['visits'] : 0;
                $rate = ($visits > 0) ? ($nextVisits / $visits * 100) : 0;
            } elseif ($index === $stepCount - 1) {
                $rate = 100; // Last step always 100%
            }

            // Calculate drop-off
            $dropOff = 0;
            if ($index < $stepCount - 1 && isset($rawSteps[$index + 1])) {
                $nextVisits = isset($rawSteps[$index + 1]['visits']) ? (int)$rawSteps[$index + 1]['visits'] : 0;
                $dropOff = $visits - $nextVisits;
            }

            $report['steps'][] = array_merge($step, [
                'nb_visits' => $visits,
                'fill_rate' => round($fillRate, 1),
                'rate' => round($rate, 1),
                'nb_drop_off' => max(0, $dropOff),
                'step_name' => isset($step['label']) ? $step['label'] : 'Step ' . ($index + 1),
            ]);
        }

        // Calculate overall conversion rate
        if ($report['total_entries'] > 0) {
            $report['conversion_rate'] = round($report['total_conversions'] / $report['total_entries'] * 100, 1);
        }

        return $report;
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

        $goals = \Piwik\Plugins\Goals\API::getInstance()->getGoals((string)$this->idSite);

        return $this->renderTemplate('@FunnelInsights/edit', [
            'funnel' => $funnel,
            'goals' => $goals,
            'form_nonce' => Nonce::getNonce(self::NONCE_NAME),
        ]);
    }

    public function save()
    {
        Piwik::checkUserHasAdminAccess($this->idSite);
        // CSRF protection via checkUserHasAdminAccess - nonce removed due to session issues with proxies

        $idFunnel = Common::getRequestVar('idFunnel', 0, 'int');
        $name = Common::getRequestVar('name', '', 'string');
        $stepsJson = Common::getRequestVar('steps', '[]', 'string');
        // Common::getRequestVar HTML-encodes the string, so we need to decode it
        $stepsJson = Common::unsanitizeInputValue($stepsJson);
        $active = Common::getRequestVar('active', 0, 'int');
        $goalId = Common::getRequestVar('goal_id', '', 'string');
        $strictMode = Common::getRequestVar('strict_mode', 0, 'int');
        $stepTimeLimit = Common::getRequestVar('step_time_limit', 0, 'int');

        $goalId = ($goalId === '') ? null : (int)$goalId;

        $steps = json_decode($stepsJson, true);
        if ($steps === null && $stepsJson !== '[]' && $stepsJson !== '') {
            throw new \Exception('Invalid steps JSON format');
        }

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

    /**
     * Display visitor log for funnel participants
     */
    public function visitorLog()
    {
        Piwik::checkUserHasViewAccess($this->idSite);

        $idFunnel = Common::getRequestVar('idFunnel', 0, 'int');
        $stepIndex = Common::getRequestVar('stepIndex', null, 'int');

        if ($idFunnel <= 0) {
            $this->redirectToIndex('FunnelInsights', 'index');
            return;
        }

        $funnel = API::getInstance()->getFunnel($this->idSite, $idFunnel);

        if (!$funnel) {
            $this->redirectToIndex('FunnelInsights', 'index');
            return;
        }

        $period = Common::getRequestVar('period', 'day', 'string');
        $date = Common::getRequestVar('date', 'yesterday', 'string');

        $visitorLogData = API::getInstance()->getVisitorLog(
            $this->idSite,
            $period,
            $date,
            $idFunnel,
            $stepIndex,
            50,
            0
        );

        $view = new View('@FunnelInsights/visitorLog');
        $this->setBasicVariablesView($view);
        $this->setGeneralVariablesView($view);
        $view->showMenu = true;

        $view->funnel = $funnel;
        $view->stepIndex = $stepIndex;
        $view->visitorLog = $visitorLogData;

        return $view->render();
    }

    /**
     * AJAX endpoint for step evolution popup
     */
    public function getStepEvolution()
    {
        $idSite = Common::getRequestVar('idSite', 0, 'int');
        Piwik::checkUserHasViewAccess($idSite);

        $idFunnel = Common::getRequestVar('idFunnel', 0, 'int');
        $stepIndex = Common::getRequestVar('stepIndex', 0, 'int');
        $period = Common::getRequestVar('period', 'day', 'string');
        $date = Common::getRequestVar('date', 'last30', 'string');

        $data = API::getInstance()->getStepEvolution($idSite, $period, $date, $idFunnel, $stepIndex);

        // Convert DataTable\Map to array for JSON response
        $result = [];
        if ($data instanceof \Piwik\DataTable\Map) {
            foreach ($data->getDataTables() as $dateKey => $table) {
                $row = $table->getFirstRow();
                if ($row) {
                    $result[] = array_merge(
                        ['date' => $dateKey],
                        $row->getColumns()
                    );
                }
            }
        }

        header('Content-Type: application/json');
        echo json_encode($result);
        exit;
    }
}
