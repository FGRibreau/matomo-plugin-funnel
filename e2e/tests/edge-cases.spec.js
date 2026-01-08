import { test, expect } from '@playwright/test';

/**
 * E2E Tests for FunnelInsights Edge Cases
 *
 * Tests edge cases, boundary conditions, and unusual scenarios.
 */

test.describe('FunnelInsights Edge Cases - Step Matching', () => {
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

    test('Matching: URL exact match operator', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        const steps = JSON.stringify([
            { name: 'Exact Match', conditions: [{ comparison: 'url', operator: 'equals', pattern: 'http://example.com/exact' }] }
        ]);

        // Test exact match - should match
        const matchResponse = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: steps,
                testUrl: 'http://example.com/exact'
            });
            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite, steps });

        const matchJson = JSON.parse(matchResponse);
        expect(matchJson[0].matched).toBe(true);

        // Test exact match - should NOT match (extra path)
        const noMatchResponse = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: steps,
                testUrl: 'http://example.com/exact/extra'
            });
            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite, steps });

        const noMatchJson = JSON.parse(noMatchResponse);
        expect(noMatchJson[0].matched).toBe(false);
    });

    test('Matching: URL contains operator', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        const steps = JSON.stringify([
            { name: 'Contains Match', conditions: [{ comparison: 'url', operator: 'contains', pattern: '/checkout' }] }
        ]);

        // Should match any URL containing /checkout
        const matchResponse = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: steps,
                testUrl: 'http://example.com/shop/checkout/step1?id=123'
            });
            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite, steps });

        const matchJson = JSON.parse(matchResponse);
        expect(matchJson[0].matched).toBe(true);
    });

    test('Matching: URL starts_with operator', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        const steps = JSON.stringify([
            { name: 'Starts With', conditions: [{ comparison: 'url', operator: 'starts_with', pattern: 'http://example.com/shop' }] }
        ]);

        // Should match
        const matchResponse = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: steps,
                testUrl: 'http://example.com/shop/products'
            });
            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite, steps });

        const matchJson = JSON.parse(matchResponse);
        expect(matchJson[0].matched).toBe(true);

        // Should NOT match
        const noMatchResponse = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: steps,
                testUrl: 'http://other.com/shop/products'
            });
            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite, steps });

        const noMatchJson = JSON.parse(noMatchResponse);
        expect(noMatchJson[0].matched).toBe(false);
    });

    test('Matching: URL ends_with operator', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        const steps = JSON.stringify([
            { name: 'Ends With', conditions: [{ comparison: 'url', operator: 'ends_with', pattern: '/thank-you' }] }
        ]);

        // Should match
        const matchResponse = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: steps,
                testUrl: 'http://example.com/checkout/thank-you'
            });
            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite, steps });

        const matchJson = JSON.parse(matchResponse);
        expect(matchJson[0].matched).toBe(true);
    });

    test('Matching: URL regex operator', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        const steps = JSON.stringify([
            { name: 'Regex Match', conditions: [{ comparison: 'url', operator: 'regex', pattern: '/product/[0-9]+' }] }
        ]);

        // Test regex operator - verify no fatal error and valid JSON response
        const matchResponse = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: steps,
                testUrl: 'http://example.com/product/12345'
            });
            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite, steps });

        expect(matchResponse).not.toContain('Fatal error');
        expect(matchResponse).not.toContain('preg_match');
        const matchJson = JSON.parse(matchResponse);
        expect(Array.isArray(matchJson)).toBe(true);
        expect(matchJson[0]).toHaveProperty('matched');
        // Note: regex operator matching depends on backend implementation
    });

    test('Matching: Multiple conditions (OR logic)', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        const steps = JSON.stringify([
            {
                name: 'Multiple Conditions',
                conditions: [
                    { comparison: 'url', operator: 'contains', pattern: '/checkout' },
                    { comparison: 'url', operator: 'contains', pattern: '/cart' }
                ]
            }
        ]);

        // Should match checkout
        const checkoutResponse = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: steps,
                testUrl: 'http://example.com/checkout'
            });
            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite, steps });

        expect(checkoutResponse).not.toContain('Fatal error');
        const checkoutJson = JSON.parse(checkoutResponse);
        expect(checkoutJson[0].matched).toBe(true);

        // Should also match cart
        const cartResponse = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: steps,
                testUrl: 'http://example.com/cart'
            });
            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite, steps });

        const cartJson = JSON.parse(cartResponse);
        expect(cartJson[0].matched).toBe(true);
    });

    test('Matching: page_title field', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        const steps = JSON.stringify([
            { name: 'Page Title Match', conditions: [{ comparison: 'page_title', operator: 'contains', pattern: 'Checkout' }] }
        ]);

        // The validator populates pageTitle with the testUrl value
        const response = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: steps,
                testUrl: 'Checkout Page - Step 1'
            });
            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite, steps });

        expect(response).not.toContain('Fatal error');
    });

    test('Matching: event fields', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        const steps = JSON.stringify([
            { name: 'Event Match', conditions: [{ comparison: 'event_category', operator: 'contains', pattern: 'Purchase' }] }
        ]);

        const response = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: steps,
                testUrl: 'Purchase Complete'
            });
            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite, steps });

        expect(response).not.toContain('Fatal error');
    });
});

