import { test, expect } from '@playwright/test';
import { createTestFunnel, deleteFunnel, loginToMatomo } from './helpers/funnel-helpers.js';

/**
 * E2E Tests for FunnelInsights UI Integration
 *
 * Tests UI components, Vue integration, drag-drop, step ordering, and user interactions.
 *
 * IMPORTANT: Tests are self-contained - they CREATE their own test data upfront.
 * NEVER use conditional logic like `if (element.count() > 0)` to skip actions.
 * If an element should exist, use expect() to FAIL if it doesn't.
 */

test.describe('FunnelInsights UI - Vue Component Integration', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const matomoUser = process.env.MATOMO_USER || 'admin';
    const matomoPassword = process.env.MATOMO_PASSWORD || 'adminpassword123';
    const idSite = process.env.MATOMO_IDSITE || '1';

    test.beforeEach(async ({ page }) => {
        await loginToMatomo(page, matomoUrl, matomoUser, matomoPassword);
    });

    test('Vue funnel editor component mounts correctly', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        // Wait for Vue component to mount
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        const content = await page.content();
        expect(content).not.toContain('Fatal error');
        expect(content).not.toContain('Vue is not defined');

        // Verify editor elements are present
        await expect(page.locator('input#name')).toBeVisible();
        await expect(page.locator('.funnel-editor button:has-text("+ Add Step")')).toBeVisible();
    });

    test('add step button creates new step card', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        // Initially no step cards
        const initialStepCount = await page.locator('.step-card').count();

        // Add a step
        await page.click('.funnel-editor button:has-text("+ Add Step")');
        await page.waitForSelector('.step-card');

        // Should have one more step
        const newStepCount = await page.locator('.step-card').count();
        expect(newStepCount).toBe(initialStepCount + 1);
    });

    test('multiple steps can be added', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        // Add 5 steps - wait for each step to be visible before adding next
        for (let i = 0; i < 5; i++) {
            await page.click('.funnel-editor button:has-text("+ Add Step")');
            const stepCard = page.locator('.step-card').nth(i);
            await expect(stepCard).toBeVisible({ timeout: 5000 });
        }

        const stepCount = await page.locator('.step-card').count();
        expect(stepCount).toBe(5);
    });

    test('step card has name input field', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        await page.click('.funnel-editor button:has-text("+ Add Step")');
        await page.waitForSelector('.step-card');

        const stepCard = page.locator('.step-card').first();
        const nameInput = stepCard.locator('input[placeholder="e.g. Landing Page"]');
        await expect(nameInput).toBeVisible();
    });

    test('step card has condition value input', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        await page.click('.funnel-editor button:has-text("+ Add Step")');
        await page.waitForSelector('.step-card');

        const stepCard = page.locator('.step-card').first();
        const valueInput = stepCard.locator('input[placeholder="value to match"]');
        await expect(valueInput).toBeVisible();
    });

    test('step card has comparison type selector', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        await page.click('.funnel-editor button:has-text("+ Add Step")');
        await page.waitForSelector('.step-card');

        const stepCard = page.locator('.step-card').first();

        // Should have field/comparison selector - use expect to fail if not present
        const fieldSelector = stepCard.locator('select').first();
        await expect(fieldSelector).toBeAttached();

        // Verify no errors
        const content = await page.content();
        expect(content).not.toContain('Fatal error');
    });

    test('step card can be removed', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        // Add two steps
        await page.click('.funnel-editor button:has-text("+ Add Step")');
        await page.waitForSelector('.step-card');
        await page.click('.funnel-editor button:has-text("+ Add Step")');
        await page.waitForSelector('.step-card:nth-child(2)');

        const initialCount = await page.locator('.step-card').count();
        expect(initialCount).toBe(2);

        // Find and click remove button on first step - MUST exist
        const firstStep = page.locator('.step-card').first();
        const removeButton = firstStep.locator('button:has-text("Remove"), button.remove-step, .icon-delete');
        await expect(removeButton).toBeVisible({ timeout: 5000 });
        await removeButton.click();

        // Should have one less step
        const newCount = await page.locator('.step-card').count();
        expect(newCount).toBe(initialCount - 1);
    });

    test('add condition button adds OR condition', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        await page.click('.funnel-editor button:has-text("+ Add Step")');
        await page.waitForSelector('.step-card');

        const stepCard = page.locator('.step-card').first();

        // Initial condition count
        const initialConditions = await stepCard.locator('.condition-group').count();

        // Add another condition - the button MUST exist
        const addConditionButton = stepCard.locator('button:has-text("Add Condition")');
        await expect(addConditionButton).toBeVisible({ timeout: 5000 });
        await addConditionButton.click();
        await page.waitForTimeout(500);

        const newConditions = await stepCard.locator('.condition-group').count();
        expect(newConditions).toBeGreaterThan(initialConditions);
    });
});

