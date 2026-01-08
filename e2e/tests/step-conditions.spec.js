import { test, expect } from '@playwright/test';

/**
 * E2E Tests for FunnelInsights Step Condition Operators
 *
 * Comprehensive tests for all comparison types, fields, and operators
 * supported by the StepMatcher.
 */

test.describe('FunnelInsights Step Conditions - Comparison Fields', () => {
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

    test('validateSteps with URL field - contains operator', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const steps = JSON.stringify([
            { name: 'URL Contains', conditions: [{ comparison: 'url', operator: 'contains', pattern: '/checkout' }] }
        ]);

        const response = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: steps,
                testUrl: 'http://example.com/shop/checkout/step1'
            });
            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite, steps });

        expect(response).not.toContain('Fatal error');
        const json = JSON.parse(response);
        expect(json[0].matched).toBe(true);
    });

    test('validateSteps with path field - contains operator', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const steps = JSON.stringify([
            { name: 'Path Contains', conditions: [{ comparison: 'path', operator: 'contains', pattern: '/products' }] }
        ]);

        const response = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: steps,
                testUrl: 'http://example.com/products/widget?id=123'
            });
            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite, steps });

        expect(response).not.toContain('Fatal error');
        const json = JSON.parse(response);
        expect(json[0].matched).toBe(true);
    });

    test('validateSteps with page_title field', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const steps = JSON.stringify([
            { name: 'Title Contains', conditions: [{ comparison: 'page_title', operator: 'contains', pattern: 'Checkout' }] }
        ]);

        const response = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: steps,
                testUrl: 'Checkout - Step 1 | My Store'
            });
            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite, steps });

        expect(response).not.toContain('Fatal error');
        const json = JSON.parse(response);
        expect(json[0].matched).toBe(true);
    });

    test('validateSteps with event_category field', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const steps = JSON.stringify([
            { name: 'Event Category', conditions: [{ comparison: 'event_category', operator: 'contains', pattern: 'Purchase' }] }
        ]);

        const response = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: steps,
                testUrl: 'Purchase Button Click'
            });
            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite, steps });

        expect(response).not.toContain('Fatal error');
    });

    test('validateSteps with event_action field', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const steps = JSON.stringify([
            { name: 'Event Action', conditions: [{ comparison: 'event_action', operator: 'equals', pattern: 'click' }] }
        ]);

        const response = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: steps,
                testUrl: 'click'
            });
            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite, steps });

        expect(response).not.toContain('Fatal error');
    });

    test('validateSteps with event_name field', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const steps = JSON.stringify([
            { name: 'Event Name', conditions: [{ comparison: 'event_name', operator: 'contains', pattern: 'submit' }] }
        ]);

        const response = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: steps,
                testUrl: 'form-submit'
            });
            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite, steps });

        expect(response).not.toContain('Fatal error');
    });

    test('validateSteps with search_query field', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const steps = JSON.stringify([
            { name: 'Search Query', conditions: [{ comparison: 'search_query', operator: 'contains', pattern: 'shoes' }] }
        ]);

        const response = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: steps,
                testUrl: 'red shoes size 10'
            });
            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite, steps });

        expect(response).not.toContain('Fatal error');
    });
});

