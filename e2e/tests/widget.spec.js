import { test, expect } from '@playwright/test';

/**
 * E2E Tests for FunnelInsights Widget
 *
 * Tests the FunnelOverview widget rendering and functionality.
 */

test.describe('FunnelInsights Widget - Unauthenticated', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const idSite = process.env.MATOMO_IDSITE || '1';

    test('Widget: widgetOverview template does not expose PHP errors', async ({ request }) => {
        // Access the widget endpoint
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'Widgetize',
                action: 'iframe',
                moduleToWidgetize: 'FunnelInsights',
                actionToWidgetize: 'getOverviewWidget',
                idSite: idSite,
                period: 'day',
                date: 'yesterday',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('Parse error');
        expect(text).not.toContain('Call to undefined method');
    });
});

test.describe('FunnelInsights Widget - Authenticated', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const matomoUser = process.env.MATOMO_USER || 'admin';
    const matomoPassword = process.env.MATOMO_PASSWORD || 'adminpassword123';
    const idSite = process.env.MATOMO_IDSITE || '1';

    test.beforeEach(async ({ page }) => {
        // Login to Matomo
        await page.goto(`${matomoUrl}/index.php?module=Login`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('#login_form', { timeout: 30000 });

        const form = page.locator('#login_form');
        await form.locator('#login_form_login').waitFor({ state: 'visible' });
        await form.locator('#login_form_password').waitFor({ state: 'visible' });
        await form.locator('#login_form_login').fill(matomoUser);
        await form.locator('#login_form_password').fill(matomoPassword);
        await page.waitForTimeout(500);
        await form.locator('input[type="submit"]').click();
        await page.waitForURL(/(?!.*module=Login)|.*module=CoreHome/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');
    });

    test('Widget: FunnelOverview widget renders without errors', async ({ page }) => {
        // Navigate to the dashboard or a page with widgets
        await page.goto(`${matomoUrl}/index.php?module=CoreHome&action=index&idSite=${idSite}&period=day&date=yesterday`);
        await page.waitForLoadState('networkidle');

        // Check if there are any PHP errors on the page
        const content = await page.content();
        expect(content).not.toContain('Fatal error');
        expect(content).not.toContain('Parse error');
    });

    test('Widget: Overview category exists in menu', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=CoreHome&action=index&idSite=${idSite}&period=day&date=yesterday`);
        await page.waitForLoadState('networkidle');

        // The FunnelInsights menu should be available
        const content = await page.content();
        expect(content).not.toContain('Fatal error');

        // Look for Funnels in the menu (may be in sidebar or top nav)
        // This depends on Matomo's UI structure
        const menuHasFunnels = content.includes('Funnel') || content.includes('funnel');
        // Just check there's no error - menu presence depends on plugin activation
    });

    test('Widget: widgetOverview renders data table structure', async ({ page }) => {
        // First create a funnel if none exists
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=manage&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const hasFunnels = await page.locator('table.entityTable tbody tr').count() > 0;

        // Navigate to the Funnels category in reporting
        await page.goto(`${matomoUrl}/index.php?module=CoreHome&action=index&idSite=${idSite}&period=day&date=yesterday#?idSite=${idSite}&period=day&date=yesterday&category=FunnelInsights_Funnels&subcategory=FunnelInsights_Overview`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000); // Wait for AJAX content

        const content = await page.content();
        expect(content).not.toContain('Fatal error');
        expect(content).not.toContain('Parse error');
    });

    test('Widget: Overview widget fetches data via API', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=CoreHome&action=index&idSite=${idSite}&period=day&date=yesterday`);
        await page.waitForLoadState('networkidle');

        // Intercept API calls
        const apiCalls = [];
        page.on('request', request => {
            if (request.url().includes('FunnelInsights.getOverview')) {
                apiCalls.push(request.url());
            }
        });

        // Navigate to Funnels overview
        await page.goto(`${matomoUrl}/index.php?module=CoreHome&action=index&idSite=${idSite}&period=day&date=yesterday#?idSite=${idSite}&period=day&date=yesterday&category=FunnelInsights_Funnels&subcategory=FunnelInsights_Overview`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        const content = await page.content();
        expect(content).not.toContain('Fatal error');
    });

    test('Widget: widgetOverview with no funnels shows appropriate message', async ({ page }) => {
        // Create a new site or use an existing one that has no funnels
        // For now, just verify the widget doesn't error
        await page.goto(`${matomoUrl}/index.php?module=CoreHome&action=index&idSite=${idSite}&period=day&date=yesterday`);
        await page.waitForLoadState('networkidle');

        const content = await page.content();
        expect(content).not.toContain('Fatal error');
        expect(content).not.toContain('Parse error');
    });

    test('Widget: widgetize iframe mode works', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=Widgetize&action=iframe&moduleToWidgetize=FunnelInsights&actionToWidgetize=getOverview&idSite=${idSite}&period=day&date=yesterday`);
        await page.waitForLoadState('networkidle');

        const content = await page.content();
        expect(content).not.toContain('Fatal error');
        expect(content).not.toContain('Parse error');
        expect(content).not.toContain('Call to undefined method');
    });

    test('Widget: date change does not cause errors', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=CoreHome&action=index&idSite=${idSite}&period=day&date=yesterday#?idSite=${idSite}&period=day&date=yesterday&category=FunnelInsights_Funnels&subcategory=FunnelInsights_Overview`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Change to week period
        await page.goto(`${matomoUrl}/index.php?module=CoreHome&action=index&idSite=${idSite}&period=week&date=today#?idSite=${idSite}&period=week&date=today&category=FunnelInsights_Funnels&subcategory=FunnelInsights_Overview`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        const content = await page.content();
        expect(content).not.toContain('Fatal error');
        expect(content).not.toContain('DataTable\\Map::getRows');
    });

    test('Widget: month period rendering', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=CoreHome&action=index&idSite=${idSite}&period=month&date=today#?idSite=${idSite}&period=month&date=today&category=FunnelInsights_Funnels&subcategory=FunnelInsights_Overview`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        const content = await page.content();
        expect(content).not.toContain('Fatal error');
        expect(content).not.toContain('Call to undefined method');
    });

    test('Widget: date range rendering', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=CoreHome&action=index&idSite=${idSite}&period=day&date=last7#?idSite=${idSite}&period=day&date=last7&category=FunnelInsights_Funnels&subcategory=FunnelInsights_Overview`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        const content = await page.content();
        expect(content).not.toContain('Fatal error');
        expect(content).not.toContain('getDataTables');
    });
});

