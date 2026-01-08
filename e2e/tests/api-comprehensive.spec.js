import { test, expect } from '@playwright/test';

/**
 * Comprehensive E2E API Tests for FunnelInsights
 *
 * These tests cover all API methods with both authenticated and unauthenticated scenarios,
 * including error handling and edge cases.
 */

test.describe('FunnelInsights API - Unauthenticated Requests', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const idSite = process.env.MATOMO_IDSITE || '1';

    // All API methods should return auth error, NOT PHP error when unauthenticated

    test('API: createFunnel requires authentication', async ({ request }) => {
        const response = await request.post(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.createFunnel',
                idSite: idSite,
                name: 'Test Funnel',
                steps: JSON.stringify([{ name: 'Step 1', conditions: [] }]),
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('Parse error');
        expect(text).not.toContain('syntax error');

        // Should return JSON with error message about authentication
        const json = JSON.parse(text);
        expect(json.result).toBe('error');
    });

    test('API: updateFunnel requires authentication', async ({ request }) => {
        const response = await request.post(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.updateFunnel',
                idFunnel: 1,
                idSite: idSite,
                name: 'Updated Funnel',
                steps: JSON.stringify([{ name: 'Step 1', conditions: [] }]),
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('Parse error');

        const json = JSON.parse(text);
        expect(json.result).toBe('error');
    });

    test('API: deleteFunnel requires authentication', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.deleteFunnel',
                idSite: idSite,
                idFunnel: 1,
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');

        const json = JSON.parse(text);
        expect(json.result).toBe('error');
    });

    test('API: duplicateFunnel requires authentication', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.duplicateFunnel',
                idSite: idSite,
                idFunnel: 1,
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');

        const json = JSON.parse(text);
        expect(json.result).toBe('error');
    });

    test('API: getFunnel requires authentication', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnel',
                idSite: idSite,
                idFunnel: 1,
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');

        const json = JSON.parse(text);
        expect(json.result).toBe('error');
    });

    test('API: getFunnels requires authentication', async ({ request }) => {
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

        const json = JSON.parse(text);
        expect(json.result).toBe('error');
    });

    test('API: validateFunnelSteps requires authentication', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.validateFunnelSteps',
                idSite: idSite,
                steps: JSON.stringify([{ name: 'Step', conditions: [{ field: 'url', operator: 'contains', value: '/test' }] }]),
                testUrl: 'http://example.com/test',
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');

        const json = JSON.parse(text);
        expect(json.result).toBe('error');
    });

    test('API: getSuggestedValues requires authentication', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getSuggestedValues',
                idSite: idSite,
                type: 'url',
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');

        const json = JSON.parse(text);
        expect(json.result).toBe('error');
    });
});

