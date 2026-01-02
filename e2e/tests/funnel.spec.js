import { test, expect } from '@playwright/test';

test.describe('FunnelInsights CRUD Operations', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const matomoUser = process.env.MATOMO_USER || 'admin';
    const matomoPassword = process.env.MATOMO_PASSWORD || 'adminpassword123';
    const idSite = process.env.MATOMO_IDSITE || '1';

    test.beforeEach(async ({ page }) => {
        // Login to Matomo - navigate to login page
        await page.goto(`${matomoUrl}/index.php?module=Login`);

        // Wait for the page to fully load
        await page.waitForLoadState('networkidle');

        // Wait for login form to be present
        await page.waitForSelector('#login_form', { timeout: 30000 });

        // Get the form element
        const form = page.locator('#login_form');

        // Wait for form fields to be ready
        await form.locator('#login_form_login').waitFor({ state: 'visible' });
        await form.locator('#login_form_password').waitFor({ state: 'visible' });

        // Fill in credentials using the form's fields
        await form.locator('#login_form_login').fill(matomoUser);
        await form.locator('#login_form_password').fill(matomoPassword);

        // Wait a moment for any JS to process
        await page.waitForTimeout(500);

        // Submit the form by clicking the submit button within the form
        await form.locator('input[type="submit"]').click();

        // Wait for navigation away from login page
        await page.waitForURL(/(?!.*module=Login)|.*module=CoreHome/, { timeout: 30000 });

        // Additional wait to ensure page is fully loaded after login
        await page.waitForLoadState('networkidle');
    });

    // Helper function to add a step with name and pattern
    async function addFunnelStep(page, stepName, pattern) {
        // Click the "+ Add Step" button (no special class, just text)
        await page.click('.funnel-editor button:has-text("+ Add Step")');

        // Wait for new step card to appear
        await page.waitForSelector('.step-card');

        // Get the last step card (the one we just added)
        const stepCards = page.locator('.step-card');
        const lastStep = stepCards.last();

        // Fill step name
        await lastStep.locator('input[placeholder="e.g. Landing Page"]').fill(stepName);

        // Fill pattern in the first condition (steps come with one condition by default)
        await lastStep.locator('input[placeholder="value to match"]').fill(pattern);
    }

    test('should create a new funnel', async ({ page }) => {
        const createdFunnelName = `E2E Test Funnel ${Date.now()}`;

        // Navigate to funnel management
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=manage&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        // Click create funnel button (it's a link with class "btn")
        await page.click('a.btn:has-text("Create")');
        await page.waitForLoadState('networkidle');

        // Wait for Vue component to mount
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        // Fill funnel name
        await page.fill('input#name', createdFunnelName);

        // Add Step 1
        await addFunnelStep(page, 'Homepage', '/');

        // Add Step 2
        await addFunnelStep(page, 'Product Page', '/product');

        // Save the funnel - submit the form
        await page.click('input[type="submit"].btn');

        // Wait for redirect to manage page
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });

        // Verify funnel was created
        await expect(page.locator('table.entityTable')).toContainText(createdFunnelName);
    });

    test('should read/view funnel list', async ({ page }) => {
        // Navigate to funnel management
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=manage&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        // Verify the page loaded correctly - use specific selector
        await expect(page.locator('h2.card-title')).toContainText(/Manage|Funnel/i);

        // Verify table structure exists
        await expect(page.locator('table.entityTable')).toBeVisible();
    });

    test('should update an existing funnel', async ({ page }) => {
        const updateFunnelName = `E2E Update Test ${Date.now()}`;
        const updatedName = `${updateFunnelName} - Updated`;

        // First create a funnel to update
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=manage&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        await page.click('a.btn:has-text("Create")');
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        await page.fill('input#name', updateFunnelName);

        // Add a step
        await addFunnelStep(page, 'Test Step', '/test');

        await page.click('input[type="submit"].btn');
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });

        // Now edit the funnel
        const row = page.locator(`tr:has-text("${updateFunnelName}")`);
        await row.locator('a.icon-edit').click();
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        // Update the name
        await page.fill('input#name', updatedName);

        // Save changes
        await page.click('input[type="submit"].btn');
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });

        // Verify the update
        await expect(page.locator('table.entityTable')).toContainText(updatedName);
    });

    test('should delete a funnel', async ({ page }) => {
        const deleteFunnelName = `E2E Delete Test ${Date.now()}`;

        // First create a funnel to delete
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=manage&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        await page.click('a.btn:has-text("Create")');
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        await page.fill('input#name', deleteFunnelName);

        // Add a step
        await addFunnelStep(page, 'Delete Step', '/delete-test');

        await page.click('input[type="submit"].btn');
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });

        // Verify funnel exists
        await expect(page.locator('table.entityTable')).toContainText(deleteFunnelName);

        // Delete the funnel - handle confirmation dialog
        page.on('dialog', dialog => dialog.accept());

        const row = page.locator(`tr:has-text("${deleteFunnelName}")`);
        await row.locator('a.icon-delete').click();

        // Wait for redirect back to manage page
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');

        // Verify funnel was deleted
        await expect(page.locator('table.entityTable')).not.toContainText(deleteFunnelName);
    });

    test('should duplicate a funnel', async ({ page }) => {
        const originalName = `E2E Duplicate Test ${Date.now()}`;

        // First create a funnel to duplicate
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=manage&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        await page.click('a.btn:has-text("Create")');
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        await page.fill('input#name', originalName);

        // Add steps
        await addFunnelStep(page, 'Duplicate Step', '/duplicate-test');

        await page.click('input[type="submit"].btn');
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });

        // Duplicate the funnel - handle confirmation dialog
        page.on('dialog', dialog => dialog.accept());

        const row = page.locator(`tr:has-text("${originalName}")`);
        await row.locator('a.icon-copy').click();

        // Wait for redirect back to manage page
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');

        // Verify duplicate was created (should have "(Copy)" suffix)
        await expect(page.locator('table.entityTable')).toContainText(`${originalName} (Copy)`);
    });

    test.skip('should validate funnel steps using Test button', async ({ page }) => {
        // Skip: Validation feature not yet implemented in plugin
        // Navigate to create funnel page
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        // Add a step with URL contains pattern
        await addFunnelStep(page, 'Test Page', '/checkout');

        // Use the validator section - the input has a specific placeholder
        await page.fill('.validator-section input[placeholder="http://example.com/checkout"]', 'http://example.com/checkout/step1');
        await page.click('.validator-section button:has-text("Test")');

        // Wait for validation results
        await page.waitForSelector('.validation-results', { timeout: 10000 });

        // Verify match result
        await expect(page.locator('.validation-results')).toContainText(/MATCH|match/i);
    });

    test('should handle step with multiple conditions (OR logic)', async ({ page }) => {
        const funnelName = `E2E OR Logic Test ${Date.now()}`;

        // Navigate to create funnel page
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        await page.fill('input#name', funnelName);

        // Add a step
        await addFunnelStep(page, 'Multiple Paths', '/path-a');

        // Get the step card
        const stepCard = page.locator('.step-card').first();

        // Add a second condition (OR) using the "Add Condition" button
        await stepCard.locator('button:has-text("Add Condition")').click();

        // Wait for the second condition group
        await stepCard.locator('.condition-group').nth(1).waitFor({ state: 'visible' });

        // Fill in the second condition
        const secondCondition = stepCard.locator('.condition-group').nth(1);
        await secondCondition.locator('input[placeholder="value to match"]').fill('/path-b');

        // Save the funnel
        await page.click('input[type="submit"].btn');
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });

        // Verify funnel was created
        await expect(page.locator('table.entityTable')).toContainText(funnelName);
    });
});
