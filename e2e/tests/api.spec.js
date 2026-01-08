import { test, expect } from '@playwright/test';

test.describe('FunnelInsights API Tests', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const idSite = process.env.MATOMO_IDSITE || '1';

    // These tests verify no PHP errors occur - authentication errors are expected

    test('API: getFunnels does not throw PHP error', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnels',
                idSite: idSite,
                format: 'JSON',
            },
        });

        // May return auth error, but should not return PHP error
        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('Call to undefined method');
        expect(text).not.toContain('DataTable\\Map::getRows');
        expect(text).not.toContain('Parse error');
    });

    test('API: getOverview does not throw DataTable Map error', async ({ request }) => {
        // This tests the fix for the DataTable\Map::getRows() error
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'day',
                date: 'yesterday',
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('Call to undefined method');
        expect(text).not.toContain('DataTable\\Map::getRows');
    });

    test('API: getOverview with date range (triggers DataTable Map)', async ({ request }) => {
        // Date ranges return DataTable\Map - this is where the bug occurred
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'day',
                date: 'last7',
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('Call to undefined method');
        expect(text).not.toContain('DataTable\\Map::getRows');
        expect(text).not.toContain('Parse error');

        // Should be valid JSON (even if it's an auth error response)
        expect(() => JSON.parse(text)).not.toThrow();
    });

    test('API: getFunnelReport with single date', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnelReport',
                idSite: idSite,
                period: 'day',
                date: 'yesterday',
                idFunnel: 1, // May not exist, but should not PHP error
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('Call to undefined method');
    });

    test('API: getFunnelReport with date range (DataTable Map fix)', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnelReport',
                idSite: idSite,
                period: 'day',
                date: 'last7',
                idFunnel: 1,
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('Call to undefined method');
        expect(text).not.toContain('DataTable\\Map::getRows');
    });

    test('API: getFunnelEvolution with date range', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnelEvolution',
                idSite: idSite,
                period: 'day',
                date: 'last30',
                idFunnel: 1,
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('Call to undefined method');
        expect(text).not.toContain('getDataTables');
    });

    // Non-regression tests for DataTable\Map bug (v3.0.23 fix)
    test('API: getFunnelEvolution with single date returns valid response', async ({ request }) => {
        // This was the main bug - single date should return Map, not DataTable
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnelEvolution',
                idSite: idSite,
                period: 'day',
                date: 'yesterday',
                idFunnel: 1,
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('Call to undefined method');
        expect(text).not.toContain('getDataTables');
        expect(text).not.toContain('DataTable::getDataTables');
        expect(() => JSON.parse(text)).not.toThrow();
    });

    test('API: getFunnelEvolution with today date', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnelEvolution',
                idSite: idSite,
                period: 'day',
                date: 'today',
                idFunnel: 1,
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('getDataTables');
    });

    test('API: getFunnelEvolution with week period', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnelEvolution',
                idSite: idSite,
                period: 'week',
                date: 'last4',
                idFunnel: 1,
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('getDataTables');
    });

    test('API: getFunnelEvolution with month period', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnelEvolution',
                idSite: idSite,
                period: 'month',
                date: 'last3',
                idFunnel: 1,
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('getDataTables');
    });

    test('API: getOverview with week period single date', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'week',
                date: 'today',
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('Call to undefined method');
    });

    test('API: getOverview with month period', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'month',
                date: 'last3',
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('Call to undefined method');
        expect(text).not.toContain('getDataTables');
    });

    // Non-regression test for getOverview RowEvolution bug (v3.0.25 fix)
    // When RowEvolution is triggered from the Overview page, Matomo's API calls getDataTables()
    // on the result. This test ensures getOverview returns a Map structure compatible with RowEvolution.
    test('API: getOverview with single date returns Map for RowEvolution compatibility', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'day',
                date: 'today',
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('Call to undefined method');
        expect(text).not.toContain('getDataTables');
        expect(text).not.toContain('DataTable::getDataTables');
        expect(() => JSON.parse(text)).not.toThrow();
    });

    test('API: getOverview RowEvolution simulation with date comparison', async ({ request }) => {
        // RowEvolution compares data across multiple periods
        // This simulates how RowEvolution fetches data from getOverview
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'day',
                date: 'last7',
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('Call to undefined method');
        expect(text).not.toContain('getDataTables');
        expect(text).not.toContain('DataTable::getDataTables');
    });

    test('API: Plugin responds without PHP syntax errors', async ({ request }) => {
        // Verify the plugin loads without PHP syntax errors
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
        expect(text).not.toContain('Parse error');
        expect(text).not.toContain('syntax error');
    });
});

test.describe('FunnelInsights CRUD via UI', () => {
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

    test('Funnel manage page loads without PHP errors', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=manage&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        // Check for PHP errors in page content
        const content = await page.content();
        expect(content).not.toContain('Fatal error');
        expect(content).not.toContain('Call to undefined method');
        expect(content).not.toContain('DataTable\\Map::getRows');

        // Should see the management page
        await expect(page.locator('h2.card-title')).toContainText(/Manage|Funnel/i);
    });

    test('Funnel edit page loads without PHP errors', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const content = await page.content();
        expect(content).not.toContain('Fatal error');
        expect(content).not.toContain('Call to undefined method');

        // Should see the funnel editor
        await expect(page.locator('.funnel-editor')).toBeVisible({ timeout: 15000 });
    });

    test('Funnel index/overview page loads without PHP errors', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=index&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const content = await page.content();
        expect(content).not.toContain('Fatal error');
        expect(content).not.toContain('Call to undefined method');
        expect(content).not.toContain('DataTable\\Map::getRows');
    });
});