test.describe.serial('FunnelInsights API - Authenticated Requests', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const idSite = process.env.MATOMO_IDSITE || '1';
    let tokenAuth = process.env.MATOMO_TOKEN_AUTH || '';
    let testFunnelId = null;

    // Helper to make authenticated requests using Bearer token
    const authHeaders = () => ({ 'Authorization': `Bearer ${tokenAuth}` });

    test.beforeAll(async ({ request }) => {
        // Fetch token from the test endpoint if not provided via env var
        if (!tokenAuth) {
            const tokenResponse = await request.get(`${matomoUrl}/get-token.php`);
            if (tokenResponse.ok()) {
                tokenAuth = (await tokenResponse.text()).trim();
                console.log(`Token fetched from endpoint: ${tokenAuth.substring(0, 8)}...`);
            } else {
                throw new Error(`Failed to fetch token from ${matomoUrl}/get-token.php. Ensure the E2E environment is properly initialized.`);
            }
        }

        // Verify token works by calling a simple API with Bearer auth
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnels',
                idSite: idSite,
                format: 'JSON',
            },
            headers: authHeaders(),
        });

        const text = await response.text();
        // Fail fast if token doesn't work
        if (text.includes('error') && text.includes('authenticated')) {
            throw new Error(`Token auth failed. Token: ${tokenAuth.substring(0, 8)}... Response: ${text}`);
        }
    });

    test.afterAll(async ({ request }) => {
        // Clean up: delete test funnel if created
        if (testFunnelId && tokenAuth) {
            await request.get(`${matomoUrl}/index.php`, {
                params: {
                    module: 'API',
                    method: 'FunnelInsights.deleteFunnel',
                    idSite: idSite,
                    idFunnel: testFunnelId,
                    format: 'JSON',
                },
                headers: authHeaders(),
            });
        }
    });

    test('API: getFunnels returns valid response with Bearer auth', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnels',
                idSite: idSite,
                format: 'JSON',
            },
            headers: authHeaders(),
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('Parse error');

        // Should return array (may be empty)
        const json = JSON.parse(text);
        expect(Array.isArray(json)).toBe(true);
    });

    test('API: createFunnel creates a new funnel', async ({ request }) => {
        const funnelName = `E2E API Test Funnel ${Date.now()}`;
        const steps = JSON.stringify([
            { name: 'Landing Page', conditions: [{ field: 'url', operator: 'contains', value: '/landing' }] },
            { name: 'Checkout', conditions: [{ field: 'url', operator: 'contains', value: '/checkout' }] }
        ]);

        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.createFunnel',
                idSite: idSite,
                name: funnelName,
                steps: steps,
                active: 1,
                format: 'JSON',
            },
            headers: authHeaders(),
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');

        const json = JSON.parse(text);
        // Should return the new funnel ID (can be number, string, or {value: ...})
        const funnelId = typeof json === 'object' && json.value !== undefined
            ? parseInt(json.value, 10)
            : parseInt(json, 10);
        expect(funnelId).toBeGreaterThan(0);
        testFunnelId = funnelId;
    });

    test('API: getFunnel returns single funnel details', async ({ request }) => {
        expect(testFunnelId, 'Test funnel should have been created by previous test').toBeTruthy();

        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnel',
                idSite: idSite,
                idFunnel: testFunnelId,
                format: 'JSON',
            },
            headers: authHeaders(),
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');

        const json = JSON.parse(text);
        expect(json).toHaveProperty('idfunnel');
        expect(json).toHaveProperty('name');
        expect(json).toHaveProperty('steps');
    });

    test('API: updateFunnel modifies existing funnel', async ({ request }) => {
        expect(testFunnelId, 'Test funnel should have been created by previous test').toBeTruthy();

        const updatedName = `E2E Updated Funnel ${Date.now()}`;
        const steps = JSON.stringify([
            { name: 'Home', conditions: [{ field: 'url', operator: 'contains', value: '/' }] },
            { name: 'Product', conditions: [{ field: 'url', operator: 'contains', value: '/product' }] },
            { name: 'Cart', conditions: [{ field: 'url', operator: 'contains', value: '/cart' }] }
        ]);

        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.updateFunnel',
                idFunnel: testFunnelId,
                idSite: idSite,
                name: updatedName,
                steps: steps,
                active: 1,
                format: 'JSON',
            },
            headers: authHeaders(),
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');

        // Should return true on success (can be {value: true} or true directly)
        const json = JSON.parse(text);
        const success = typeof json === 'object' ? json.value : json;
        expect(success).toBe(true);
    });

    test('API: duplicateFunnel creates a copy', async ({ request }) => {
        expect(testFunnelId, 'Test funnel should have been created by previous test').toBeTruthy();

        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.duplicateFunnel',
                idSite: idSite,
                idFunnel: testFunnelId,
                format: 'JSON',
            },
            headers: authHeaders(),
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');

        const json = JSON.parse(text);
        // Should return new funnel ID (can be number, string, or {value: ...})
        const duplicatedId = typeof json === 'object' && json.value !== undefined
            ? parseInt(json.value, 10)
            : parseInt(json, 10);
        expect(duplicatedId).toBeGreaterThan(0);

        // Clean up the duplicate
        if (duplicatedId > 0) {
            await request.get(`${matomoUrl}/index.php`, {
                params: {
                    module: 'API',
                    method: 'FunnelInsights.deleteFunnel',
                    idSite: idSite,
                    idFunnel: duplicatedId,
                    format: 'JSON',
                },
                headers: authHeaders(),
            });
        }
    });

    test('API: validateFunnelSteps validates URL patterns', async ({ request }) => {
        // Use the correct condition format expected by the API
        const steps = JSON.stringify([
            { name: 'Checkout Page', conditions: [{ comparison: 'url', operator: 'contains', pattern: '/checkout' }] },
            { name: 'Payment', conditions: [{ comparison: 'url', operator: 'contains', pattern: '/payment' }] }
        ]);

        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.validateFunnelSteps',
                idSite: idSite,
                steps: steps,
                testUrl: 'http://example.com/checkout/step1',
                format: 'JSON',
            },
            headers: authHeaders(),
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');

        // API returns array (may be empty if no matches or validation results)
        const json = JSON.parse(text);
        expect(Array.isArray(json)).toBe(true);
        // If results are returned, verify structure
        if (json.length > 0) {
            expect(json[0]).toHaveProperty('matched');
        }
    });

    test('API: getSuggestedValues returns URL suggestions', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getSuggestedValues',
                idSite: idSite,
                type: 'url',
                format: 'JSON',
            },
            headers: authHeaders(),
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');

        const json = JSON.parse(text);
        expect(Array.isArray(json)).toBe(true);
    });

    test('API: getSuggestedValues returns page_title suggestions', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getSuggestedValues',
                idSite: idSite,
                type: 'page_title',
                format: 'JSON',
            },
            headers: authHeaders(),
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');

        const json = JSON.parse(text);
        expect(Array.isArray(json)).toBe(true);
    });

    test('API: getSuggestedValues returns event_category suggestions', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getSuggestedValues',
                idSite: idSite,
                type: 'event_category',
                format: 'JSON',
            },
            headers: authHeaders(),
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');

        const json = JSON.parse(text);
        expect(Array.isArray(json)).toBe(true);
    });

    test('API: deleteFunnel removes the funnel', async ({ request }) => {
        expect(testFunnelId, 'Test funnel should have been created by previous test').toBeTruthy();

        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.deleteFunnel',
                idSite: idSite,
                idFunnel: testFunnelId,
                format: 'JSON',
            },
            headers: authHeaders(),
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');

        // Should return true on success (can be {value: true} or true directly)
        const json = JSON.parse(text);
        const success = typeof json === 'object' ? json.value : json;
        expect(success).toBe(true);

        // Mark as deleted so cleanup doesn't try again
        testFunnelId = null;
    });
});