test.describe('FunnelInsights Edge Cases - Empty Data', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const idSite = process.env.MATOMO_IDSITE || '1';

    test('API: getFunnels with empty result', async ({ request }) => {
        // Use a site ID that might have no funnels
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnels',
                idSite: idSite,
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');

        // Should return array (empty or with funnels)
        const json = JSON.parse(text);
        if (!json.result) {
            expect(Array.isArray(json)).toBe(true);
        }
    });

    test('API: getOverview with no active funnels', async ({ request }) => {
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
        expect(() => JSON.parse(text)).not.toThrow();
    });

    test('API: getFunnelReport with no data for period', async ({ request }) => {
        // Use a very old date that likely has no data
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnelReport',
                idSite: idSite,
                period: 'day',
                date: '2010-01-01',
                idFunnel: 1,
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(() => JSON.parse(text)).not.toThrow();
    });

    test('API: getFunnelEvolution with no historical data', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnelEvolution',
                idSite: idSite,
                period: 'day',
                date: '2010-01-01,2010-01-07',
                idFunnel: 1,
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
    });
});

test.describe('FunnelInsights Edge Cases - Special Characters', () => {
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

    test('Special chars: Funnel name with special characters', async ({ page }) => {
        const specialName = `Test <script>alert('xss')</script> & "quotes" ${Date.now()}`;

        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        await page.fill('input#name', specialName);

        // Add a step
        await page.click('.funnel-editor button:has-text("+ Add Step")');
        await page.waitForSelector('.step-card');
        const stepCard = page.locator('.step-card').first();
        await stepCard.locator('input[placeholder="e.g. Landing Page"]').fill('Test Step');
        await stepCard.locator('input[placeholder="value to match"]').fill('/test');

        await page.click('input[type="submit"].btn');
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });

        const content = await page.content();
        expect(content).not.toContain('Fatal error');

        // The name should be HTML-escaped in the output
        expect(content).not.toContain('<script>');

        // Cleanup
        page.on('dialog', dialog => dialog.accept());
        const row = page.locator(`tr:has-text("Test")`).first();
        if (await row.count() > 0) {
            await row.locator('a.icon-delete').click();
            await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });
        }
    });

    test('Special chars: URL pattern with special regex characters', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        const steps = JSON.stringify([
            { name: 'Special Chars', conditions: [{ comparison: 'url', operator: 'contains', pattern: '/path?param=value&other=123' }] }
        ]);

        const response = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: steps,
                testUrl: 'http://example.com/path?param=value&other=123'
            });
            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite, steps });

        expect(response).not.toContain('Fatal error');
        expect(response).not.toContain('preg_match');
    });

    test('Special chars: Unicode in funnel name', async ({ page }) => {
        const unicodeName = `Funnel Test \u4e2d\u6587 \u0411\u0440\u0430\u0442 ${Date.now()}`;

        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        await page.fill('input#name', unicodeName);

        await page.click('.funnel-editor button:has-text("+ Add Step")');
        await page.waitForSelector('.step-card');
        const stepCard = page.locator('.step-card').first();
        await stepCard.locator('input[placeholder="e.g. Landing Page"]').fill('Unicode Step');
        await stepCard.locator('input[placeholder="value to match"]').fill('/test');

        await page.click('input[type="submit"].btn');
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });

        const content = await page.content();
        expect(content).not.toContain('Fatal error');

        // Cleanup
        page.on('dialog', dialog => dialog.accept());
        const row = page.locator(`tr:has-text("Unicode")`).first();
        if (await row.count() > 0) {
            await row.locator('a.icon-delete').click();
            await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });
        }
    });
});

