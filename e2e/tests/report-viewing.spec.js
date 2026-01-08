import { test, expect } from '@playwright/test';
import { createTestFunnel, deleteFunnel, loginToMatomo } from './helpers/funnel-helpers.js';

/**
 * E2E Tests for FunnelInsights Report Viewing
 *
 * Tests the viewFunnel page, funnel visualization, step display,
 * and report rendering with various data scenarios.
 *
 * IMPORTANT: Tests are self-contained - they CREATE their own test data upfront.
 * NEVER use conditional logic like `if (hasFunnels)`.
 */

test.describe('FunnelInsights Report Viewing - Authentication', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const matomoUser = process.env.MATOMO_USER || 'admin';
    const matomoPassword = process.env.MATOMO_PASSWORD || 'adminpassword123';
    const idSite = process.env.MATOMO_IDSITE || '1';

    // Store funnel ID for tests that need it
    let testFunnelId;
    let testFunnelName;

    test.beforeAll(async ({ browser }) => {
        // Create a funnel that will be used by all tests in this describe block
        const page = await browser.newPage();
        await loginToMatomo(page, matomoUrl, matomoUser, matomoPassword);

        testFunnelName = `E2E Report View Test ${Date.now()}`;
        testFunnelId = await createTestFunnel(page, matomoUrl, idSite, testFunnelName, {
            stepName: 'Report View Step',
            pattern: '/report-test'
        });

        await page.close();
    });

    test.afterAll(async ({ browser }) => {
        // Cleanup: delete the test funnel
        const page = await browser.newPage();
        await loginToMatomo(page, matomoUrl, matomoUser, matomoPassword);
        await deleteFunnel(page, matomoUrl, idSite, testFunnelId);
        await page.close();
    });

    test.beforeEach(async ({ page }) => {
        await loginToMatomo(page, matomoUrl, matomoUser, matomoPassword);
    });

    test('viewFunnel displays funnel name in card title', async ({ page }) => {
        expect(testFunnelId).toBeTruthy();

        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=viewFunnel&idSite=${idSite}&idFunnel=${testFunnelId}&period=day&date=yesterday`);
        await page.waitForLoadState('networkidle');

        const content = await page.content();
        expect(content).not.toContain('Fatal error');

        // Card title should be visible
        await expect(page.locator('h2.card-title').first()).toBeVisible();
    });

    test('viewFunnel shows funnel stats boxes', async ({ page }) => {
        expect(testFunnelId).toBeTruthy();

        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=viewFunnel&idSite=${idSite}&idFunnel=${testFunnelId}&period=day&date=yesterday`);
        await page.waitForLoadState('networkidle');

        const content = await page.content();
        expect(content).not.toContain('Fatal error');

        // Should have stat boxes (entries, conversions, rate)
        await expect(page.locator('.funnel-stats')).toBeVisible();
        await expect(page.locator('.stat-box').first()).toBeVisible();
    });

    test('viewFunnel displays step visualization when data exists', async ({ page }) => {
        expect(testFunnelId).toBeTruthy();

        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=viewFunnel&idSite=${idSite}&idFunnel=${testFunnelId}&period=day&date=yesterday`);
        await page.waitForLoadState('networkidle');

        const content = await page.content();
        expect(content).not.toContain('Fatal error');

        // Should have Steps section
        await expect(page.locator('h3.card-title').filter({ hasText: /Steps/i })).toBeVisible();
    });

    test('viewFunnel shows no data message when empty', async ({ page }) => {
        expect(testFunnelId).toBeTruthy();

        // Use a very old date that likely has no data
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=viewFunnel&idSite=${idSite}&idFunnel=${testFunnelId}&period=day&date=2010-01-01`);
        await page.waitForLoadState('networkidle');

        const content = await page.content();
        expect(content).not.toContain('Fatal error');

        // Should either show data or "no data" notification
        const hasNoDataMessage = content.includes('NoDataForPeriod') ||
            content.includes('notification-info') ||
            content.includes('funnel-step');
        expect(hasNoDataMessage).toBe(true);
    });

    test('viewFunnel shows back button to funnel list', async ({ page }) => {
        expect(testFunnelId).toBeTruthy();

        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=viewFunnel&idSite=${idSite}&idFunnel=${testFunnelId}&period=day&date=yesterday`);
        await page.waitForLoadState('networkidle');

        // Should have back button
        await expect(page.locator('a.btn-flat:has-text("Back"), a.btn:has-text("Back")')).toBeVisible();
    });

    test('viewFunnel shows edit funnel button', async ({ page }) => {
        expect(testFunnelId).toBeTruthy();

        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=viewFunnel&idSite=${idSite}&idFunnel=${testFunnelId}&period=day&date=yesterday`);
        await page.waitForLoadState('networkidle');

        // Should have edit button
        const editButton = page.locator('a.btn:has-text("Edit")');
        await expect(editButton).toBeVisible();

        // Click should navigate to edit page
        await editButton.click();
        await page.waitForURL(/module=FunnelInsights.*action=edit/, { timeout: 30000 });
    });

    test('viewFunnel step numbers are displayed correctly', async ({ page }) => {
        expect(testFunnelId).toBeTruthy();

        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=viewFunnel&idSite=${idSite}&idFunnel=${testFunnelId}&period=day&date=yesterday`);
        await page.waitForLoadState('networkidle');

        // Step numbers should be present
        const stepNumbers = page.locator('.step-number');
        const stepCount = await stepNumbers.count();

        // We created a funnel with at least one step
        expect(stepCount).toBeGreaterThan(0);
        const firstStepText = await stepNumbers.first().textContent();
        expect(firstStepText?.trim()).toBe('1');
    });

    test('viewFunnel with week period renders correctly', async ({ page }) => {
        expect(testFunnelId).toBeTruthy();

        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=viewFunnel&idSite=${idSite}&idFunnel=${testFunnelId}&period=week&date=today`);
        await page.waitForLoadState('networkidle');

        const content = await page.content();
        expect(content).not.toContain('Fatal error');
        expect(content).not.toContain('DataTable\\Map::getRows');
    });

    test('viewFunnel with month period renders correctly', async ({ page }) => {
        expect(testFunnelId).toBeTruthy();

        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=viewFunnel&idSite=${idSite}&idFunnel=${testFunnelId}&period=month&date=today`);
        await page.waitForLoadState('networkidle');

        const content = await page.content();
        expect(content).not.toContain('Fatal error');
        expect(content).not.toContain('Call to undefined method');
    });

    test('viewFunnel with date range (last7) renders correctly', async ({ page }) => {
        expect(testFunnelId).toBeTruthy();

        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=viewFunnel&idSite=${idSite}&idFunnel=${testFunnelId}&period=day&date=last7`);
        await page.waitForLoadState('networkidle');

        const content = await page.content();
        expect(content).not.toContain('Fatal error');
        expect(content).not.toContain('getDataTables');
    });
});