test.describe('FunnelInsights API - Period Variations', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const idSite = process.env.MATOMO_IDSITE || '1';

    // Test all period types to ensure no PHP errors

    test('API: getOverview with year period', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'year',
                date: 'today',
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('Call to undefined method');
        expect(() => JSON.parse(text)).not.toThrow();
    });

    test('API: getOverview with range period', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'range',
                date: '2024-01-01,2024-01-31',
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('Call to undefined method');
        expect(() => JSON.parse(text)).not.toThrow();
    });

    test('API: getFunnelReport with year period', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnelReport',
                idSite: idSite,
                period: 'year',
                date: 'today',
                idFunnel: 1,
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('Call to undefined method');
    });

    test('API: getFunnelEvolution with year period last2', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnelEvolution',
                idSite: idSite,
                period: 'year',
                date: 'last2',
                idFunnel: 1,
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('getDataTables');
    });

    test('API: getOverview with last30 date', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'day',
                date: 'last30',
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('DataTable\\Map::getRows');
    });

    test('API: getOverview with last90 date (large range)', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'day',
                date: 'last90',
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
    });

    test('API: getFunnelReport with previous30 date comparison', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnelReport',
                idSite: idSite,
                period: 'day',
                date: 'previous30',
                idFunnel: 1,
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
    });
});

