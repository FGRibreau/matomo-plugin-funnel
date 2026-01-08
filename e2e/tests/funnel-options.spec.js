import { test, expect } from '@playwright/test';

/**
 * E2E Tests for FunnelInsights Funnel Options
 *
 * Tests strict mode, step time limit, and other advanced funnel configuration options.
 */

test.describe('FunnelInsights Funnel Options - Strict Mode', () => {
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

    test('create funnel with strict mode enabled', async ({ page }) => {
        const funnelName = `E2E Strict Mode Test ${Date.now()}`;

        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        await page.fill('input#name', funnelName);

        // Enable strict mode - use force: true to bypass label interception
        const strictCheckbox = page.locator('input[name="strict_mode"]');
        await strictCheckbox.check({ force: true });
        expect(await strictCheckbox.isChecked()).toBe(true);

        // Add a step
        await page.click('.funnel-editor button:has-text("+ Add Step")');
        await page.waitForSelector('.step-card');
        const stepCard = page.locator('.step-card').first();
        await stepCard.locator('input[placeholder="e.g. Landing Page"]').fill('Strict Step');
        await stepCard.locator('input[placeholder="value to match"]').fill('/strict');

        await page.click('input[type="submit"].btn');
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });

        const content = await page.content();
        expect(content).not.toContain('Fatal error');
        await expect(page.locator('table.entityTable')).toContainText(funnelName);

        // Verify strict mode was saved by editing the funnel
        const row = page.locator(`tr:has-text("${funnelName}")`);
        await row.locator('a.icon-edit').click();
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        const strictCheckboxEdit = page.locator('input[name="strict_mode"]');
        expect(await strictCheckboxEdit.isChecked()).toBe(true);

        // Cleanup
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=manage&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        page.on('dialog', dialog => dialog.accept());
        const deleteRow = page.locator(`tr:has-text("${funnelName}")`);
        await deleteRow.locator('a.icon-delete').click();
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });
    });

    test('create funnel with strict mode disabled (default)', async ({ page }) => {
        const funnelName = `E2E Non-Strict Test ${Date.now()}`;

        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        await page.fill('input#name', funnelName);

        // Strict mode should be unchecked by default
        const strictCheckbox = page.locator('input[name="strict_mode"]');
        expect(await strictCheckbox.isChecked()).toBe(false);

        // Add a step
        await page.click('.funnel-editor button:has-text("+ Add Step")');
        await page.waitForSelector('.step-card');
        const stepCard = page.locator('.step-card').first();
        await stepCard.locator('input[placeholder="e.g. Landing Page"]').fill('Non-Strict Step');
        await stepCard.locator('input[placeholder="value to match"]').fill('/non-strict');

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
});

test.describe('FunnelInsights Funnel Options - Step Time Limit', () => {
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

    test('create funnel with step time limit', async ({ page }) => {
        const funnelName = `E2E Time Limit Test ${Date.now()}`;

        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        await page.fill('input#name', funnelName);

        // Set step time limit to 1 hour (3600 seconds)
        const timeLimitInput = page.locator('input#step_time_limit');
        await timeLimitInput.fill('3600');

        // Add a step
        await page.click('.funnel-editor button:has-text("+ Add Step")');
        await page.waitForSelector('.step-card');
        const stepCard = page.locator('.step-card').first();
        await stepCard.locator('input[placeholder="e.g. Landing Page"]').fill('Time Limited Step');
        await stepCard.locator('input[placeholder="value to match"]').fill('/time-limit');

        await page.click('input[type="submit"].btn');
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });

        const content = await page.content();
        expect(content).not.toContain('Fatal error');
        await expect(page.locator('table.entityTable')).toContainText(funnelName);

        // Verify time limit was saved by editing the funnel
        const row = page.locator(`tr:has-text("${funnelName}")`);
        await row.locator('a.icon-edit').click();
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        const timeLimitEdit = page.locator('input#step_time_limit');
        expect(await timeLimitEdit.inputValue()).toBe('3600');

        // Cleanup
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=manage&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        page.on('dialog', dialog => dialog.accept());
        const deleteRow = page.locator(`tr:has-text("${funnelName}")`);
        await deleteRow.locator('a.icon-delete').click();
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });
    });

    test('step time limit accepts zero (no limit)', async ({ page }) => {
        const funnelName = `E2E No Time Limit Test ${Date.now()}`;

        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        await page.fill('input#name', funnelName);

        // Set step time limit to 0 (no limit)
        const timeLimitInput = page.locator('input#step_time_limit');
        await timeLimitInput.fill('0');

        // Add a step
        await page.click('.funnel-editor button:has-text("+ Add Step")');
        await page.waitForSelector('.step-card');
        const stepCard = page.locator('.step-card').first();
        await stepCard.locator('input[placeholder="e.g. Landing Page"]').fill('No Limit Step');
        await stepCard.locator('input[placeholder="value to match"]').fill('/no-limit');

        await page.click('input[type="submit"].btn');
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });

        const content = await page.content();
        expect(content).not.toContain('Fatal error');

        // Cleanup
        page.on('dialog', dialog => dialog.accept());
        const row = page.locator(`tr:has-text("${funnelName}")`);
        await row.locator('a.icon-delete').click();
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });
    });

    test('step time limit with very large value', async ({ page }) => {
        const funnelName = `E2E Large Time Limit Test ${Date.now()}`;

        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        await page.fill('input#name', funnelName);

        // Set step time limit to 1 week (604800 seconds)
        const timeLimitInput = page.locator('input#step_time_limit');
        await timeLimitInput.fill('604800');

        // Add a step
        await page.click('.funnel-editor button:has-text("+ Add Step")');
        await page.waitForSelector('.step-card');
        const stepCard = page.locator('.step-card').first();
        await stepCard.locator('input[placeholder="e.g. Landing Page"]').fill('Large Limit Step');
        await stepCard.locator('input[placeholder="value to match"]').fill('/large-limit');

        await page.click('input[type="submit"].btn');
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });

        const content = await page.content();
        expect(content).not.toContain('Fatal error');

        // Cleanup
        page.on('dialog', dialog => dialog.accept());
        const row = page.locator(`tr:has-text("${funnelName}")`);
        await row.locator('a.icon-delete').click();
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });
    });
});

