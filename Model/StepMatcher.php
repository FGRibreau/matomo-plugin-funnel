<?php

namespace Piwik\Plugins\FunnelInsights\Model;

class StepMatcher
{
    /**
     * Matches a step configuration against a hit (action).
     * Supports legacy single-condition steps and new multi-condition (OR logic) steps.
     * 
     * @param array $step The step configuration.
     * @param array $hit The hit data (url, pageTitle, etc).
     * @return bool True if matched, False otherwise.
     */
    public function match($step, $hit)
    {
        // Support for "OR" logic: if 'conditions' array exists, match ANY of them.
        if (isset($step['conditions']) && is_array($step['conditions']) && !empty($step['conditions'])) {
            foreach ($step['conditions'] as $condition) {
                if ($this->matchSingleCondition($condition, $hit)) {
                    return true;
                }
            }
            return false;
        }

        // Fallback: Legacy single condition support
        return $this->matchSingleCondition($step, $hit);
    }

    private function matchSingleCondition($config, $hit)
    {
        $comparison = isset($config['comparison']) ? $config['comparison'] : '';
        $pattern = isset($config['pattern']) ? $config['pattern'] : '';
        $operator = isset($config['operator']) ? $config['operator'] : 'equals';
        $caseSensitive = isset($config['case_sensitive']) && $config['case_sensitive'];
        $ignoreQueryParams = isset($config['ignore_query_params']) && $config['ignore_query_params'];

        $valueToCheck = '';

        switch ($comparison) {
            case 'url':
                $valueToCheck = isset($hit['url']) ? $hit['url'] : '';
                if ($ignoreQueryParams) {
                    // Remove query string from URL
                    $parts = explode('?', $valueToCheck);
                    $valueToCheck = $parts[0];
                }
                break;
            case 'path':
                $url = isset($hit['url']) ? $hit['url'] : '';
                $parsed = parse_url($url);
                $valueToCheck = isset($parsed['path']) ? $parsed['path'] : '';
                break;
            case 'search_query':
                $valueToCheck = isset($hit['search_term']) ? $hit['search_term'] : '';
                break;
            case 'title':
            case 'page_title':
                $valueToCheck = isset($hit['pageTitle']) ? $hit['pageTitle'] : '';
                break;
            case 'event_category':
                $valueToCheck = isset($hit['eventCategory']) ? $hit['eventCategory'] : '';
                break;
            case 'event_action':
                $valueToCheck = isset($hit['eventAction']) ? $hit['eventAction'] : '';
                break;
            case 'event_name':
            case 'event_value': 
                $valueToCheck = isset($hit['eventName']) ? $hit['eventName'] : '';
                break;
            default:
                return false;
        }

        return $this->checkCondition($valueToCheck, $operator, $pattern, $caseSensitive);
    }

    private function checkCondition($value, $operator, $pattern, $caseSensitive)
    {
        $value = (string)$value;
        $pattern = (string)$pattern;

        if (!$caseSensitive) {
            $value = mb_strtolower($value);
            $pattern = mb_strtolower($pattern);
        }

        switch ($operator) {
            case 'equals':
                return $value === $pattern;
            case 'not_equals':
                return $value !== $pattern;
            
            case 'contains':
                return strpos($value, $pattern) !== false;
            case 'not_contains':
                return strpos($value, $pattern) === false;
            
            case 'starts_with':
            case 'starts with':
                if ($pattern === '') return true;
                return strpos($value, $pattern) === 0;
            case 'not_starts_with':
                if ($pattern === '') return false;
                return strpos($value, $pattern) !== 0;

            case 'ends_with':
            case 'ends with':
                if ($pattern === '') return true;
                return substr($value, -strlen($pattern)) === $pattern;
            case 'not_ends_with':
                if ($pattern === '') return false;
                return substr($value, -strlen($pattern)) !== $pattern;

            case 'matches regular expression':
            case 'regex':
                // Improve Robustness: Handle invalid regex gracefully (#29)
                // Restore case sensitivity for regex if user wanted it (regex handles its own flags usually, 
                // but if we lowercased above, we might have broken strict regex. 
                // However, for consistency, if 'case_sensitive' is false, we run regex on lowercased string).
                // A better approach for Regex is usually to let the modifier 'i' handle it, but here we normalized the input.
                return $this->safeRegexMatch($pattern, $value);

            default:
                // Wildcard fallback support for standard operators if strictly needed, 
                // but usually 'contains' covers simple wildcards. 
                // If we want explicit '*' support in 'equals' like shell globbing:
                if (strpos($pattern, '*') !== false && $operator === 'equals') {
                    $regex = '/^' . str_replace('*', '.*', preg_quote($pattern, '/')) . '$/';
                    return $this->safeRegexMatch($regex, $value);
                }
                return false;
        }
    }

    private function safeRegexMatch($pattern, $subject)
    {
        // Suppress warnings for invalid regex
        $result = @preg_match($pattern, $subject);
        if ($result === false) {
            // Log error in debug mode if needed?
            return false;
        }
        return $result === 1;
    }
}