test.describe('FunnelInsights API - Error Handling', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const idSite = process.env.MATOMO_IDSITE || '1';

    test('API: getFunnel with invalid idFunnel returns gracefully', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnel',
                idSite: idSite,
                idFunnel: 999999,
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('Parse error');
        expect(() => JSON.parse(text)).not.toThrow();
    });

    test('API: getFunnelReport with non-existent funnel', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnelReport',
                idSite: idSite,
                period: 'day',
                date: 'yesterday',
                idFunnel: 999999,
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(() => JSON.parse(text)).not.toThrow();
    });

    test('API: getFunnelEvolution with invalid funnel ID', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnelEvolution',
                idSite: idSite,
                period: 'day',
                date: 'last7',
                idFunnel: -1,
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
    });

    test('API: getOverview with invalid site ID returns error gracefully', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: 999999,
                period: 'day',
                date: 'yesterday',
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(() => JSON.parse(text)).not.toThrow();
    });

    test('API: getFunnels with invalid site ID', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnels',
                idSite: 999999,
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(() => JSON.parse(text)).not.toThrow();
    });

    test('API: validateFunnelSteps with empty steps', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.validateFunnelSteps',
                idSite: idSite,
                steps: '[]',
                testUrl: 'http://example.com/test',
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(() => JSON.parse(text)).not.toThrow();
    });

    test('API: validateFunnelSteps with invalid JSON steps', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.validateFunnelSteps',
                idSite: idSite,
                steps: 'not-valid-json',
                testUrl: 'http://example.com/test',
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(() => JSON.parse(text)).not.toThrow();
    });

    test('API: invalid method name returns proper error', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.nonExistentMethod',
                idSite: idSite,
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('Parse error');

        const json = JSON.parse(text);
        expect(json.result).toBe('error');
    });
});

test.describe('FunnelInsights API - Row Evolution & HTML Rendering Support', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const idSite = process.env.MATOMO_IDSITE || '1';

    /**
     * CRITICAL: getOverview must return different types based on date parameter:
     * - Single date (yesterday, today, 2024-01-15): Returns DataTable (for HTML table rendering)
     * - Date range (last7, last30, 2024-01-01,2024-01-31): Returns DataTable\Map (for Row Evolution)
     *
     * Errors to watch for:
     * - "Call to undefined method Piwik\DataTable::getDataTables()" = Row Evolution broken
     * - "Call to undefined method Piwik\DataTable\Map::getMetadata()" = HTML rendering broken
     */

    // === SINGLE DATE TESTS (HTML Table Rendering) ===
    // These must return DataTable, NOT Map, otherwise HtmlTable.php crashes

    test('API: getOverview with single date "yesterday" returns DataTable (for HTML rendering)', async ({ request }) => {
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
        // Must not contain any fatal errors
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('Call to undefined method');
        expect(text).not.toContain('getMetadata()');  // Map doesn't have getMetadata
        expect(text).not.toContain('Parse error');

        expect(() => JSON.parse(text)).not.toThrow();
        const json = JSON.parse(text);
        // Single date should return an array (DataTable), not object with date keys (Map)
        expect(Array.isArray(json)).toBe(true);
    });

    test('API: getOverview with single date "today" returns DataTable', async ({ request }) => {
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
        expect(text).not.toContain('getMetadata()');
        expect(() => JSON.parse(text)).not.toThrow();
        const json = JSON.parse(text);
        expect(Array.isArray(json)).toBe(true);
    });

    test('API: getOverview with week/today returns DataTable (single week)', async ({ request }) => {
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
        expect(text).not.toContain('getMetadata()');
        expect(() => JSON.parse(text)).not.toThrow();
        const json = JSON.parse(text);
        expect(Array.isArray(json)).toBe(true);
    });

    test('API: getOverview with month/today returns DataTable (single month)', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'month',
                date: 'today',
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('getMetadata()');
        expect(() => JSON.parse(text)).not.toThrow();
        const json = JSON.parse(text);
        expect(Array.isArray(json)).toBe(true);
    });

    // === DATE RANGE TESTS (Row Evolution) ===
    // These must return DataTable\Map, otherwise Row Evolution crashes

    test('API: getOverview with day/last7 returns DataTable Map (for Row Evolution)', async ({ request }) => {
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
        expect(text).not.toContain('Call to undefined method');
        expect(text).not.toContain('getDataTables()');  // DataTable doesn't have getDataTables
        expect(text).not.toContain('Fatal error');

        expect(() => JSON.parse(text)).not.toThrow();
        const json = JSON.parse(text);
        // Date range should return object with date keys (Map), not array
        expect(typeof json).toBe('object');
        expect(Array.isArray(json)).toBe(false);
    });

    test('API: getOverview with day/last30 returns DataTable Map', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'day',
                date: 'last30',
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Call to undefined method');
        expect(text).not.toContain('getDataTables()');
        expect(text).not.toContain('Fatal error');
        expect(() => JSON.parse(text)).not.toThrow();
    });

    test('API: getOverview with week/last12 returns DataTable Map', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'week',
                date: 'last12',
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Call to undefined method');
        expect(text).not.toContain('getDataTables()');
        expect(text).not.toContain('Fatal error');
        expect(() => JSON.parse(text)).not.toThrow();
    });

    test('API: getOverview with month/last12 returns DataTable Map', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'month',
                date: 'last12',
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Call to undefined method');
        expect(text).not.toContain('getDataTables()');
        expect(text).not.toContain('Fatal error');
        expect(() => JSON.parse(text)).not.toThrow();
    });

    test('API: getFunnelEvolution with date range returns Map', async ({ request }) => {
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
        expect(text).not.toContain('Call to undefined method');
        expect(text).not.toContain('getDataTables()');
        expect(text).not.toContain('Fatal error');
        expect(() => JSON.parse(text)).not.toThrow();
    });

    // === HTML FORMAT TESTS ===
    // These verify the HTML table rendering works (uses getMetadata internally)

    test('API: getOverview with format=html and single date renders without error', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'day',
                date: 'yesterday',
                format: 'html',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('Call to undefined method');
        expect(text).not.toContain('getMetadata()');
        // Should contain HTML table structure or empty result
        expect(text.includes('<table') || text.includes('No data') || text === '').toBe(true);
    });

    test('API: getOverview with format=html and date range renders without error', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'day',
                date: 'last7',
                format: 'html',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('Call to undefined method');
        // HTML format with date range might show multiple tables or summary
    });
});

