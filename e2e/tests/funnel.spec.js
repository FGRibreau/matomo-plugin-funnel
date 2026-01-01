import { test, expect } from '@playwright/test';

test.describe('Funnel Management', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const matomoUser = process.env.MATOMO_USER || 'matomo_admin';
    const matomoPassword = process.env.MATOMO_PASSWORD || 'matomo_password';
    const idSite = process.env.MATOMO_IDSITE || '1';

    test.beforeEach(async ({ page }) => {
        // Login to Matomo
        await page.goto(`${matomoUrl}/index.php?module=Login&action=login`);
        await page.fill('#login_form input[name="form_login"]', matomoUser);
        await page.fill('#login_form input[name="form_password"]', matomoPassword);
        await page.click('#login_form input[type="submit"]');
        await page.waitForURL(`${matomoUrl}/index.php*`);

        // Navigate to Funnels management
        await page.goto(`${matomoUrl}/index.php?module=Funnels&action=manage&idSite=${idSite}`);
    });

    test('should create a new funnel', async ({ page }) => {
        const funnelName = `Test Funnel ${Date.now()}`;
        const step1Name = 'Landing Page';
        const step1Pattern = '/landing';
        const step2Name = 'Product Page';
        const step2Pattern = '/product/';

        await page.click('text=Add New Funnel');
        await page.fill('input[name="name"]', funnelName);
        
        // Step 1
        await page.click('text=+ Add Step');
        await page.fill('.step-card:nth-child(1) input[placeholder="e.g. Landing Page"]', step1Name);
        await page.fill('.step-card:nth-child(1) input[placeholder="value to match"]', step1Pattern);

        // Step 2
        await page.click('text=+ Add Step'); // Add second step
        await page.fill('.step-card:nth-child(2) input[placeholder="e.g. Landing Page"]', step2Name);
        await page.fill('.step-card:nth-child(2) input[placeholder="value to match"]', step2Pattern);

        // Enable Strict Mode and set a Time Limit (new options)
        await page.locator('input[name="strict_mode"]').check();
        await page.fill('input[name="step_time_limit"]', '300'); // 5 minutes

        await page.click('button[type="submit"]:text("Save")');

        await page.waitForURL(`${matomoUrl}/index.php*module=Funnels&action=manage*`);
        await expect(page.locator('.table-bordered')).toContainText(funnelName);
        await expect(page.locator('.table-bordered')).toContainText('Active'); // Default to active
    });

    test('should validate funnel steps', async ({ page }) => {
        const funnelName = `Validation Test ${Date.now()}`;
        const stepName = 'Test Page';
        const pattern = '/testpage';
        const testUrl = '/testpage?param=1';

        await page.click('text=Add New Funnel');
        await page.fill('input[name="name"]', funnelName);
        
        await page.click('text=+ Add Step');
        await page.fill('.step-card:nth-child(1) input[placeholder="e.g. Landing Page"]', stepName);
        await page.fill('.step-card:nth-child(1) select[v-model="condition.comparison"]', 'url');
        await page.fill('.step-card:nth-child(1) input[placeholder="value to match"]', pattern);
        // Check ignore query params
        await page.locator('.step-card:nth-child(1) input[type="checkbox"][v-model="condition.ignore_query_params"]').check();

        // Use the validator section
        await page.fill('input[placeholder="http://example.com/checkout"]', testUrl);
        await page.click('button:text("Test")');

        await expect(page.locator('.validation-results')).toContainText('MATCH');

        // Change pattern to break match
        await page.fill('.step-card:nth-child(1) input[placeholder="value to match"]', '/nomatch');
        await page.click('button:text("Test")');
        await expect(page.locator('.validation-results')).toContainText('No Match');
    });

    test('should duplicate a funnel', async ({ page }) => {
        const originalFunnelName = `Original Funnel ${Date.now()}`;
        await page.click('text=Add New Funnel');
        await page.fill('input[name="name"]', originalFunnelName);
        await page.click('button[type="submit"]:text("Save")');
        await page.waitForURL(`${matomoUrl}/index.php*module=Funnels&action=manage*`);

        // Find the original funnel row and click duplicate
        const row = page.locator(".table-bordered tbody tr:has-text("${originalFunnelName}")");
        await row.locator('text=Duplicate').click();
        await page.waitForURL(`${matomoUrl}/index.php*module=Funnels&action=manage*`);

        await expect(page.locator(".table-bordered tbody tr:has-text("${originalFunnelName} (Copy)")")).toBeVisible();
    });
});