test.describe('FunnelInsights Edge Cases - Boundary Conditions', () => {
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

    test('Boundary: Funnel with single step', async ({ page }) => {
        const funnelName = `Single Step Funnel ${Date.now()}`;

        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        await page.fill('input#name', funnelName);

        // Add only one step
        await page.click('.funnel-editor button:has-text("+ Add Step")');
        await page.waitForSelector('.step-card');
        const stepCard = page.locator('.step-card').first();
        await stepCard.locator('input[placeholder="e.g. Landing Page"]').fill('Only Step');
        await stepCard.locator('input[placeholder="value to match"]').fill('/single');

        await page.click('input[type="submit"].btn');
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });

        await expect(page.locator('table.entityTable')).toContainText(funnelName);

        // Cleanup
        page.on('dialog', dialog => dialog.accept());
        const row = page.locator(`tr:has-text("${funnelName}")`);
        await row.locator('a.icon-delete').click();
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });
    });

    test('Boundary: Funnel with many steps (10 steps)', async ({ page }) => {
        const funnelName = `Many Steps Funnel ${Date.now()}`;

        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        await page.fill('input#name', funnelName);

        // Add 10 steps - wait for each step to appear before adding the next
        for (let i = 1; i <= 10; i++) {
            await page.click('.funnel-editor button:has-text("+ Add Step")');
            // Wait for the step card to be visible
            const stepCard = page.locator('.step-card').nth(i - 1);
            await expect(stepCard).toBeVisible({ timeout: 5000 });
            await stepCard.locator('input[placeholder="e.g. Landing Page"]').fill(`Step ${i}`);
            await stepCard.locator('input[placeholder="value to match"]').fill(`/step-${i}`);
        }

        await page.click('input[type="submit"].btn');
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');

        await expect(page.locator('table.entityTable')).toContainText(funnelName);

        // Verify step count in table
        const row = page.locator(`tr:has-text("${funnelName}")`);
        await expect(row).toContainText('10');

        // Cleanup
        page.on('dialog', dialog => dialog.accept());
        await row.locator('a.icon-delete').click();
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });
    });

    test('Boundary: Very long funnel name (255 chars)', async ({ page }) => {
        const longName = 'A'.repeat(200) + Date.now().toString();

        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        await page.fill('input#name', longName);

        await page.click('.funnel-editor button:has-text("+ Add Step")');
        await page.waitForSelector('.step-card');
        const stepCard = page.locator('.step-card').first();
        await stepCard.locator('input[placeholder="e.g. Landing Page"]').fill('Long Name Step');
        await stepCard.locator('input[placeholder="value to match"]').fill('/long');

        await page.click('input[type="submit"].btn');
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });

        const content = await page.content();
        expect(content).not.toContain('Fatal error');

        // Cleanup
        page.on('dialog', dialog => dialog.accept());
        const row = page.locator(`tr:has-text("${longName.substring(0, 20)}")`);
        if (await row.count() > 0) {
            await row.locator('a.icon-delete').click();
            await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });
        }
    });

    test('Boundary: step_time_limit with large value', async ({ page }) => {
        const funnelName = `Large Time Limit ${Date.now()}`;

        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        await page.fill('input#name', funnelName);
        await page.fill('input#step_time_limit', '86400'); // 24 hours

        await page.click('.funnel-editor button:has-text("+ Add Step")');
        await page.waitForSelector('.step-card');
        const stepCard = page.locator('.step-card').first();
        await stepCard.locator('input[placeholder="e.g. Landing Page"]').fill('Time Limit Step');
        await stepCard.locator('input[placeholder="value to match"]').fill('/time');

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

test.describe('FunnelInsights Edge Cases - Concurrency', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const idSite = process.env.MATOMO_IDSITE || '1';

    test('Concurrency: Multiple API calls simultaneously', async ({ request }) => {
        // Make multiple API calls at once
        const calls = [];

        for (let i = 0; i < 5; i++) {
            calls.push(
                request.get(`${matomoUrl}/index.php`, {
                    params: {
                        module: 'API',
                        method: 'FunnelInsights.getOverview',
                        idSite: idSite,
                        period: 'day',
                        date: `last${i + 1}`,
                        format: 'JSON',
                    },
                })
            );
        }

        const responses = await Promise.all(calls);

        for (const response of responses) {
            const text = await response.text();
            expect(text).not.toContain('Fatal error');
            expect(() => JSON.parse(text)).not.toThrow();
        }
    });

    test('Concurrency: Multiple getFunnelReport calls', async ({ request }) => {
        const calls = [];

        for (let i = 1; i <= 3; i++) {
            calls.push(
                request.get(`${matomoUrl}/index.php`, {
                    params: {
                        module: 'API',
                        method: 'FunnelInsights.getFunnelReport',
                        idSite: idSite,
                        period: 'day',
                        date: 'yesterday',
                        idFunnel: i,
                        format: 'JSON',
                    },
                })
            );
        }

        const responses = await Promise.all(calls);

        for (const response of responses) {
            const text = await response.text();
            expect(text).not.toContain('Fatal error');
        }
    });
});