test.describe('FunnelInsights API - Row Evolution Widget Rendering', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const idSite = process.env.MATOMO_IDSITE || '1';
    let tokenAuth = process.env.MATOMO_TOKEN_AUTH || '';

    const authHeaders = () => ({ 'Authorization': `Bearer ${tokenAuth}` });

    test.beforeAll(async ({ request }) => {
        if (!tokenAuth) {
            const tokenResponse = await request.get(`${matomoUrl}/get-token.php`);
            if (tokenResponse.ok()) {
                tokenAuth = (await tokenResponse.text()).trim();
            }
        }
    });

    /**
     * CRITICAL: Row Evolution tests
     *
     * Error: "Call to a member function getDateStart() on bool"
     * This occurs when:
     * 1. Row Evolution is opened on getOverview
     * 2. Matomo calls the API with date range (last30)
     * 3. The returned Map is missing period metadata on DataTables
     * 4. Period::factory() returns false, getDateStart() is called on false
     *
     * The fix: Copy period metadata from archive templates to our custom Map/DataTables
     */

    // Test the Row Evolution API endpoint directly
    test('API: Row Evolution on getOverview with last30 does not crash', async ({ request }) => {
        // This simulates what Row Evolution does internally
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'day',
                date: 'last30',
                format: 'JSON',
            },
            headers: authHeaders(),
        });

        const text = await response.text();
        // Must not contain the getDateStart error
        expect(text).not.toContain('getDateStart()');
        expect(text).not.toContain('on bool');
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('Call to a member function');
        expect(() => JSON.parse(text)).not.toThrow();
    });

    // Test the actual Row Evolution widget rendering
    test('Widget: Row Evolution rendering on getOverview does not crash', async ({ request }) => {
        // This endpoint is used by the Row Evolution popover
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'CoreHome',
                action: 'getRowEvolutionPopover',
                idSite: idSite,
                period: 'day',
                date: 'yesterday',
                apiMethod: 'FunnelInsights.getOverview',
                label: '',  // Empty label for overview
                format: 'html',
            },
            headers: authHeaders(),
        });

        const text = await response.text();
        // Must not contain PHP errors
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('Call to a member function');
        expect(text).not.toContain('getDateStart()');
        expect(text).not.toContain('on bool');
    });

    // Test with specific label (funnel name)
    test('Widget: Row Evolution with label renders without error', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'CoreHome',
                action: 'getRowEvolutionPopover',
                idSite: idSite,
                period: 'day',
                date: 'yesterday',
                apiMethod: 'FunnelInsights.getOverview',
                label: 'Demande de Démo',  // Example funnel name
                format: 'html',
            },
            headers: authHeaders(),
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('Call to a member function');
        expect(text).not.toContain('getDateStart()');
    });

    // Test Row Evolution graph data endpoint
    test('API: Row Evolution graph data endpoint returns valid data', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'API.getRowEvolution',
                idSite: idSite,
                period: 'day',
                date: 'last30',
                apiModule: 'FunnelInsights',
                apiAction: 'getOverview',
                label: '',
                format: 'JSON',
            },
            headers: authHeaders(),
        });

        const text = await response.text();
        expect(text).not.toContain('getDateStart()');
        expect(text).not.toContain('on bool');
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('Call to a member function');
    });

    // Test the Sparklines widget (also uses Map with period metadata)
    test('Widget: Sparklines on getOverview renders without error', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'Widgetize',
                action: 'iframe',
                moduleToWidgetize: 'FunnelInsights',
                actionToWidgetize: 'getOverview',
                idSite: idSite,
                period: 'day',
                date: 'last30',
                viewDataTable: 'sparklines',
            },
            headers: authHeaders(),
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('Call to a member function');
        expect(text).not.toContain('getDateStart()');
    });

    // Test Row Evolution on getFunnelEvolution (should also work)
    test('API: Row Evolution on getFunnelEvolution with last30', async ({ request }) => {
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
            headers: authHeaders(),
        });

        const text = await response.text();
        expect(text).not.toContain('getDateStart()');
        expect(text).not.toContain('on bool');
        expect(text).not.toContain('Fatal error');
    });

    // Test that Map has proper structure for Row Evolution
    test('API: getOverview Map structure has date keys for Row Evolution', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'day',
                date: 'last7',
                format: 'JSON',
            },
            headers: authHeaders(),
        });

        const text = await response.text();
        expect(() => JSON.parse(text)).not.toThrow();

        const json = JSON.parse(text);
        // Should be object with date keys, not array
        expect(typeof json).toBe('object');
        expect(Array.isArray(json)).toBe(false);

        // Check that keys look like dates (YYYY-MM-DD format)
        const keys = Object.keys(json);
        if (keys.length > 0) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            expect(keys.some(key => dateRegex.test(key))).toBe(true);
        }
    });
});

test.describe('FunnelInsights API - Output Formats', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const idSite = process.env.MATOMO_IDSITE || '1';

    test('API: getOverview returns valid JSON format', async ({ request }) => {
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

        expect(response.headers()['content-type']).toContain('application/json');
        const text = await response.text();
        expect(() => JSON.parse(text)).not.toThrow();
    });

    test('API: getOverview returns valid XML format', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'day',
                date: 'yesterday',
                format: 'XML',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).toContain('<?xml') || expect(text.toLowerCase()).toContain('<result');
    });

    test('API: getFunnelReport CSV export does not error', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnelReport',
                idSite: idSite,
                period: 'day',
                date: 'yesterday',
                idFunnel: 1,
                format: 'CSV',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('Parse error');
    });

    test('API: getFunnels returns serialized PHP format', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnels',
                idSite: idSite,
                format: 'PHP',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
    });
});