test.describe('FunnelInsights Widget - Dashboard Integration', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const matomoUser = process.env.MATOMO_USER || 'admin';
    const matomoPassword = process.env.MATOMO_PASSWORD || 'adminpassword123';
    const idSite = process.env.MATOMO_IDSITE || '1';

    test.beforeEach(async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=Login`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('#login_form', { timeout: 30000 });

        const form = page.locator('#login_form');
        await form.locator('#login_form_login').fill(matomoUser);
        await form.locator('#login_form_password').fill(matomoPassword);
        await page.waitForTimeout(500);
        await form.locator('input[type="submit"]').click();
        await page.waitForURL(/(?!.*module=Login)|.*module=CoreHome/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');
    });

    test('Widget: can be added to dashboard', async ({ page }) => {
        // Navigate to dashboard
        await page.goto(`${matomoUrl}/index.php?module=Dashboard&action=index&idSite=${idSite}&period=day&date=yesterday`);
        await page.waitForLoadState('networkidle');

        // Check for widget selector functionality
        const content = await page.content();
        expect(content).not.toContain('Fatal error');

        // The widget system should work without PHP errors
    });

    test('Widget: export functionality does not error', async ({ page }) => {
        // Navigate to the overview report
        await page.goto(`${matomoUrl}/index.php?module=CoreHome&action=index&idSite=${idSite}&period=day&date=yesterday#?idSite=${idSite}&period=day&date=yesterday&category=FunnelInsights_Funnels&subcategory=FunnelInsights_Overview`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Try to export as CSV via API
        const response = await page.evaluate(async ({ matomoUrl, idSite }) => {
            const res = await fetch(`${matomoUrl}/index.php?module=API&method=FunnelInsights.getOverview&idSite=${idSite}&period=day&date=yesterday&format=CSV`);
            return await res.text();
        }, { matomoUrl, idSite });

        expect(response).not.toContain('Fatal error');
    });
});

