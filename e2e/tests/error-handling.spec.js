import { test, expect } from '@playwright/test';

/**
 * E2E Tests for FunnelInsights Error Handling
 *
 * Tests error scenarios, invalid inputs, permission errors, and graceful degradation.
 */

test.describe('FunnelInsights Error Handling - Invalid Parameters', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const idSite = process.env.MATOMO_IDSITE || '1';

    test('API: getFunnelReport with negative idFunnel', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnelReport',
                idSite: idSite,
                period: 'day',
                date: 'yesterday',
                idFunnel: -1,
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('SQL syntax');
        expect(text).not.toContain('mysql_');
    });

    test('API: getFunnelReport with string idFunnel', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnelReport',
                idSite: idSite,
                period: 'day',
                date: 'yesterday',
                idFunnel: 'invalid',
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('SQL syntax');
    });

    test('API: getFunnelReport with very large idFunnel', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnelReport',
                idSite: idSite,
                period: 'day',
                date: 'yesterday',
                idFunnel: 999999999,
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        // Should return empty or error response, not crash
    });

    test('API: getOverview with invalid idSite', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: 'invalid',
                period: 'day',
                date: 'yesterday',
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        // Should handle invalid site gracefully
    });

    test('API: getOverview with negative idSite', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: -1,
                period: 'day',
                date: 'yesterday',
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
    });

    test('API: getOverview with invalid period', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'invalid_period',
                date: 'yesterday',
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        // Should return error message, not crash
    });

    test('API: getOverview with invalid date', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'day',
                date: 'not-a-date',
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
    });

    test('API: getOverview with future date', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'day',
                date: '2099-01-01',
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        // Should handle future date gracefully
    });

    test('API: getOverview with invalid format', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'day',
                date: 'yesterday',
                format: 'INVALID_FORMAT',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
    });
});

test.describe('FunnelInsights Error Handling - SQL Injection Prevention', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const idSite = process.env.MATOMO_IDSITE || '1';

    test('SQL injection: idFunnel parameter', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnelReport',
                idSite: idSite,
                period: 'day',
                date: 'yesterday',
                idFunnel: "1'; DROP TABLE--",
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('SQL syntax');
        expect(text).not.toContain('mysql_');
        expect(text).not.toContain('Query failed');
    });

    test('SQL injection: idSite parameter', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: "1 OR 1=1--",
                period: 'day',
                date: 'yesterday',
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('SQL syntax');
    });

    test('SQL injection: date parameter', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'day',
                date: "yesterday'; DROP TABLE--",
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('SQL syntax');
    });
});

test.describe('FunnelInsights Error Handling - XSS Prevention', () => {
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

    test('XSS: funnel name input is escaped in output', async ({ page }) => {
        const xssName = `<script>alert('XSS')</script>Test ${Date.now()}`;

        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        await page.fill('input#name', xssName);

        await page.click('.funnel-editor button:has-text("+ Add Step")');
        await page.waitForSelector('.step-card');
        const stepCard = page.locator('.step-card').first();
        await stepCard.locator('input[placeholder="e.g. Landing Page"]').fill('XSS Step');
        await stepCard.locator('input[placeholder="value to match"]').fill('/xss');

        await page.click('input[type="submit"].btn');
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });

        const content = await page.content();
        expect(content).not.toContain('Fatal error');

        // The script tag should be escaped or stripped
        expect(content).not.toContain('<script>alert');

        // Cleanup
        page.on('dialog', dialog => dialog.accept());
        const row = page.locator('tr:has-text("XSS")').first();
        if (await row.count() > 0) {
            await row.locator('a.icon-delete').click();
            await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });
        }
    });

    test('XSS: step name is escaped', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        const funnelName = `XSS Step Test ${Date.now()}`;
        await page.fill('input#name', funnelName);

        await page.click('.funnel-editor button:has-text("+ Add Step")');
        await page.waitForSelector('.step-card');
        const stepCard = page.locator('.step-card').first();
        await stepCard.locator('input[placeholder="e.g. Landing Page"]').fill('<img src=x onerror=alert(1)>');
        await stepCard.locator('input[placeholder="value to match"]').fill('/xss-step');

        await page.click('input[type="submit"].btn');
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });

        const content = await page.content();
        expect(content).not.toContain('Fatal error');
        expect(content).not.toContain('onerror=alert');

        // Cleanup
        page.on('dialog', dialog => dialog.accept());
        const row = page.locator(`tr:has-text("${funnelName}")`);
        await row.locator('a.icon-delete').click();
        await page.waitForURL(/module=FunnelInsights.*action=manage/, { timeout: 30000 });
    });
});

