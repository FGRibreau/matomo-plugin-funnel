-- Demo data for FunnelInsights screenshots
-- This creates realistic-looking funnels with sample data

-- Clean existing demo data
DELETE FROM matomo_log_funnel WHERE idsite = 1;

-- Insert demo funnels
INSERT INTO matomo_log_funnel (idfunnel, name, idsite, goal_id, steps_json, active, strict_mode, step_time_limit, created_date, updated_date, deleted)
VALUES
(1, 'E-commerce Checkout', 1, NULL,
 '[{"name":"Homepage","conditions":[{"comparison":"path","operator":"equals","pattern":"/"}],"required":false},{"name":"Product Page","conditions":[{"comparison":"path","operator":"starts_with","pattern":"/product/"}],"required":false},{"name":"Add to Cart","conditions":[{"comparison":"event_action","operator":"equals","pattern":"add_to_cart"}],"required":true},{"name":"Cart Review","conditions":[{"comparison":"path","operator":"equals","pattern":"/cart"}],"required":false},{"name":"Checkout Complete","conditions":[{"comparison":"path","operator":"equals","pattern":"/checkout/success"}],"required":true}]',
 1, 0, 0, '2024-12-01 10:00:00', '2025-01-10 12:00:00', 0),

(2, 'User Registration', 1, NULL,
 '[{"name":"Landing Page","conditions":[{"comparison":"path","operator":"equals","pattern":"/signup"}],"required":false},{"name":"Email Verification","conditions":[{"comparison":"path","operator":"equals","pattern":"/verify-email"}],"required":true},{"name":"Profile Setup","conditions":[{"comparison":"path","operator":"equals","pattern":"/profile/setup"}],"required":false},{"name":"Welcome Page","conditions":[{"comparison":"path","operator":"equals","pattern":"/welcome"}],"required":false}]',
 1, 0, 0, '2024-12-15 14:30:00', '2025-01-08 09:15:00', 0),

(3, 'Content Download', 1, NULL,
 '[{"name":"Blog Article","conditions":[{"comparison":"path","operator":"starts_with","pattern":"/blog/"}],"required":false},{"name":"Download Form","conditions":[{"comparison":"path","operator":"equals","pattern":"/resources/download"}],"required":false},{"name":"Thank You","conditions":[{"comparison":"path","operator":"equals","pattern":"/thank-you"}],"required":false}]',
 1, 1, 300, '2024-11-20 08:00:00', '2025-01-05 16:45:00', 0),

(4, 'Support Ticket Flow', 1, NULL,
 '[{"name":"Help Center","conditions":[{"comparison":"path","operator":"equals","pattern":"/help"}],"required":false},{"name":"Contact Form","conditions":[{"comparison":"path","operator":"equals","pattern":"/contact"}],"required":false},{"name":"Ticket Submitted","conditions":[{"comparison":"event_action","operator":"equals","pattern":"ticket_submit"}],"required":true}]',
 0, 0, 0, '2024-10-01 11:00:00', '2024-12-20 14:00:00', 0);

-- Check if archive tables exist and insert demo archived data
-- We'll insert numeric archive data for the funnels

-- Get current date info for archive table naming
SET @archive_table = CONCAT('matomo_archive_numeric_', DATE_FORMAT(NOW(), '%Y_%m'));

-- Insert archive data for "yesterday" period
SET @yesterday = DATE_SUB(CURDATE(), INTERVAL 1 DAY);
SET @period_date = DATE_FORMAT(@yesterday, '%Y-%m-%d');

-- Create archive records if the table exists (we'll use a procedure to handle this)
-- For now, let's check what archive tables exist

-- We need to ensure the archive tables exist first
-- The Archiver will create them, but we can seed with direct inserts

-- First, let's ensure we have some visit data that the funnels can reference
-- Insert fake log_visit entries
INSERT INTO matomo_log_visit (idvisit, idsite, idvisitor, visit_first_action_time, visit_last_action_time, visitor_days_since_first, visitor_returning, visit_total_time, visit_goal_buyer, visit_goal_converted, visitor_count_visits, visit_entry_idaction_url, visit_exit_idaction_url, visit_total_actions, visit_total_interactions, visit_total_searches, referer_type, referer_name, config_browser_name, config_device_type, location_country)
SELECT
    n.num + 100 as idvisit,
    1 as idsite,
    UNHEX(MD5(CONCAT('visitor_', n.num))) as idvisitor,
    DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 30) DAY) as visit_first_action_time,
    DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 30) DAY) + INTERVAL FLOOR(RAND() * 3600) SECOND as visit_last_action_time,
    FLOOR(RAND() * 100) as visitor_days_since_first,
    IF(RAND() > 0.6, 1, 0) as visitor_returning,
    FLOOR(RAND() * 600) as visit_total_time,
    0 as visit_goal_buyer,
    IF(RAND() > 0.7, 1, 0) as visit_goal_converted,
    FLOOR(RAND() * 10) + 1 as visitor_count_visits,
    1 as visit_entry_idaction_url,
    2 as visit_exit_idaction_url,
    FLOOR(RAND() * 15) + 1 as visit_total_actions,
    FLOOR(RAND() * 20) + 1 as visit_total_interactions,
    0 as visit_total_searches,
    IF(RAND() > 0.5, 1, 2) as referer_type,
    ELT(FLOOR(RAND() * 5) + 1, 'Google', 'Facebook', 'Twitter', 'Direct', 'LinkedIn') as referer_name,
    ELT(FLOOR(RAND() * 4) + 1, 'CH', 'FF', 'SF', 'IE') as config_browser_name,
    FLOOR(RAND() * 3) as config_device_type,
    ELT(FLOOR(RAND() * 5) + 1, 'us', 'fr', 'de', 'gb', 'ca') as location_country
FROM (
    SELECT a.N + b.N * 10 as num
    FROM (SELECT 0 AS N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) a,
         (SELECT 0 AS N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) b
) n
WHERE n.num < 50
ON DUPLICATE KEY UPDATE visit_total_actions = visit_total_actions;

-- Insert action URLs for funnel steps
INSERT INTO matomo_log_action (idaction, name, type, url_prefix)
VALUES
(1, '/', 1, 0),
(2, '/product/awesome-widget', 1, 0),
(3, '/cart', 1, 0),
(4, '/checkout/success', 1, 0),
(5, '/signup', 1, 0),
(6, '/verify-email', 1, 0),
(7, '/profile/setup', 1, 0),
(8, '/welcome', 1, 0),
(9, '/blog/getting-started', 1, 0),
(10, '/resources/download', 1, 0),
(11, '/thank-you', 1, 0),
(12, '/help', 1, 0),
(13, '/contact', 1, 0),
(14, 'add_to_cart', 11, 0),
(15, 'ticket_submit', 11, 0)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- The real archive data comes from the Archiver
-- But for screenshots, we can trigger an archive run