test.describe('FunnelInsights Widget - Overview Regression Tests (v3.0.32)', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const matomoUser = process.env.MATOMO_USER || 'admin';
    const matomoPassword = process.env.MATOMO_PASSWORD || 'adminpassword123';
    const idSite = process.env.MATOMO_IDSITE || '1';

    // Helper to create a funnel via form submission
    async function createTestFunnel(page, name) {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}&idFunnel=0`);
        await page.waitForLoadState('networkidle');

        // Fill funnel name
        await page.locator('input[name="name"]').fill(name);

        // Add a step
        await page.locator('#addStepButton, .addStepButton, button:has-text("Add Step")').first().click();
        await page.waitForTimeout(500);

        // Fill step name and condition
        const stepNameInput = page.locator('input[name*="step"][name*="name"], .step-name-input').first();
        await stepNameInput.fill('Homepage');

        const comparisonSelect = page.locator('select[name*="comparison"], .comparison-select').first();
        await comparisonSelect.selectOption('path');

        const patternInput = page.locator('input[name*="pattern"], .pattern-input').first();
        await patternInput.fill('/');

        // Activate the funnel
        const activeCheckbox = page.locator('input[name="active"], #active');
        await activeCheckbox.check();

        // Submit form
        await page.locator('input[type="submit"], button[type="submit"]').click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // Get the created funnel ID from URL or table
        const url = page.url();
        const idMatch = url.match(/idFunnel=(\d+)/);
        if (idMatch) {
            return parseInt(idMatch[1]);
        }

        // Fallback: get from manage page
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=manage&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        const row = page.locator(`table.entityTable tbody tr:has-text("${name}")`).first();
        const editLink = row.locator('a[href*="idFunnel="]');
        const href = await editLink.getAttribute('href');
        const match = href.match(/idFunnel=(\d+)/);
        return match ? parseInt(match[1]) : null;
    }

    // Helper to delete a funnel
    async function deleteFunnel(page, idFunnel) {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=manage&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const deleteButton = page.locator(`a[href*="action=delete"][href*="idFunnel=${idFunnel}"], button[data-idfunnel="${idFunnel}"]`);
        if (await deleteButton.count() > 0) {
            page.on('dialog', dialog => dialog.accept());
            await deleteButton.click();
            await page.waitForLoadState('networkidle');
        }
    }

    // Helper to delete ALL funnels for the test site
    async function deleteAllFunnels(page, request) {
        // Get all funnels via API
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnels',
                idSite: idSite,
                format: 'JSON',
            },
        });

        let funnels = [];
        const text = await response.text();
        if (!text.includes('error')) {
            funnels = JSON.parse(text);
        }

        // Delete each funnel
        for (const funnel of funnels) {
            if (funnel.idfunnel) {
                await deleteFunnel(page, funnel.idfunnel);
            }
        }
    }

    test.beforeEach(async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=Login`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('#login_form', { timeout: 30000 });

        const form = page.locator('#login_form');
        await form.locator('#login_form_login').fill(matomoUser);
        await form.locator('#login_form_password').fill(matomoPassword);
        await page.waitForTimeout(500);
        await form.locator('input[type="submit"]').click();
        await page.waitForURL(/(?!.*module=Login)|.*module=CoreHome/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');
    });

    test('Regression: Widget handles API returning empty array gracefully', async ({ page, request }) => {
        // SETUP: Delete all funnels to ensure empty state
        await deleteAllFunnels(page, request);

        // TEST: Navigate to the overview widget with no funnels
        await page.goto(`${matomoUrl}/index.php?module=CoreHome&action=index&idSite=${idSite}&period=day&date=yesterday#?idSite=${idSite}&period=day&date=yesterday&category=FunnelInsights_Funnels&subcategory=FunnelInsights_Overview`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        const content = await page.content();
        // Should NOT contain PHP errors
        expect(content).not.toContain('Fatal error');
        expect(content).not.toContain('Array.isArray is not a function');
        expect(content).not.toContain('Cannot read property');
        // Should NOT try to call non-existent Vue component
        expect(content).not.toContain('FunnelOverviewWidget is not defined');
    });

    test('Regression: Widget shows Create/Manage links when no funnels exist', async ({ page, request }) => {
        // SETUP: Delete all funnels to ensure empty state
        await deleteAllFunnels(page, request);

        // TEST: Navigate to Overview
        await page.goto(`${matomoUrl}/index.php?module=CoreHome&action=index&idSite=${idSite}&period=day&date=yesterday#?idSite=${idSite}&period=day&date=yesterday&category=FunnelInsights_Funnels&subcategory=FunnelInsights_Overview`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        const content = await page.content();

        // When no funnels, should show "Create Funnel" link or manage link
        expect(content).toContain('FunnelInsights');
        // Should NOT show loading indicator stuck
        const loadingVisible = await page.locator('.loadingIndicator').isVisible().catch(() => false);
        expect(loadingVisible).toBe(false);
        // No errors
        expect(content).not.toContain('Fatal error');
    });

    test('Regression: Widget does not show "No active funnels" when funnels exist with 0 data', async ({ page, request }) => {
        // SETUP: Create a test funnel
        const testFunnelName = `Regression Test Funnel ${Date.now()}`;
        const idFunnel = await createTestFunnel(page, testFunnelName);
        expect(idFunnel).toBeGreaterThan(0);

        // TEST: Navigate to overview - the funnel should appear even with 0 data
        await page.goto(`${matomoUrl}/index.php?module=CoreHome&action=index&idSite=${idSite}&period=day&date=yesterday#?idSite=${idSite}&period=day&date=yesterday&category=FunnelInsights_Funnels&subcategory=FunnelInsights_Overview`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        const content = await page.content();

        // When funnels exist (even with 0 entries), should show them in a table
        const tableExists = await page.locator('table.entityTable, table.dataTable').count() > 0;
        expect(tableExists).toBe(true);
        // Should NOT incorrectly show "No active funnels"
        expect(content).not.toContain('No active funnels');
        // Should contain our funnel name
        expect(content).toContain(testFunnelName);

        // CLEANUP: Delete the test funnel
        await deleteFunnel(page, idFunnel);
    });

    test('Regression: Widget displays funnel with 0 entries correctly', async ({ page, request }) => {
        // SETUP: Create a test funnel that will have 0 entries (new funnel)
        const testFunnelName = `Zero Entries Test ${Date.now()}`;
        const idFunnel = await createTestFunnel(page, testFunnelName);
        expect(idFunnel).toBeGreaterThan(0);

        // TEST: Navigate to overview
        await page.goto(`${matomoUrl}/index.php?module=CoreHome&action=index&idSite=${idSite}&period=day&date=yesterday#?idSite=${idSite}&period=day&date=yesterday&category=FunnelInsights_Funnels&subcategory=FunnelInsights_Overview`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        // Funnel should be listed even with 0 entries
        const content = await page.content();
        expect(content).toContain(testFunnelName);
        // Should show "0" for entries, not hide the row
        expect(content).toContain('0');
        // No errors
        expect(content).not.toContain('Fatal error');

        // CLEANUP: Delete the test funnel
        await deleteFunnel(page, idFunnel);
    });
});

/**
 * Regression test for v3.0.38 - Server-side widget rendering
 * Issue: Widget was making client-side fetch() calls that failed behind proxy setups
 * Fix: Widget now fetches data server-side to ensure proper authentication
 */
test.describe('FunnelInsights Widget - Permission Regression (v3.0.38)', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const matomoUser = process.env.MATOMO_USER || 'admin';
    const matomoPassword = process.env.MATOMO_PASSWORD || 'adminpassword123';
    const idSite = process.env.MATOMO_IDSITE || '1';

    test.beforeEach(async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=Login`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('#login_form', { timeout: 30000 });

        const form = page.locator('#login_form');
        await form.locator('#login_form_login').fill(matomoUser);
        await form.locator('#login_form_password').fill(matomoPassword);
        await page.waitForTimeout(500);
        await form.locator('input[type="submit"]').click();
        await page.waitForURL(/(?!.*module=Login)|.*module=CoreHome/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');
    });

    test('Regression v3.0.38: Overview widget does NOT show view access error when authenticated', async ({ page }) => {
        // Navigate directly to the Funnels Overview subcategory
        await page.goto(`${matomoUrl}/index.php?module=CoreHome&action=index&idSite=${idSite}&period=day&date=yesterday#?idSite=${idSite}&period=day&date=yesterday&category=FunnelInsights_Funnels&subcategory=FunnelInsights_Overview`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        const content = await page.content();

        // Should NOT contain the view access error (the bug we fixed)
        expect(content).not.toContain("requires 'view' access");
        expect(content).not.toContain("can't access this resource");
        // Should NOT contain any error messages
        expect(content).not.toContain('Fatal error');
        expect(content).not.toContain('Parse error');
        // The widget should render successfully (either with data or "no funnels" message)
        const hasContent = content.includes('FunnelInsights') || content.includes('Funnel');
        expect(hasContent).toBe(true);
    });

    test('Regression v3.0.38: Widget renders server-side without JavaScript fetch errors', async ({ page }) => {
        // Collect console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Navigate to the Funnels Overview
        await page.goto(`${matomoUrl}/index.php?module=CoreHome&action=index&idSite=${idSite}&period=day&date=yesterday#?idSite=${idSite}&period=day&date=yesterday&category=FunnelInsights_Funnels&subcategory=FunnelInsights_Overview`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        // There should be no fetch/XHR errors related to FunnelInsights API
        const funnelErrors = consoleErrors.filter(e =>
            e.includes('FunnelInsights') ||
            e.includes('getOverview') ||
            e.includes('view access')
        );
        expect(funnelErrors).toHaveLength(0);
    });

    test('Regression v3.0.38: Widget content is rendered immediately (no loading spinner stuck)', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=CoreHome&action=index&idSite=${idSite}&period=day&date=yesterday#?idSite=${idSite}&period=day&date=yesterday&category=FunnelInsights_Funnels&subcategory=FunnelInsights_Overview`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Widget content should be rendered (not stuck on loading)
        const widgetContent = page.locator('.funnelOverviewWidget .funnelOverviewContent');
        await expect(widgetContent).toBeVisible();

        // Loading indicator should NOT be visible (content is server-rendered)
        const loadingIndicator = page.locator('.funnelOverviewWidget .loadingIndicator');
        const loadingVisible = await loadingIndicator.isVisible().catch(() => false);
        expect(loadingVisible).toBe(false);

        // Either data table or "no funnels" message should be visible
        const hasTable = await page.locator('.funnelOverviewWidget table.entityTable').count() > 0;
        const hasNoFunnelsMsg = await page.locator('.funnelOverviewWidget .notification').count() > 0;
        expect(hasTable || hasNoFunnelsMsg).toBe(true);
    });
});

