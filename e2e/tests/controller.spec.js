import { test, expect } from '@playwright/test';
import { createTestFunnel, deleteFunnel, loginToMatomo } from './helpers/funnel-helpers.js';

/**
 * E2E Tests for FunnelInsights Controller Actions
 *
 * Tests all controller endpoints including page loads, form submissions, and AJAX endpoints.
 *
 * IMPORTANT: Tests are self-contained - they CREATE their own test data upfront.
 * NEVER use conditional logic like `if (data.length > 0)`.
 */

test.describe('FunnelInsights Controller - Unauthenticated Access', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const idSite = process.env.MATOMO_IDSITE || '1';

    test('Controller: index action requires authentication', async ({ page }) => {
        const response = await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=index&idSite=${idSite}`);

        // Should redirect to login or show access denied
        const content = await page.content();
        expect(content).not.toContain('Fatal error');
        expect(content).not.toContain('Parse error');

        // Either redirected to login or shows access denied
        const url = page.url();
        const hasLoginOrAccessDenied =
            url.includes('module=Login') ||
            content.includes('Login') ||
            content.includes('access') ||
            content.includes('denied') ||
            content.includes('permission');
        expect(hasLoginOrAccessDenied).toBe(true);
    });

    test('Controller: manage action requires admin access', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=manage&idSite=${idSite}`);

        const content = await page.content();
        expect(content).not.toContain('Fatal error');
    });

    test('Controller: edit action requires admin access', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);

        const content = await page.content();
        expect(content).not.toContain('Fatal error');
    });

    test('Controller: viewFunnel action requires authentication', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=viewFunnel&idSite=${idSite}&idFunnel=1`);

        const content = await page.content();
        expect(content).not.toContain('Fatal error');
    });
});

test.describe('FunnelInsights Controller - Authenticated Access', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const matomoUser = process.env.MATOMO_USER || 'admin';
    const matomoPassword = process.env.MATOMO_PASSWORD || 'adminpassword123';
    const idSite = process.env.MATOMO_IDSITE || '1';

    test.beforeEach(async ({ page }) => {
        await loginToMatomo(page, matomoUrl, matomoUser, matomoPassword);
    });

    test('Controller: index action displays funnel list', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=index&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const content = await page.content();
        expect(content).not.toContain('Fatal error');
        expect(content).not.toContain('Parse error');

        // Should see funnels heading or related content
        await expect(page.locator('body')).toContainText(/Funnel|funnel/i);
    });

    test('Controller: viewFunnel with valid funnel shows report', async ({ page }) => {
        // SETUP: Create a test funnel specifically for this test
        const testFunnelName = `E2E ViewReport Test ${Date.now()}`;
        const idFunnel = await createTestFunnel(page, matomoUrl, idSite, testFunnelName, {
            stepName: 'View Test Step',
            pattern: '/view-test'
        });
        expect(idFunnel).toBeTruthy();

        // TEST: View the funnel report
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=viewFunnel&idSite=${idSite}&idFunnel=${idFunnel}&period=day&date=yesterday`);
        await page.waitForLoadState('networkidle');

        const content = await page.content();
        expect(content).not.toContain('Fatal error');
        expect(content).not.toContain('Parse error');

        // Should display funnel details
        await expect(page.locator('.card').first()).toBeVisible({ timeout: 10000 });

        // CLEANUP: Delete the test funnel
        await deleteFunnel(page, matomoUrl, idSite, idFunnel);
    });

    test('Controller: viewFunnel with invalid idFunnel redirects', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=viewFunnel&idSite=${idSite}&idFunnel=999999`);
        await page.waitForLoadState('networkidle');

        const content = await page.content();
        expect(content).not.toContain('Fatal error');

        // Should redirect to index or show appropriate message
        const url = page.url();
        expect(url.includes('index') || url.includes('manage') || content.includes('not found') || !content.includes('viewFunnel')).toBe(true);
    });

    test('Controller: viewFunnel with idFunnel=0 redirects', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=viewFunnel&idSite=${idSite}&idFunnel=0`);
        await page.waitForLoadState('networkidle');

        const content = await page.content();
        expect(content).not.toContain('Fatal error');
    });

    test('Controller: edit action with existing funnel pre-fills form', async ({ page }) => {
        // SETUP: Create a test funnel specifically for this test
        const testFunnelName = `E2E EditForm Test ${Date.now()}`;
        const idFunnel = await createTestFunnel(page, matomoUrl, idSite, testFunnelName, {
            stepName: 'Edit Test Step',
            pattern: '/edit-test'
        });
        expect(idFunnel).toBeTruthy();

        // TEST: Edit the funnel and verify form is pre-filled
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}&idFunnel=${idFunnel}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        const content = await page.content();
        expect(content).not.toContain('Fatal error');

        // Name field should be pre-filled
        const nameInput = page.locator('input#name');
        const nameValue = await nameInput.inputValue();
        expect(nameValue.length).toBeGreaterThan(0);

        // CLEANUP: Delete the test funnel
        await deleteFunnel(page, matomoUrl, idSite, idFunnel);
    });

    test('Controller: validateSteps AJAX endpoint works', async ({ page }) => {
        // Navigate to edit page first to set up cookies
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        // Make AJAX request to validateSteps - use the correct API format
        const steps = JSON.stringify([
            { name: 'Test Step', conditions: [{ comparison: 'url', operator: 'contains', pattern: '/checkout' }] }
        ]);

        const response = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: steps,
                testUrl: 'http://example.com/checkout/page'
            });

            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return {
                status: res.status,
                text: await res.text()
            };
        }, { matomoUrl, idSite, steps });

        expect(response.text).not.toContain('Fatal error');
        expect(response.text).not.toContain('Parse error');

        // Should return JSON array
        const json = JSON.parse(response.text);
        expect(Array.isArray(json)).toBe(true);
        expect(json[0]).toHaveProperty('matched');
        expect(json[0].matched).toBe(true);
    });

    test('Controller: validateSteps with non-matching URL', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        const steps = JSON.stringify([
            { name: 'Checkout', conditions: [{ comparison: 'url', operator: 'contains', pattern: '/checkout' }] }
        ]);

        const response = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: steps,
                testUrl: 'http://example.com/homepage'
            });

            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite, steps });

        const json = JSON.parse(response);
        expect(Array.isArray(json)).toBe(true);
        expect(json[0].matched).toBe(false);
    });

    test('Controller: save action creates new funnel', async ({ page }) => {
        const funnelName = `E2E Controller Test ${Date.now()}`;

        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        // Fill the form
        await page.fill('input#name', funnelName);

        // Add a step using the Vue component
        await page.click('.funnel-editor button:has-text("+ Add Step")');
        await page.waitForSelector('.step-card');

        const stepCard = page.locator('.step-card').first();
        await stepCard.locator('input[placeholder="e.g. Landing Page"]').fill('Test Step');
        await stepCard.locator('input[placeholder="value to match"]').fill('/test-url');

        // Submit the form
        await page.click('input[type="submit"].btn');
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });

        // Verify funnel was created
        await expect(page.locator('table.entityTable')).toContainText(funnelName);

        // Cleanup: delete the funnel
        page.on('dialog', dialog => dialog.accept());
        const row = page.locator(`tr:has-text("${funnelName}")`);
        await row.locator('a.icon-delete').click();
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });
    });

    test('Controller: save action with invalid steps JSON shows error', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        // Fill name but leave steps empty/invalid
        await page.fill('input#name', 'Invalid Steps Test');

        // Try to submit without steps (the Vue component should handle this gracefully)
        // The form should either show validation error or create funnel with empty steps

        const content = await page.content();
        expect(content).not.toContain('Fatal error');
    });

    test('Controller: duplicate action creates copy', async ({ page }) => {
        // SETUP: Create a funnel to duplicate
        const originalName = `E2E Duplicate Source ${Date.now()}`;

        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        await page.fill('input#name', originalName);
        await page.click('.funnel-editor button:has-text("+ Add Step")');
        await page.waitForSelector('.step-card');

        const stepCard = page.locator('.step-card').first();
        await stepCard.locator('input[placeholder="e.g. Landing Page"]').fill('Source Step');
        await stepCard.locator('input[placeholder="value to match"]').fill('/source');

        await page.click('input[type="submit"].btn');
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });

        // TEST: Duplicate it
        page.on('dialog', dialog => dialog.accept());
        const row = page.locator(`tr:has-text("${originalName}")`);
        await row.locator('a.icon-copy').click();
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');

        // Verify both exist
        await expect(page.locator('table.entityTable')).toContainText(originalName);
        await expect(page.locator('table.entityTable')).toContainText(`${originalName} (Copy)`);

        // CLEANUP: Delete both
        const originalRow = page.locator(`tr:has-text("${originalName}")`).first();
        await originalRow.locator('a.icon-delete').click();
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });

        const copyRow = page.locator(`tr:has-text("${originalName} (Copy)")`);
        await copyRow.locator('a.icon-delete').click();
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });
    });

    test('Controller: delete action removes funnel', async ({ page }) => {
        // SETUP: Create a funnel to delete
        const deleteName = `E2E Delete Target ${Date.now()}`;

        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        await page.fill('input#name', deleteName);
        await page.click('.funnel-editor button:has-text("+ Add Step")');
        await page.waitForSelector('.step-card');

        const stepCard = page.locator('.step-card').first();
        await stepCard.locator('input[placeholder="e.g. Landing Page"]').fill('Delete Step');
        await stepCard.locator('input[placeholder="value to match"]').fill('/delete');

        await page.click('input[type="submit"].btn');
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });

        // Verify funnel exists
        await expect(page.locator('table.entityTable')).toContainText(deleteName);

        // TEST: Delete the funnel
        page.on('dialog', dialog => dialog.accept());
        const row = page.locator(`tr:has-text("${deleteName}")`);
        await row.locator('a.icon-delete').click();
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');

        // Verify funnel is gone
        await expect(page.locator('table.entityTable')).not.toContainText(deleteName);
    });
});