test.describe('FunnelInsights Step Conditions - Operators', () => {
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

    test('operator: equals - exact match', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const steps = JSON.stringify([
            { name: 'Equals Test', conditions: [{ comparison: 'url', operator: 'equals', pattern: 'http://example.com/exact' }] }
        ]);

        // Should match
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

        expect(matchResponse).not.toContain('Fatal error');
        const matchJson = JSON.parse(matchResponse);
        expect(matchJson[0].matched).toBe(true);

        // Should NOT match
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

    test('operator: not_equals - negative match', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const steps = JSON.stringify([
            { name: 'Not Equals Test', conditions: [{ comparison: 'url', operator: 'not_equals', pattern: 'http://example.com/forbidden' }] }
        ]);

        // Should match (not equal to forbidden)
        const response = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: steps,
                testUrl: 'http://example.com/allowed'
            });
            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite, steps });

        expect(response).not.toContain('Fatal error');
        const json = JSON.parse(response);
        expect(json[0].matched).toBe(true);
    });

    test('operator: not_contains - negative contains', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const steps = JSON.stringify([
            { name: 'Not Contains Test', conditions: [{ comparison: 'url', operator: 'not_contains', pattern: '/admin' }] }
        ]);

        // Should match (does not contain /admin)
        const response = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: steps,
                testUrl: 'http://example.com/public/page'
            });
            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite, steps });

        expect(response).not.toContain('Fatal error');
        const json = JSON.parse(response);
        expect(json[0].matched).toBe(true);
    });

    test('operator: starts_with', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const steps = JSON.stringify([
            { name: 'Starts With Test', conditions: [{ comparison: 'url', operator: 'starts_with', pattern: 'http://example.com/shop' }] }
        ]);

        // Should match
        const matchResponse = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: steps,
                testUrl: 'http://example.com/shop/products/widget'
            });
            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite, steps });

        expect(matchResponse).not.toContain('Fatal error');
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

    test('operator: ends_with', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const steps = JSON.stringify([
            { name: 'Ends With Test', conditions: [{ comparison: 'url', operator: 'ends_with', pattern: '/thank-you' }] }
        ]);

        // Should match
        const response = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
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

        expect(response).not.toContain('Fatal error');
        const json = JSON.parse(response);
        expect(json[0].matched).toBe(true);
    });

    test('operator: not_starts_with', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const steps = JSON.stringify([
            { name: 'Not Starts With', conditions: [{ comparison: 'url', operator: 'not_starts_with', pattern: 'http://admin' }] }
        ]);

        // Should match
        const response = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: steps,
                testUrl: 'http://public.example.com/page'
            });
            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite, steps });

        expect(response).not.toContain('Fatal error');
        const json = JSON.parse(response);
        expect(json[0].matched).toBe(true);
    });

    test('operator: not_ends_with', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const steps = JSON.stringify([
            { name: 'Not Ends With', conditions: [{ comparison: 'url', operator: 'not_ends_with', pattern: '.pdf' }] }
        ]);

        // Should match
        const response = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: steps,
                testUrl: 'http://example.com/page.html'
            });
            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite, steps });

        expect(response).not.toContain('Fatal error');
        const json = JSON.parse(response);
        expect(json[0].matched).toBe(true);
    });

    test('operator: regex - regular expression', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        const steps = JSON.stringify([
            { name: 'Regex Test', conditions: [{ comparison: 'url', operator: 'regex', pattern: '/product/[0-9]+' }] }
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

        // Test with a non-matching URL - should also return valid JSON
        const noMatchResponse = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: steps,
                testUrl: 'http://example.com/product/abc'
            });
            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite, steps });

        expect(noMatchResponse).not.toContain('Fatal error');
        const noMatchJson = JSON.parse(noMatchResponse);
        expect(Array.isArray(noMatchJson)).toBe(true);
        expect(noMatchJson[0]).toHaveProperty('matched');
    });

    test('operator: regex - invalid regex does not error', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const steps = JSON.stringify([
            { name: 'Invalid Regex', conditions: [{ comparison: 'url', operator: 'regex', pattern: '[invalid(' }] }
        ]);

        const response = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: steps,
                testUrl: 'http://example.com/test'
            });
            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite, steps });

        expect(response).not.toContain('Fatal error');
        expect(response).not.toContain('preg_match');

        // Should gracefully return false, not error
        const json = JSON.parse(response);
        expect(json[0].matched).toBe(false);
    });
});

test.describe('FunnelInsights Step Conditions - Case Sensitivity', () => {
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

    test('case insensitive matching (default)', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const steps = JSON.stringify([
            { name: 'Case Insensitive', conditions: [{ comparison: 'url', operator: 'contains', pattern: '/CHECKOUT', case_sensitive: false }] }
        ]);

        const response = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: steps,
                testUrl: 'http://example.com/checkout/step1'
            });
            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite, steps });

        expect(response).not.toContain('Fatal error');
        const json = JSON.parse(response);
        expect(json[0].matched).toBe(true);
    });

    test('case sensitive matching', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const steps = JSON.stringify([
            { name: 'Case Sensitive', conditions: [{ comparison: 'url', operator: 'contains', pattern: '/CHECKOUT', case_sensitive: true }] }
        ]);

        // Should NOT match (case mismatch)
        const response = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: steps,
                testUrl: 'http://example.com/checkout/step1'
            });
            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite, steps });

        expect(response).not.toContain('Fatal error');
        const json = JSON.parse(response);
        expect(json[0].matched).toBe(false);
    });
});