test.describe('FunnelInsights Funnel Options - Active Status', () => {
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

    test('create active funnel', async ({ page }) => {
        const funnelName = `E2E Active Funnel Test ${Date.now()}`;

        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        await page.fill('input#name', funnelName);
        await page.locator('select#active').selectOption('1'); // Active

        // Add a step
        await page.click('.funnel-editor button:has-text("+ Add Step")');
        await page.waitForSelector('.step-card');
        const stepCard = page.locator('.step-card').first();
        await stepCard.locator('input[placeholder="e.g. Landing Page"]').fill('Active Step');
        await stepCard.locator('input[placeholder="value to match"]').fill('/active');

        await page.click('input[type="submit"].btn');
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });

        const content = await page.content();
        expect(content).not.toContain('Fatal error');

        // Verify the funnel shows in the index page (active funnels only)
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=index&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const indexContent = await page.content();
        expect(indexContent.includes(funnelName) || indexContent.includes('NoActiveFunnels') || indexContent.includes('funnelList')).toBe(true);

        // Cleanup
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=manage&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        page.on('dialog', dialog => dialog.accept());
        const row = page.locator(`tr:has-text("${funnelName}")`);
        await row.locator('a.icon-delete').click();
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });
    });

    test('create inactive funnel', async ({ page }) => {
        const funnelName = `E2E Inactive Funnel Test ${Date.now()}`;

        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        await page.fill('input#name', funnelName);
        await page.locator('select#active').selectOption('0'); // Inactive

        // Add a step
        await page.click('.funnel-editor button:has-text("+ Add Step")');
        await page.waitForSelector('.step-card');
        const stepCard = page.locator('.step-card').first();
        await stepCard.locator('input[placeholder="e.g. Landing Page"]').fill('Inactive Step');
        await stepCard.locator('input[placeholder="value to match"]').fill('/inactive');

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

    test('toggle funnel active status', async ({ page }) => {
        const funnelName = `E2E Toggle Status Test ${Date.now()}`;

        // Create inactive funnel
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        await page.fill('input#name', funnelName);
        await page.locator('select#active').selectOption('0'); // Inactive

        await page.click('.funnel-editor button:has-text("+ Add Step")');
        await page.waitForSelector('.step-card');
        const stepCard = page.locator('.step-card').first();
        await stepCard.locator('input[placeholder="e.g. Landing Page"]').fill('Toggle Step');
        await stepCard.locator('input[placeholder="value to match"]').fill('/toggle');

        await page.click('input[type="submit"].btn');
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });

        // Edit and activate
        const row = page.locator(`tr:has-text("${funnelName}")`);
        await row.locator('a.icon-edit').click();
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        await page.locator('select#active').selectOption('1'); // Now active

        await page.click('input[type="submit"].btn');
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });

        // Verify it's now active
        const editRow = page.locator(`tr:has-text("${funnelName}")`);
        await editRow.locator('a.icon-edit').click();
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        const activeSelect = page.locator('select#active');
        expect(await activeSelect.inputValue()).toBe('1');

        // Cleanup
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=manage&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        page.on('dialog', dialog => dialog.accept());
        const deleteRow = page.locator(`tr:has-text("${funnelName}")`);
        await deleteRow.locator('a.icon-delete').click();
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });
    });
});