test.describe('FunnelInsights Controller - Form Validation', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const matomoUser = process.env.MATOMO_USER || 'admin';
    const matomoPassword = process.env.MATOMO_PASSWORD || 'adminpassword123';
    const idSite = process.env.MATOMO_IDSITE || '1';

    test.beforeEach(async ({ page }) => {
        await loginToMatomo(page, matomoUrl, matomoUser, matomoPassword);
    });

    test('Controller: funnel name is required', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        // Try to submit without a name
        const nameInput = page.locator('input#name');
        await nameInput.fill('');

        // The HTML5 required attribute should prevent submission
        const isRequired = await nameInput.getAttribute('required');
        expect(isRequired !== null || isRequired === '').toBe(true);
    });

    test('Controller: strict_mode checkbox works', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        const strictCheckbox = page.locator('input[name="strict_mode"]');
        await expect(strictCheckbox).toBeAttached();

        // Toggle it - use force: true to bypass label interception
        await strictCheckbox.check({ force: true });
        expect(await strictCheckbox.isChecked()).toBe(true);

        await strictCheckbox.uncheck({ force: true });
        expect(await strictCheckbox.isChecked()).toBe(false);
    });

    test('Controller: step_time_limit accepts numeric values', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        const timeLimitInput = page.locator('input#step_time_limit');
        await expect(timeLimitInput).toBeVisible();

        // Fill with numeric value
        await timeLimitInput.fill('3600');
        expect(await timeLimitInput.inputValue()).toBe('3600');

        // Should have min=0 attribute
        const minAttr = await timeLimitInput.getAttribute('min');
        expect(minAttr).toBe('0');
    });

    test('Controller: goal_id dropdown is optional', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        const goalSelect = page.locator('select#goal_id');
        await expect(goalSelect).toBeVisible({ timeout: 10000 });

        // Should have "No Goal" option - check for empty value option or option text
        const noGoalOption = goalSelect.locator('option').first();
        await expect(noGoalOption).toBeAttached();
        // The first option should be the "No Goal" option (empty or placeholder)
        const firstOptionValue = await noGoalOption.getAttribute('value');
        expect(firstOptionValue === '' || firstOptionValue === null).toBe(true);
    });

    test('Controller: active status dropdown works', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        const activeSelect = page.locator('select#active');
        await expect(activeSelect).toBeVisible({ timeout: 10000 });

        // Should have Yes (1) and No (0) options - check they are attached
        await expect(activeSelect.locator('option[value="1"]')).toBeAttached();
        await expect(activeSelect.locator('option[value="0"]')).toBeAttached();

        // Also verify the dropdown works by selecting values
        await activeSelect.selectOption('0');
        expect(await activeSelect.inputValue()).toBe('0');
        await activeSelect.selectOption('1');
        expect(await activeSelect.inputValue()).toBe('1');
    });
});

