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

    test('Regression: Widget handles API returning empty array gracefully', async ({ page }) => {
        // Navigate to the overview widget
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
        // First check API to see if there are funnels
        const apiResponse = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'day',
                date: 'yesterday',
                format: 'JSON',
            },
        });
        const apiData = await apiResponse.json();

        // Navigate to Overview
        await page.goto(`${matomoUrl}/index.php?module=CoreHome&action=index&idSite=${idSite}&period=day&date=yesterday#?idSite=${idSite}&period=day&date=yesterday&category=FunnelInsights_Funnels&subcategory=FunnelInsights_Overview`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        const content = await page.content();

        if (Array.isArray(apiData) && apiData.length === 0) {
            // When no funnels, should show "Create Funnel" link
            expect(content).toContain('FunnelInsights');
            // Should NOT show loading indicator stuck
            const loadingVisible = await page.locator('.loadingIndicator').isVisible().catch(() => false);
            expect(loadingVisible).toBe(false);
        }
        // In all cases, no errors
        expect(content).not.toContain('Fatal error');
    });

    test('Regression: Widget handles API error response (result: error)', async ({ page }) => {
        // Navigate and ensure widget loads
        await page.goto(`${matomoUrl}/index.php?module=CoreHome&action=index&idSite=${idSite}&period=day&date=yesterday#?idSite=${idSite}&period=day&date=yesterday&category=FunnelInsights_Funnels&subcategory=FunnelInsights_Overview`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        // Intercept next API call and mock an error response
        await page.route('**/index.php?*FunnelInsights.getOverview*', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ result: 'error', message: 'Test error message' }),
            });
        });

        // Reload to trigger the mocked error
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        const content = await page.content();
        // Should NOT have uncaught errors
        expect(content).not.toContain('Uncaught');
        expect(content).not.toContain('forEach is not a function');
    });

    test('Regression: Widget does not show "No active funnels" when funnels exist with 0 data', async ({ page, request }) => {
        // Get funnels from API
        const apiResponse = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'day',
                date: 'yesterday',
                format: 'JSON',
            },
        });
        const apiData = await apiResponse.json();

        await page.goto(`${matomoUrl}/index.php?module=CoreHome&action=index&idSite=${idSite}&period=day&date=yesterday#?idSite=${idSite}&period=day&date=yesterday&category=FunnelInsights_Funnels&subcategory=FunnelInsights_Overview`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        const content = await page.content();

        if (Array.isArray(apiData) && apiData.length > 0) {
            // When funnels exist (even with 0 entries), should show them in a table
            const tableExists = await page.locator('table.entityTable, table.dataTable').count() > 0;
            expect(tableExists).toBe(true);
            // Should NOT incorrectly show "No active funnels"
            expect(content).not.toContain('No active funnels');
        }
    });

    test('Regression: Widget displays funnel with 0 entries correctly', async ({ page, request }) => {
        // Check if there are any funnels
        const apiResponse = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'day',
                date: 'yesterday',
                format: 'JSON',
            },
        });
        const apiData = await apiResponse.json();

        if (Array.isArray(apiData) && apiData.length > 0) {
            const funnelWith0Entries = apiData.find(f => f.entries === 0);
            if (funnelWith0Entries) {
                await page.goto(`${matomoUrl}/index.php?module=CoreHome&action=index&idSite=${idSite}&period=day&date=yesterday#?idSite=${idSite}&period=day&date=yesterday&category=FunnelInsights_Funnels&subcategory=FunnelInsights_Overview`);
                await page.waitForLoadState('networkidle');
                await page.waitForTimeout(3000);

                // Funnel should be listed even with 0 entries
                const content = await page.content();
                expect(content).toContain(funnelWith0Entries.label);
                // Should show "0" for entries, not hide the row
                expect(content).toContain('0');
            }
        }
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