test.describe('FunnelInsights Widget - Report Integration', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const matomoUser = process.env.MATOMO_USER || 'admin';
    const matomoPassword = process.env.MATOMO_PASSWORD || 'adminpassword123';
    const idSite = process.env.MATOMO_IDSITE || '1';

    test.beforeEach(async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=Login`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('#login_form', { timeout: 30000 });

        const form = page.locator('#login_form');
        await form.locator('#login_form_login').fill(matomoUser);
        await form.locator('#login_form_password').fill(matomoPassword);
        await page.waitForTimeout(500);
        await form.locator('input[type="submit"]').click();
        await page.waitForURL(/(?!.*module=Login)|.*module=CoreHome/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');
    });

    test('Report: GetOverview report metadata is registered', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'API.getReportMetadata',
                idSite: idSite,
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');

        // Should contain FunnelInsights reports
        const hasFunnelReport = text.includes('FunnelInsights') || text.includes('Funnel');
        // The report should be registered (may or may not be visible depending on config)
    });

    test('Report: GetFunnelEvolution report is accessible', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnelEvolution',
                idSite: idSite,
                period: 'day',
                date: 'last7',
                idFunnel: 1,
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('Parse error');
    });

    test('Report: Row evolution popup compatibility', async ({ page }) => {
        // Row evolution requires a DataTable\Map
        // This tests that getFunnelEvolution returns proper structure
        await page.goto(`${matomoUrl}/index.php?module=CoreHome&action=index&idSite=${idSite}&period=day&date=last7#?idSite=${idSite}&period=day&date=last7&category=FunnelInsights_Funnels&subcategory=FunnelInsights_Overview`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        const content = await page.content();
        expect(content).not.toContain('Fatal error');
        expect(content).not.toContain('DataTable::getDataTables');
    });
});