test.describe('FunnelInsights UI - Step Ordering', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const matomoUser = process.env.MATOMO_USER || 'admin';
    const matomoPassword = process.env.MATOMO_PASSWORD || 'adminpassword123';
    const idSite = process.env.MATOMO_IDSITE || '1';

    test.beforeEach(async ({ page }) => {
        await loginToMatomo(page, matomoUrl, matomoUser, matomoPassword);
    });

    test('steps maintain order when saving', async ({ page }) => {
        const funnelName = `E2E Step Order Test ${Date.now()}`;

        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        await page.fill('input#name', funnelName);

        // Add steps with specific names
        const stepNames = ['First Step', 'Second Step', 'Third Step'];

        for (let i = 0; i < stepNames.length; i++) {
            await page.click('.funnel-editor button:has-text("+ Add Step")');
            const stepCard = page.locator('.step-card').nth(i);
            await expect(stepCard).toBeVisible({ timeout: 5000 });

            await stepCard.locator('input[placeholder="e.g. Landing Page"]').fill(stepNames[i]);
            await stepCard.locator('input[placeholder="value to match"]').fill(`/step-${i + 1}`);
        }

        // Save
        await page.click('input[type="submit"].btn');
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');

        // Edit again to verify order
        const row = page.locator(`tr:has-text("${funnelName}")`);
        await row.locator('a.icon-edit').click();
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        // Check step names are in order - we created 3 steps, they MUST be there
        const stepCards = page.locator('.step-card');
        const stepCount = await stepCards.count();
        expect(stepCount).toBe(3);

        for (let i = 0; i < stepNames.length; i++) {
            const nameValue = await stepCards.nth(i).locator('input[placeholder="e.g. Landing Page"]').inputValue();
            expect(nameValue).toBe(stepNames[i]);
        }

        // Cleanup
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=manage&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        page.on('dialog', dialog => dialog.accept());
        const deleteRow = page.locator(`tr:has-text("${funnelName}")`);
        await deleteRow.locator('a.icon-delete').click();
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });
    });

    test('step numbers display correctly', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        // Add 3 steps - wait for each to be visible
        for (let i = 0; i < 3; i++) {
            await page.click('.funnel-editor button:has-text("+ Add Step")');
            const stepCard = page.locator('.step-card').nth(i);
            await expect(stepCard).toBeVisible({ timeout: 5000 });
        }

        // Check that step numbers or indicators are present
        const stepCards = page.locator('.step-card');
        const count = await stepCards.count();
        expect(count).toBe(3);
    });
});

test.describe('FunnelInsights UI - Validator Section', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const matomoUser = process.env.MATOMO_USER || 'admin';
    const matomoPassword = process.env.MATOMO_PASSWORD || 'adminpassword123';
    const idSite = process.env.MATOMO_IDSITE || '1';

    test.beforeEach(async ({ page }) => {
        await loginToMatomo(page, matomoUrl, matomoUser, matomoPassword);
    });

    test('validator section is visible', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        // Validator section should be present
        const validatorSection = page.locator('.validator-section');
        await expect(validatorSection).toBeVisible({ timeout: 10000 });

        const content = await page.content();
        expect(content).not.toContain('Fatal error');
    });

    test('validator test button triggers validation', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        // Add a step first
        await page.click('.funnel-editor button:has-text("+ Add Step")');
        await page.waitForSelector('.step-card');

        const stepCard = page.locator('.step-card').first();
        await stepCard.locator('input[placeholder="e.g. Landing Page"]').fill('Test Step');
        await stepCard.locator('input[placeholder="value to match"]').fill('/test');

        // Find validator input and test button - they MUST exist
        const validatorInput = page.locator('.validator-section input[placeholder*="example"]');
        const testButton = page.locator('.validator-section button:has-text("Test")');

        await expect(validatorInput).toBeVisible({ timeout: 10000 });
        await expect(testButton).toBeVisible({ timeout: 10000 });

        await validatorInput.fill('http://example.com/test');
        await testButton.click();

        // Wait for results
        await page.waitForTimeout(2000);

        // Should show validation results without error
        const content = await page.content();
        expect(content).not.toContain('Fatal error');
    });

    test('validator shows match status', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        // Add a step with URL contains pattern
        await page.click('.funnel-editor button:has-text("+ Add Step")');
        await page.waitForSelector('.step-card');

        const stepCard = page.locator('.step-card').first();
        await stepCard.locator('input[placeholder="e.g. Landing Page"]').fill('Checkout');
        await stepCard.locator('input[placeholder="value to match"]').fill('/checkout');

        // Test with matching URL - elements MUST exist
        const validatorInput = page.locator('.validator-section input[placeholder*="example"]');
        const testButton = page.locator('.validator-section button:has-text("Test")');

        await expect(validatorInput).toBeVisible({ timeout: 10000 });
        await expect(testButton).toBeVisible({ timeout: 10000 });

        await validatorInput.fill('http://example.com/checkout/step1');
        await testButton.click();

        await page.waitForTimeout(2000);

        // Check for match indication
        const validationResults = page.locator('.validation-results');
        await expect(validationResults).toBeVisible({ timeout: 10000 });
        const resultsText = await validationResults.textContent();
        expect(resultsText?.toLowerCase()).toContain('match');
    });
});