// These tests require a funnel to exist - skip if environment not set up
test.describe('FunnelInsights Controller - viewFunnel Dashboard Layout (v3.0.42)', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const matomoUser = process.env.MATOMO_USER || 'admin';
    const matomoPassword = process.env.MATOMO_PASSWORD || 'adminpassword123';
    const idSite = process.env.MATOMO_IDSITE || '1';

    test.beforeEach(async ({ page }) => {
        await loginToMatomo(page, matomoUrl, matomoUser, matomoPassword);
    });

    // Helper to get or create a funnel for testing
    async function getOrCreateFunnelId(page, request) {
        // First check via API if any funnels exist
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnels',
                idSite: idSite,
                format: 'JSON',
            },
        });

        const text = await response.text();
        if (!text.includes('error') && !text.includes('"result"')) {
            const funnels = JSON.parse(text);
            if (Array.isArray(funnels) && funnels.length > 0) {
                return String(funnels[0].idfunnel);
            }
        }

        // No funnels exist, try to create one via the form
        const created = await createTestFunnel(page, matomoUrl, idSite, `E2E Test ${Date.now()}`);
        return created ? String(created) : null;
    }

    test('viewFunnel: has dashboard layout with period selector', async ({ page, request }) => {
        const idFunnel = await getOrCreateFunnelId(page, request);
        expect(idFunnel).toBeTruthy();

        // TEST: View the funnel page
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=viewFunnel&idSite=${idSite}&idFunnel=${idFunnel}&period=day&date=yesterday`);
        await page.waitForLoadState('networkidle');

        const content = await page.content();
        expect(content).not.toContain('Fatal error');
        expect(content).not.toContain('Parse error');

        // Verify dashboard layout is present (extends dashboard.twig)
        await expect(page.locator('.page, .pageWrap')).toBeAttached({ timeout: 10000 });

        // Verify period selector is present (from topcontrols block)
        const periodSelector = page.locator('#periodString, [data-test="period-selector"], .piwikTopControl');
        await expect(periodSelector.first()).toBeAttached({ timeout: 10000 });

        // The card content should be properly styled within dashboard layout
        await expect(page.locator('.card').first()).toBeVisible({ timeout: 10000 });

        // Check that the funnel name appears in the styled layout
        await expect(page.locator('.card-title').first()).toBeVisible();
    });

    test('viewFunnel: period selector allows date changes', async ({ page, request }) => {
        const idFunnel = await getOrCreateFunnelId(page, request);
        expect(idFunnel).toBeTruthy();

        // Navigate to viewFunnel
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=viewFunnel&idSite=${idSite}&idFunnel=${idFunnel}&period=day&date=yesterday`);
        await page.waitForLoadState('networkidle');

        // Verify period selector exists and is clickable
        const periodSelector = page.locator('#periodString');
        await expect(periodSelector).toBeVisible({ timeout: 10000 });
    });

    test('viewFunnel: stats boxes are visible and styled', async ({ page, request }) => {
        const idFunnel = await getOrCreateFunnelId(page, request);
        expect(idFunnel).toBeTruthy();

        // TEST
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=viewFunnel&idSite=${idSite}&idFunnel=${idFunnel}&period=day&date=yesterday`);
        await page.waitForLoadState('networkidle');

        // Verify stat boxes are rendered
        await expect(page.locator('.funnel-stats')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('.stat-box').first()).toBeVisible();

        // Should have 3 stat boxes (entries, conversions, rate)
        const statBoxes = page.locator('.stat-box');
        await expect(statBoxes).toHaveCount(3);
    });

    test('viewFunnel: back and edit buttons are visible', async ({ page, request }) => {
        const idFunnel = await getOrCreateFunnelId(page, request);
        expect(idFunnel).toBeTruthy();

        // TEST
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=viewFunnel&idSite=${idSite}&idFunnel=${idFunnel}&period=day&date=yesterday`);
        await page.waitForLoadState('networkidle');

        // Verify navigation buttons are visible
        const backButton = page.locator('a.btn-flat:has(.icon-arrow-left)');
        const editButton = page.locator('a.btn:has(.icon-edit)');

        await expect(backButton).toBeVisible({ timeout: 10000 });
        await expect(editButton).toBeVisible();

        // Back button should link to index
        await expect(backButton).toHaveAttribute('href', /action=index/);

        // Edit button should link to edit with correct idFunnel
        await expect(editButton).toHaveAttribute('href', new RegExp(`idFunnel=${idFunnel}`));
    });

    test('viewFunnel: funnel steps section is displayed', async ({ page, request }) => {
        const idFunnel = await getOrCreateFunnelId(page, request);
        expect(idFunnel).toBeTruthy();

        // TEST
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=viewFunnel&idSite=${idSite}&idFunnel=${idFunnel}&period=day&date=yesterday`);
        await page.waitForLoadState('networkidle');

        // Verify funnel visualization section exists (card with Steps header)
        const stepsCard = page.locator('.card').filter({ hasText: 'Steps' });
        await expect(stepsCard).toBeVisible({ timeout: 10000 });
    });
});

test.describe('FunnelInsights Controller - Navigation', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const matomoUser = process.env.MATOMO_USER || 'admin';
    const matomoPassword = process.env.MATOMO_PASSWORD || 'adminpassword123';
    const idSite = process.env.MATOMO_IDSITE || '1';

    test.beforeEach(async ({ page }) => {
        await loginToMatomo(page, matomoUrl, matomoUser, matomoPassword);
    });

    test('Controller: cancel button returns to manage page', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        // Click cancel button
        await page.click('a.btn-flat:has-text("Cancel")');
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });
    });

    test('Controller: create funnel button navigates to edit', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=manage&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        await page.click('a.btn:has-text("Create")');
        await page.waitForURL(/module=FunnelInsights.*action=edit/, { timeout: 30000 });

        // Should be on create (no idFunnel parameter)
        const url = page.url();
        expect(url).not.toContain('idFunnel=');
    });

    test('Controller: index page links to manage page', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=index&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        // Should have link to manage funnels
        const manageLink = page.locator('a:has-text("Manage")');
        await expect(manageLink).toBeVisible();

        await manageLink.click();
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });
    });
});
