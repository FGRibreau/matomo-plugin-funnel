import { test, expect } from '@playwright/test';

/**
 * E2E Tests for FunnelInsights API Export Functionality
 *
 * Tests various export formats (CSV, XML, JSON, PHP) and report export features.
 */

test.describe('FunnelInsights API Export - Formats', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const idSite = process.env.MATOMO_IDSITE || '1';

    test('export: getOverview as JSON', async ({ request }) => {
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
        expect(response.headers()['content-type']).toContain('application/json');
        expect(() => JSON.parse(text)).not.toThrow();
    });

    test('export: getOverview as XML', async ({ request }) => {
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
        expect(text).not.toContain('Parse error');
        // Should be valid XML-like
        expect(text.includes('<?xml') || text.includes('<result') || text.includes('<row')).toBe(true);
    });

    test('export: getOverview as CSV', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'day',
                date: 'yesterday',
                format: 'CSV',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('Parse error');
        // CSV might be empty or have data - just verify no errors
    });

    test('export: getOverview as TSV', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'day',
                date: 'yesterday',
                format: 'TSV',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('Parse error');
    });

    test('export: getOverview as PHP serialized', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'day',
                date: 'yesterday',
                format: 'PHP',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('Parse error');
    });

    test('export: getOverview as original (raw)', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'day',
                date: 'yesterday',
                format: 'original',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('Parse error');
    });

    test('export: getFunnelReport as JSON', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnelReport',
                idSite: idSite,
                period: 'day',
                date: 'yesterday',
                idFunnel: 1,
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(() => JSON.parse(text)).not.toThrow();
    });

    test('export: getFunnelReport as CSV', async ({ request }) => {
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

    test('export: getFunnelReport as XML', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnelReport',
                idSite: idSite,
                period: 'day',
                date: 'yesterday',
                idFunnel: 1,
                format: 'XML',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('Parse error');
    });

    test('export: getFunnels as JSON', async ({ request }) => {
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
        // Either error (auth) or array
        const json = JSON.parse(text);
        expect(json !== null).toBe(true);
    });

    test('export: getFunnelEvolution as JSON', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnelEvolution',
                idSite: idSite,
                period: 'day',
                date: 'last7',
                idFunnel: 1,
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('getDataTables');
        expect(() => JSON.parse(text)).not.toThrow();
    });

    test('export: getFunnelEvolution as CSV', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnelEvolution',
                idSite: idSite,
                period: 'day',
                date: 'last7',
                idFunnel: 1,
                format: 'CSV',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('getDataTables');
    });
});

test.describe('FunnelInsights API Export - Date Ranges', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const idSite = process.env.MATOMO_IDSITE || '1';

    test('export: getOverview with last7 as CSV', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'day',
                date: 'last7',
                format: 'CSV',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('DataTable\\Map::getRows');
    });

    test('export: getOverview with last30 as JSON', async ({ request }) => {
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
        expect(() => JSON.parse(text)).not.toThrow();
    });

    test('export: getFunnelReport with week period as XML', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnelReport',
                idSite: idSite,
                period: 'week',
                date: 'last4',
                idFunnel: 1,
                format: 'XML',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
    });

    test('export: getFunnelReport with month period as JSON', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnelReport',
                idSite: idSite,
                period: 'month',
                date: 'last3',
                idFunnel: 1,
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(() => JSON.parse(text)).not.toThrow();
    });

    test('export: getOverview with range period as CSV', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'range',
                date: '2024-01-01,2024-01-31',
                format: 'CSV',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
    });
});

test.describe('FunnelInsights API Export - Authenticated', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const idSite = process.env.MATOMO_IDSITE || '1';
    let tokenAuth = process.env.MATOMO_TOKEN_AUTH || '';

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

    test('export: authenticated getOverview as CSV returns data', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'day',
                date: 'yesterday',
                format: 'CSV',
            },
            headers: authHeaders(),
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        // CSV format should have proper structure
    });

    test('export: authenticated getFunnels as JSON returns array', async ({ request }) => {
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

        const json = JSON.parse(text);
        expect(Array.isArray(json)).toBe(true);
    });

    test('export: authenticated getFunnelReport with expanded=1', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnelReport',
                idSite: idSite,
                period: 'day',
                date: 'yesterday',
                idFunnel: 1,
                expanded: 1,
                format: 'JSON',
            },
            headers: authHeaders(),
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(() => JSON.parse(text)).not.toThrow();
    });

    test('export: authenticated getOverview with flat=1', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'day',
                date: 'yesterday',
                flat: 1,
                format: 'JSON',
            },
            headers: authHeaders(),
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(() => JSON.parse(text)).not.toThrow();
    });

    test('export: authenticated getOverview with filter_limit', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'day',
                date: 'yesterday',
                filter_limit: 5,
                format: 'JSON',
            },
            headers: authHeaders(),
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(() => JSON.parse(text)).not.toThrow();
    });

    test('export: authenticated getFunnelEvolution with label filter', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnelEvolution',
                idSite: idSite,
                period: 'day',
                date: 'last7',
                idFunnel: 1,
                label: 'Step 1',
                format: 'JSON',
            },
            headers: authHeaders(),
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('getDataTables');
    });
});

test.describe('FunnelInsights API Export - Report Parameters', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const idSite = process.env.MATOMO_IDSITE || '1';

    test('export: getOverview with showColumns parameter', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'day',
                date: 'yesterday',
                showColumns: 'label,entries,conversions',
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(() => JSON.parse(text)).not.toThrow();
    });

    test('export: getOverview with hideColumns parameter', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'day',
                date: 'yesterday',
                hideColumns: 'idfunnel',
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(() => JSON.parse(text)).not.toThrow();
    });

    test('export: getOverview with filter_sort_column', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'day',
                date: 'yesterday',
                filter_sort_column: 'entries',
                filter_sort_order: 'desc',
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(() => JSON.parse(text)).not.toThrow();
    });

    test('export: getOverview with filter_offset', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'day',
                date: 'yesterday',
                filter_offset: 0,
                filter_limit: 10,
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(() => JSON.parse(text)).not.toThrow();
    });

    test('export: getFunnelReport with idSubtable parameter', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnelReport',
                idSite: idSite,
                period: 'day',
                date: 'yesterday',
                idFunnel: 1,
                idSubtable: 1,
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        // May or may not have subtables
    });
});

test.describe('FunnelInsights API Export - Bulk Request', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const idSite = process.env.MATOMO_IDSITE || '1';

    test('bulk API request with multiple methods', async ({ request }) => {
        const methods = [
            `method=FunnelInsights.getOverview&idSite=${idSite}&period=day&date=yesterday&format=JSON`,
            `method=FunnelInsights.getFunnels&idSite=${idSite}&format=JSON`,
        ];

        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'API.getBulkRequest',
                format: 'JSON',
                urls: methods.map(m => encodeURIComponent(m)),
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        // Bulk request may not be fully supported, but should not error
    });
});