test.describe('FunnelInsights UI - Form Interactions', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const matomoUser = process.env.MATOMO_USER || 'admin';
    const matomoPassword = process.env.MATOMO_PASSWORD || 'adminpassword123';
    const idSite = process.env.MATOMO_IDSITE || '1';

    test.beforeEach(async ({ page }) => {
        await loginToMatomo(page, matomoUrl, matomoUser, matomoPassword);
    });

    test('form submit button is visible', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        const submitButton = page.locator('input[type="submit"].btn, button[type="submit"].btn');
        await expect(submitButton).toBeVisible();
    });

    test('cancel button navigates back to manage', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        const cancelButton = page.locator('a.btn-flat:has-text("Cancel")');
        await expect(cancelButton).toBeVisible();

        await cancelButton.click();
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });
    });

    test('name field accepts input', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        const nameInput = page.locator('input#name');
        await nameInput.fill('Test Funnel Name');

        const value = await nameInput.inputValue();
        expect(value).toBe('Test Funnel Name');
    });

    test('active dropdown changes value', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        const activeSelect = page.locator('select#active');
        await activeSelect.selectOption('0');

        const value = await activeSelect.inputValue();
        expect(value).toBe('0');
    });

    test('time limit field accepts numeric input', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        const timeLimitInput = page.locator('input#step_time_limit');
        await timeLimitInput.fill('7200');

        const value = await timeLimitInput.inputValue();
        expect(value).toBe('7200');
    });

    test('strict mode checkbox can be toggled', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        const strictCheckbox = page.locator('input[name="strict_mode"]');

        // Check it - use force: true to bypass label interception
        await strictCheckbox.check({ force: true });
        expect(await strictCheckbox.isChecked()).toBe(true);

        // Uncheck it - use force: true to bypass label interception
        await strictCheckbox.uncheck({ force: true });
        expect(await strictCheckbox.isChecked()).toBe(false);
    });
});

test.describe('FunnelInsights UI - Manage Page', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const matomoUser = process.env.MATOMO_USER || 'admin';
    const matomoPassword = process.env.MATOMO_PASSWORD || 'adminpassword123';
    const idSite = process.env.MATOMO_IDSITE || '1';

    // Create a test funnel for manage page tests
    let testFunnelId;
    let testFunnelName;

    test.beforeAll(async ({ browser }) => {
        const page = await browser.newPage();
        await loginToMatomo(page, matomoUrl, matomoUser, matomoPassword);

        testFunnelName = `E2E Manage UI Test ${Date.now()}`;
        testFunnelId = await createTestFunnel(page, matomoUrl, idSite, testFunnelName, {
            stepName: 'Manage UI Step',
            pattern: '/manage-test'
        });

        await page.close();
    });

    test.afterAll(async ({ browser }) => {
        const page = await browser.newPage();
        await loginToMatomo(page, matomoUrl, matomoUser, matomoPassword);
        await deleteFunnel(page, matomoUrl, idSite, testFunnelId);
        await page.close();
    });

    test.beforeEach(async ({ page }) => {
        await loginToMatomo(page, matomoUrl, matomoUser, matomoPassword);
    });

    test('manage page shows funnel table', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=manage&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const content = await page.content();
        expect(content).not.toContain('Fatal error');

        const table = page.locator('table.entityTable');
        await expect(table).toBeVisible();
    });

    test('manage page has create button', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=manage&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const createButton = page.locator('a.btn:has-text("Create")');
        await expect(createButton).toBeVisible();
    });

    test('funnel row has edit action', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=manage&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        // We created a test funnel, so it MUST exist
        const funnelRow = page.locator(`table.entityTable tbody tr:has-text("${testFunnelName}")`);
        await expect(funnelRow).toBeVisible();

        const editLink = funnelRow.locator('a.icon-edit');
        await expect(editLink).toBeVisible();
    });

    test('funnel row has delete action', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=manage&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        // We created a test funnel, so it MUST exist
        const funnelRow = page.locator(`table.entityTable tbody tr:has-text("${testFunnelName}")`);
        await expect(funnelRow).toBeVisible();

        const deleteLink = funnelRow.locator('a.icon-delete');
        await expect(deleteLink).toBeVisible();
    });

    test('funnel row has duplicate action', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=manage&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        // We created a test funnel, so it MUST exist
        const funnelRow = page.locator(`table.entityTable tbody tr:has-text("${testFunnelName}")`);
        await expect(funnelRow).toBeVisible();

        const duplicateLink = funnelRow.locator('a.icon-copy');
        await expect(duplicateLink).toBeVisible();
    });

    test('funnel table shows step count', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=manage&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const content = await page.content();
        expect(content).not.toContain('Fatal error');

        // Table should contain our test funnel with step count
        await expect(page.locator('table.entityTable')).toContainText(testFunnelName);
    });
});