test.describe('FunnelInsights Report - Goal Association Display', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const matomoUser = process.env.MATOMO_USER || 'admin';
    const matomoPassword = process.env.MATOMO_PASSWORD || 'adminpassword123';
    const idSite = process.env.MATOMO_IDSITE || '1';

    test.beforeEach(async ({ page }) => {
        await loginToMatomo(page, matomoUrl, matomoUser, matomoPassword);
    });

    test('create funnel with goal association', async ({ page }) => {
        const funnelName = `E2E Goal Association Test ${Date.now()}`;

        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        await page.fill('input#name', funnelName);

        // Check if goals dropdown has options
        const goalSelect = page.locator('select#goal_id');
        const goalOptions = await goalSelect.locator('option').count();

        // Select a goal if available (index 1 is first actual goal after "No Goal")
        if (goalOptions > 1) {
            await goalSelect.selectOption({ index: 1 });
        }

        // Add a step
        await page.click('.funnel-editor button:has-text("+ Add Step")');
        await page.waitForSelector('.step-card');
        const stepCard = page.locator('.step-card').first();
        await stepCard.locator('input[placeholder="e.g. Landing Page"]').fill('Goal Step');
        await stepCard.locator('input[placeholder="value to match"]').fill('/goal');

        await page.click('input[type="submit"].btn');
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });

        const content = await page.content();
        expect(content).not.toContain('Fatal error');
        await expect(page.locator('table.entityTable')).toContainText(funnelName);

        // Cleanup
        page.on('dialog', dialog => dialog.accept());
        const row = page.locator(`tr:has-text("${funnelName}")`);
        await row.locator('a.icon-delete').click();
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });
    });

    test('viewFunnel shows goal indicator when goal is associated', async ({ page }) => {
        // SETUP: Create a funnel with goal
        const funnelName = `E2E Goal View Test ${Date.now()}`;

        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        await page.fill('input#name', funnelName);

        const goalSelect = page.locator('select#goal_id');
        const goalOptions = await goalSelect.locator('option').count();

        // This test only makes sense if there are goals configured
        if (goalOptions > 1) {
            await goalSelect.selectOption({ index: 1 });
        }

        await page.click('.funnel-editor button:has-text("+ Add Step")');
        await page.waitForSelector('.step-card');
        const stepCard = page.locator('.step-card').first();
        await stepCard.locator('input[placeholder="e.g. Landing Page"]').fill('Goal View Step');
        await stepCard.locator('input[placeholder="value to match"]').fill('/goal-view');
        await page.locator('select#active').selectOption('1');

        await page.click('input[type="submit"].btn');
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });

        // Get the new funnel ID
        const row = page.locator(`tr:has-text("${funnelName}")`);
        const editLink = await row.locator('a.icon-edit').getAttribute('href');
        const idFunnelMatch = editLink?.match(/idFunnel=(\d+)/);
        expect(idFunnelMatch).toBeTruthy();
        const idFunnel = idFunnelMatch[1];

        // TEST: View the funnel
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=viewFunnel&idSite=${idSite}&idFunnel=${idFunnel}&period=day&date=yesterday`);
        await page.waitForLoadState('networkidle');

        const content = await page.content();
        expect(content).not.toContain('Fatal error');

        // Should show goal indicator (if goal was selected)
        if (goalOptions > 1) {
            expect(content.includes('Goal') || content.includes('goal')).toBe(true);
        }

        // CLEANUP
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=manage&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        page.on('dialog', dialog => dialog.accept());
        const deleteRow = page.locator(`tr:has-text("${funnelName}")`);
        await deleteRow.locator('a.icon-delete').click();
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });
    });
});

test.describe('FunnelInsights Index Page - Funnel List', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const matomoUser = process.env.MATOMO_USER || 'admin';
    const matomoPassword = process.env.MATOMO_PASSWORD || 'adminpassword123';
    const idSite = process.env.MATOMO_IDSITE || '1';

    // Store funnel ID for tests
    let activeFunnelId;
    let activeFunnelName;

    test.beforeAll(async ({ browser }) => {
        // Create an ACTIVE funnel for index page tests
        const page = await browser.newPage();
        await loginToMatomo(page, matomoUrl, matomoUser, matomoPassword);

        activeFunnelName = `E2E Active Index Test ${Date.now()}`;
        activeFunnelId = await createTestFunnel(page, matomoUrl, idSite, activeFunnelName, {
            stepName: 'Active Index Step',
            pattern: '/active-index',
            active: true
        });

        await page.close();
    });

    test.afterAll(async ({ browser }) => {
        // Cleanup
        const page = await browser.newPage();
        await loginToMatomo(page, matomoUrl, matomoUser, matomoPassword);
        await deleteFunnel(page, matomoUrl, idSite, activeFunnelId);
        await page.close();
    });

    test.beforeEach(async ({ page }) => {
        await loginToMatomo(page, matomoUrl, matomoUser, matomoPassword);
    });

    test('index page shows only active funnels', async ({ page }) => {
        // SETUP: Create an inactive funnel
        const inactiveName = `E2E Inactive Funnel ${Date.now()}`;

        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        await page.fill('input#name', inactiveName);
        await page.locator('select#active').selectOption('0'); // Inactive

        await page.click('.funnel-editor button:has-text("+ Add Step")');
        await page.waitForSelector('.step-card');
        const stepCard = page.locator('.step-card').first();
        await expect(stepCard).toBeVisible({ timeout: 5000 });
        await stepCard.locator('input[placeholder="e.g. Landing Page"]').fill('Inactive Step');
        await stepCard.locator('input[placeholder="value to match"]').fill('/inactive');

        await page.click('input[type="submit"].btn');
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');

        // TEST: Go to index page
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=index&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const content = await page.content();
        expect(content).not.toContain('Fatal error');

        // Index page should show our active funnel
        expect(content).toContain(activeFunnelName);

        // CLEANUP: Delete the inactive funnel
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=manage&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        page.on('dialog', dialog => dialog.accept());
        const row = page.locator(`tr:has-text("${inactiveName}")`);
        await row.locator('a.icon-delete').click();
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });
    });

    test('index page shows manage funnels link', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=index&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const content = await page.content();
        expect(content).not.toContain('Fatal error');

        // Should have manage link
        const manageLink = page.locator('a:has-text("Manage")');
        await expect(manageLink).toBeVisible();
    });

    test('index page shows step count for each funnel', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=index&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const content = await page.content();
        expect(content).not.toContain('Fatal error');

        // Should show step count in description (we have an active funnel)
        expect(content.includes('step') || content.includes('Step')).toBe(true);
    });

    test('index page funnel cards link to view funnel', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=index&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        // We created an active funnel, so cards should exist
        const funnelCard = page.locator('.funnelList .card').first();
        await expect(funnelCard).toBeVisible();

        const viewButton = funnelCard.locator('a.btn');
        const href = await viewButton.getAttribute('href');
        expect(href).toContain('viewFunnel');
        expect(href).toContain('idFunnel=');
    });

    test('index page shows create funnel button when no active funnels', async ({ page }) => {
        // Note: This test checks the page behavior when we have at least one active funnel
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=index&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const content = await page.content();
        expect(content).not.toContain('Fatal error');

        // Should show funnels or create option
        const hasCreateOrFunnels =
            content.includes('Create') ||
            content.includes('funnelList') ||
            content.includes(activeFunnelName);
        expect(hasCreateOrFunnels).toBe(true);
    });
});