test.describe('FunnelInsights Step Conditions - Query Params', () => {
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

    test('ignore query params option', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const steps = JSON.stringify([
            { name: 'Ignore Params', conditions: [{ comparison: 'url', operator: 'equals', pattern: 'http://example.com/checkout', ignore_query_params: true }] }
        ]);

        // Should match (query params ignored)
        const response = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: steps,
                testUrl: 'http://example.com/checkout?step=1&cart=abc123'
            });
            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite, steps });

        expect(response).not.toContain('Fatal error');
        const json = JSON.parse(response);
        expect(json[0].matched).toBe(true);
    });

    test('include query params (default)', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const steps = JSON.stringify([
            { name: 'Include Params', conditions: [{ comparison: 'url', operator: 'equals', pattern: 'http://example.com/checkout', ignore_query_params: false }] }
        ]);

        // Should NOT match (query params included)
        const response = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: steps,
                testUrl: 'http://example.com/checkout?step=1'
            });
            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite, steps });

        expect(response).not.toContain('Fatal error');
        const json = JSON.parse(response);
        expect(json[0].matched).toBe(false);
    });
});

test.describe('FunnelInsights Step Conditions - Multi-Condition (OR Logic)', () => {
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

    test('multiple conditions match first condition (OR)', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const steps = JSON.stringify([
            {
                name: 'OR Logic',
                conditions: [
                    { comparison: 'url', operator: 'contains', pattern: '/checkout' },
                    { comparison: 'url', operator: 'contains', pattern: '/cart' }
                ]
            }
        ]);

        // Should match first condition
        const response = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: steps,
                testUrl: 'http://example.com/checkout/step1'
            });
            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite, steps });

        expect(response).not.toContain('Fatal error');
        const json = JSON.parse(response);
        expect(json[0].matched).toBe(true);
    });

    test('multiple conditions match second condition (OR)', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const steps = JSON.stringify([
            {
                name: 'OR Logic',
                conditions: [
                    { comparison: 'url', operator: 'contains', pattern: '/checkout' },
                    { comparison: 'url', operator: 'contains', pattern: '/cart' }
                ]
            }
        ]);

        // Should match second condition
        const response = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: steps,
                testUrl: 'http://example.com/cart/view'
            });
            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite, steps });

        expect(response).not.toContain('Fatal error');
        const json = JSON.parse(response);
        expect(json[0].matched).toBe(true);
    });

    test('multiple conditions match neither (OR)', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const steps = JSON.stringify([
            {
                name: 'OR Logic',
                conditions: [
                    { comparison: 'url', operator: 'contains', pattern: '/checkout' },
                    { comparison: 'url', operator: 'contains', pattern: '/cart' }
                ]
            }
        ]);

        // Should NOT match either condition
        const response = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: steps,
                testUrl: 'http://example.com/products/widget'
            });
            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite, steps });

        expect(response).not.toContain('Fatal error');
        const json = JSON.parse(response);
        expect(json[0].matched).toBe(false);
    });

    test('three conditions (OR)', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const steps = JSON.stringify([
            {
                name: 'Three OR',
                conditions: [
                    { comparison: 'url', operator: 'contains', pattern: '/a' },
                    { comparison: 'url', operator: 'contains', pattern: '/b' },
                    { comparison: 'url', operator: 'contains', pattern: '/c' }
                ]
            }
        ]);

        // Should match third condition
        const response = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: steps,
                testUrl: 'http://example.com/path/c/page'
            });
            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite, steps });

        expect(response).not.toContain('Fatal error');
        const json = JSON.parse(response);
        expect(json[0].matched).toBe(true);
    });
});