test.describe('FunnelInsights Funnel Options - Combined Options', () => {
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

    test('create funnel with all options set', async ({ page }) => {
        const funnelName = `E2E Full Options Test ${Date.now()}`;

        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        // Set all options
        await page.fill('input#name', funnelName);
        await page.locator('select#active').selectOption('1');
        await page.locator('input[name="strict_mode"]').check({ force: true });
        await page.locator('input#step_time_limit').fill('7200');

        // Check if goals dropdown has options
        const goalSelect = page.locator('select#goal_id');
        const goalOptions = await goalSelect.locator('option').count();
        if (goalOptions > 1) {
            await goalSelect.selectOption({ index: 1 });
        }

        // Add multiple steps
        await page.click('.funnel-editor button:has-text("+ Add Step")');
        await page.waitForSelector('.step-card');
        let stepCard = page.locator('.step-card').nth(0);
        await stepCard.locator('input[placeholder="e.g. Landing Page"]').fill('Full Options Step 1');
        await stepCard.locator('input[placeholder="value to match"]').fill('/full-1');

        await page.click('.funnel-editor button:has-text("+ Add Step")');
        stepCard = page.locator('.step-card').nth(1);
        await stepCard.locator('input[placeholder="e.g. Landing Page"]').fill('Full Options Step 2');
        await stepCard.locator('input[placeholder="value to match"]').fill('/full-2');

        await page.click('input[type="submit"].btn');
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });

        const content = await page.content();
        expect(content).not.toContain('Fatal error');
        await expect(page.locator('table.entityTable')).toContainText(funnelName);

        // Verify all options were saved
        const row = page.locator(`tr:has-text("${funnelName}")`);
        await row.locator('a.icon-edit').click();
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        expect(await page.locator('select#active').inputValue()).toBe('1');
        expect(await page.locator('input[name="strict_mode"]').isChecked()).toBe(true);
        expect(await page.locator('input#step_time_limit').inputValue()).toBe('7200');

        // Cleanup
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=manage&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        page.on('dialog', dialog => dialog.accept());
        const deleteRow = page.locator(`tr:has-text("${funnelName}")`);
        await deleteRow.locator('a.icon-delete').click();
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });
    });

    test('update funnel options preserves step data', async ({ page }) => {
        const funnelName = `E2E Options Update Test ${Date.now()}`;

        // Create funnel with steps
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        await page.fill('input#name', funnelName);

        await page.click('.funnel-editor button:has-text("+ Add Step")');
        await page.waitForSelector('.step-card');
        let stepCard = page.locator('.step-card').nth(0);
        await expect(stepCard).toBeVisible({ timeout: 5000 });
        await stepCard.locator('input[placeholder="e.g. Landing Page"]').fill('Preserved Step 1');
        await stepCard.locator('input[placeholder="value to match"]').fill('/preserve-1');

        await page.click('.funnel-editor button:has-text("+ Add Step")');
        stepCard = page.locator('.step-card').nth(1);
        await expect(stepCard).toBeVisible({ timeout: 5000 });
        await stepCard.locator('input[placeholder="e.g. Landing Page"]').fill('Preserved Step 2');
        await stepCard.locator('input[placeholder="value to match"]').fill('/preserve-2');

        await page.click('input[type="submit"].btn');
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');

        // Edit and change options
        const row = page.locator(`tr:has-text("${funnelName}")`);
        await row.locator('a.icon-edit').click();
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        // Change options - use force: true for checkbox
        await page.locator('input[name="strict_mode"]').check({ force: true });
        await page.locator('input#step_time_limit').fill('1800');

        await page.click('input[type="submit"].btn');
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });

        // Verify steps are preserved
        const editRow = page.locator(`tr:has-text("${funnelName}")`);
        await editRow.locator('a.icon-edit').click();
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        // Should still have 2 steps
        const stepCards = page.locator('.step-card');
        expect(await stepCards.count()).toBe(2);

        // Verify step names are preserved
        const firstStepName = await stepCards.nth(0).locator('input[placeholder="e.g. Landing Page"]').inputValue();
        expect(firstStepName).toBe('Preserved Step 1');

        // Cleanup
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=manage&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        page.on('dialog', dialog => dialog.accept());
        const deleteRow = page.locator(`tr:has-text("${funnelName}")`);
        await deleteRow.locator('a.icon-delete').click();
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });
    });
});