test.describe('FunnelInsights Error Handling - Controller Errors', () => {
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

    test('Controller: non-existent action', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=nonExistentAction&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const content = await page.content();
        expect(content).not.toContain('Fatal error');
        // Should show error page or redirect
    });

    test('Controller: missing idSite parameter', async ({ page }) => {
        const response = await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=index`);

        const content = await page.content();
        expect(content).not.toContain('Fatal error');
        // Should handle missing idSite
    });

    test('Controller: invalid idSite value', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=index&idSite=invalid`);
        await page.waitForLoadState('networkidle');

        const content = await page.content();
        expect(content).not.toContain('Fatal error');
    });

    test('Controller: viewFunnel without idFunnel', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=viewFunnel&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const content = await page.content();
        expect(content).not.toContain('Fatal error');
        // Should redirect or show error message
    });

    test('Controller: edit without idFunnel creates new funnel form', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.funnel-editor', { timeout: 15000 });

        const content = await page.content();
        expect(content).not.toContain('Fatal error');

        // Name field should be empty (new funnel)
        const nameInput = page.locator('input#name');
        const nameValue = await nameInput.inputValue();
        expect(nameValue).toBe('');
    });

    test('Controller: delete without idFunnel', async ({ page }) => {
        const response = await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=delete&idSite=${idSite}`);

        const content = await page.content();
        expect(content).not.toContain('Fatal error');
    });

    test('Controller: duplicate without idFunnel', async ({ page }) => {
        const response = await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=duplicate&idSite=${idSite}`);

        const content = await page.content();
        expect(content).not.toContain('Fatal error');
    });
});

test.describe('FunnelInsights Error Handling - validateSteps Errors', () => {
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

    test('validateSteps: empty steps JSON', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const response = await page.evaluate(async ({ matomoUrl, idSite }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: '[]',
                testUrl: 'http://example.com'
            });
            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite });

        expect(response).not.toContain('Fatal error');
        // Should return empty array or handle gracefully
        expect(() => JSON.parse(response)).not.toThrow();
    });

    test('validateSteps: invalid JSON steps', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const response = await page.evaluate(async ({ matomoUrl, idSite }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: '{invalid json',
                testUrl: 'http://example.com'
            });
            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite });

        expect(response).not.toContain('Fatal error');
    });

    test('validateSteps: missing testUrl', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const steps = JSON.stringify([
            { name: 'Test', conditions: [{ comparison: 'url', operator: 'contains', pattern: '/test' }] }
        ]);

        const response = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: steps
                // Missing testUrl
            });
            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite, steps });

        expect(response).not.toContain('Fatal error');
    });

    test('validateSteps: empty testUrl', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const steps = JSON.stringify([
            { name: 'Test', conditions: [{ comparison: 'url', operator: 'contains', pattern: '/test' }] }
        ]);

        const response = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: steps,
                testUrl: ''
            });
            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite, steps });

        expect(response).not.toContain('Fatal error');
    });

    test('validateSteps: step with missing conditions', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const steps = JSON.stringify([
            { name: 'No Conditions' }
        ]);

        const response = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: steps,
                testUrl: 'http://example.com'
            });
            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite, steps });

        expect(response).not.toContain('Fatal error');
    });

    test('validateSteps: condition with invalid comparison field', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const steps = JSON.stringify([
            { name: 'Invalid Field', conditions: [{ comparison: 'invalid_field', operator: 'contains', pattern: 'test' }] }
        ]);

        const response = await page.evaluate(async ({ matomoUrl, idSite, steps }) => {
            const params = new URLSearchParams({
                module: 'FunnelInsights',
                action: 'validateSteps',
                idSite: idSite,
                steps: steps,
                testUrl: 'http://example.com'
            });
            const res = await fetch(`${matomoUrl}/index.php?${params.toString()}`);
            return await res.text();
        }, { matomoUrl, idSite, steps });

        expect(response).not.toContain('Fatal error');
        // Should return matched: false for invalid field
    });

    test('validateSteps: condition with invalid operator', async ({ page }) => {
        await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}`);
        await page.waitForLoadState('networkidle');

        const steps = JSON.stringify([
            { name: 'Invalid Operator', conditions: [{ comparison: 'url', operator: 'invalid_op', pattern: 'test' }] }
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
        // Should return matched: false for invalid operator
    });
});

test.describe('FunnelInsights Error Handling - Rate Limiting', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const idSite = process.env.MATOMO_IDSITE || '1';

    test('API: multiple rapid requests do not crash', async ({ request }) => {
        const requests = [];

        for (let i = 0; i < 10; i++) {
            requests.push(
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

        const responses = await Promise.all(requests);

        for (const response of responses) {
            const text = await response.text();
            expect(text).not.toContain('Fatal error');
            expect(text).not.toContain('Maximum execution time');
        }
    });
});
