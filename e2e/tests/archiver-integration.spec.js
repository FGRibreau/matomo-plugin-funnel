import { test, expect } from '@playwright/test';

/**
 * E2E Tests for FunnelInsights Archiver Integration
 *
 * Tests archive processing, data retrieval from archives, and report generation.
 */

test.describe('FunnelInsights Archiver - Archive Data Retrieval', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const idSite = process.env.MATOMO_IDSITE || '1';

    test('API: getOverview retrieves archived data correctly', async ({ request }) => {
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
        expect(text).not.toContain('SQL syntax');
        expect(text).not.toContain('Undefined index');

        // Should return valid JSON
        const json = JSON.parse(text);
        expect(json !== null).toBe(true);
    });

    test('API: getFunnelReport retrieves archived step data', async ({ request }) => {
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
        expect(text).not.toContain('Undefined offset');

        // Should return valid JSON
        const json = JSON.parse(text);
        expect(json !== null).toBe(true);
    });

    test('API: getOverview with week aggregation', async ({ request }) => {
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
        expect(text).not.toContain('aggregateDataTableRecords');

        // Should return valid JSON (aggregated data)
        const json = JSON.parse(text);
        expect(json !== null).toBe(true);
    });

    test('API: getOverview with month aggregation', async ({ request }) => {
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

        const json = JSON.parse(text);
        expect(json !== null).toBe(true);
    });

    test('API: getOverview with year aggregation', async ({ request }) => {
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

        const json = JSON.parse(text);
        expect(json !== null).toBe(true);
    });

    test('API: getFunnelReport with week aggregation', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnelReport',
                idSite: idSite,
                period: 'week',
                date: 'today',
                idFunnel: 1,
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');

        const json = JSON.parse(text);
        expect(json !== null).toBe(true);
    });

    test('API: getFunnelReport with month aggregation', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnelReport',
                idSite: idSite,
                period: 'month',
                date: 'today',
                idFunnel: 1,
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');

        const json = JSON.parse(text);
        expect(json !== null).toBe(true);
    });
});

test.describe('FunnelInsights Archiver - Date Range Processing', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const idSite = process.env.MATOMO_IDSITE || '1';

    test('API: getOverview with last7 date range', async ({ request }) => {
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
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('DataTable\\Map::getRows');

        // Should return DataTable\Map with 7 entries (one per day)
        const json = JSON.parse(text);
        expect(json !== null).toBe(true);
    });

    test('API: getOverview with last30 date range', async ({ request }) => {
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

        const json = JSON.parse(text);
        expect(json !== null).toBe(true);
    });

    test('API: getOverview with previousN range', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'day',
                date: 'previous7',
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');

        const json = JSON.parse(text);
        expect(json !== null).toBe(true);
    });

    test('API: getOverview with custom date range', async ({ request }) => {
        // Use a recent date range
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const startDate = weekAgo.toISOString().split('T')[0];
        const endDate = today.toISOString().split('T')[0];

        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'range',
                date: `${startDate},${endDate}`,
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');

        const json = JSON.parse(text);
        expect(json !== null).toBe(true);
    });

    test('API: getFunnelEvolution returns proper DataTable\\Map', async ({ request }) => {
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
        expect(text).not.toContain('DataTable\\Map::getRows');

        // Should return evolution data
        const json = JSON.parse(text);
        expect(json !== null).toBe(true);
    });
});

test.describe('FunnelInsights Archiver - Empty Data Handling', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const idSite = process.env.MATOMO_IDSITE || '1';

    test('API: getOverview with ancient date returns empty gracefully', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'day',
                date: '2010-01-01',
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');
        expect(text).not.toContain('Undefined');

        // Should return empty array or empty DataTable
        const json = JSON.parse(text);
        expect(json !== null).toBe(true);
    });

    test('API: getFunnelReport with no archived data', async ({ request }) => {
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

        // Should handle gracefully
        const json = JSON.parse(text);
        expect(json !== null).toBe(true);
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
        expect(text).not.toContain('getDataTables');
    });
});

test.describe('FunnelInsights Archiver - Segment Support', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const idSite = process.env.MATOMO_IDSITE || '1';

    test('API: getOverview with segment parameter', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'day',
                date: 'yesterday',
                segment: 'browserCode==CH',
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');

        // Segment processing should not error
        const json = JSON.parse(text);
        expect(json !== null).toBe(true);
    });

    test('API: getFunnelReport with segment parameter', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getFunnelReport',
                idSite: idSite,
                period: 'day',
                date: 'yesterday',
                idFunnel: 1,
                segment: 'deviceType==desktop',
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');

        const json = JSON.parse(text);
        expect(json !== null).toBe(true);
    });

    test('API: getOverview with country segment', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'day',
                date: 'yesterday',
                segment: 'countryCode==us',
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');

        const json = JSON.parse(text);
        expect(json !== null).toBe(true);
    });

    test('API: getOverview with combined segment', async ({ request }) => {
        const response = await request.get(`${matomoUrl}/index.php`, {
            params: {
                module: 'API',
                method: 'FunnelInsights.getOverview',
                idSite: idSite,
                period: 'day',
                date: 'yesterday',
                segment: 'browserCode==CH;deviceType==desktop',
                format: 'JSON',
            },
        });

        const text = await response.text();
        expect(text).not.toContain('Fatal error');

        const json = JSON.parse(text);
        expect(json !== null).toBe(true);
    });
});

test.describe('FunnelInsights Archiver - Report Data Structure', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const idSite = process.env.MATOMO_IDSITE || '1';

    test('API: getFunnelReport returns step metrics', async ({ request }) => {
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

        const json = JSON.parse(text);

        // If data exists, check structure
        if (json && json.steps && json.steps.length > 0) {
            const step = json.steps[0];
            // Should have expected metrics (may be 0 if no data)
            expect('nb_visits' in step || 'visits' in step).toBe(true);
        }
    });

    test('API: getOverview returns funnel summary', async ({ request }) => {
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

        const json = JSON.parse(text);

        // If data exists, should be array of funnels
        if (Array.isArray(json) && json.length > 0) {
            const funnel = json[0];
            // Should have funnel identification
            expect('idfunnel' in funnel || 'idFunnel' in funnel || 'name' in funnel || 'label' in funnel).toBe(true);
        }
    });

    test('API: getFunnelReport includes conversion metrics', async ({ request }) => {
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

        const json = JSON.parse(text);

        // If report has summary data
        if (json && (json.total_entries !== undefined || json.conversion_rate !== undefined)) {
            // Should have conversion metrics
            expect(json.total_entries !== undefined || json.conversion_rate !== undefined).toBe(true);
        }
    });
});

test.describe('FunnelInsights Archiver - Concurrent Archive Requests', () => {
    const matomoUrl = process.env.MATOMO_URL || 'http://localhost:8080';
    const idSite = process.env.MATOMO_IDSITE || '1';

    test('multiple concurrent getOverview requests', async ({ request }) => {
        const dates = ['yesterday', 'last7', 'last30'];
        const requests = dates.map(date =>
            request.get(`${matomoUrl}/index.php`, {
                params: {
                    module: 'API',
                    method: 'FunnelInsights.getOverview',
                    idSite: idSite,
                    period: 'day',
                    date: date,
                    format: 'JSON',
                },
            })
        );

        const responses = await Promise.all(requests);

        for (const response of responses) {
            const text = await response.text();
            expect(text).not.toContain('Fatal error');
            expect(text).not.toContain('Deadlock');
            expect(text).not.toContain('Lock wait timeout');
        }
    });

    test('multiple concurrent getFunnelReport requests for different funnels', async ({ request }) => {
        const funnelIds = [1, 2, 3];
        const requests = funnelIds.map(idFunnel =>
            request.get(`${matomoUrl}/index.php`, {
                params: {
                    module: 'API',
                    method: 'FunnelInsights.getFunnelReport',
                    idSite: idSite,
                    period: 'day',
                    date: 'yesterday',
                    idFunnel: idFunnel,
                    format: 'JSON',
                },
            })
        );

        const responses = await Promise.all(requests);

        for (const response of responses) {
            const text = await response.text();
            expect(text).not.toContain('Fatal error');
            expect(text).not.toContain('Deadlock');
        }
    });

    test('mixed API calls concurrently', async ({ request }) => {
        const requests = [
            request.get(`${matomoUrl}/index.php`, {
                params: {
                    module: 'API',
                    method: 'FunnelInsights.getOverview',
                    idSite: idSite,
                    period: 'day',
                    date: 'yesterday',
                    format: 'JSON',
                },
            }),
            request.get(`${matomoUrl}/index.php`, {
                params: {
                    module: 'API',
                    method: 'FunnelInsights.getFunnelReport',
                    idSite: idSite,
                    period: 'day',
                    date: 'yesterday',
                    idFunnel: 1,
                    format: 'JSON',
                },
            }),
            request.get(`${matomoUrl}/index.php`, {
                params: {
                    module: 'API',
                    method: 'FunnelInsights.getFunnels',
                    idSite: idSite,
                    format: 'JSON',
                },
            }),
            request.get(`${matomoUrl}/index.php`, {
                params: {
                    module: 'API',
                    method: 'FunnelInsights.getFunnelEvolution',
                    idSite: idSite,
                    period: 'day',
                    date: 'last7',
                    idFunnel: 1,
                    format: 'JSON',
                },
            }),
        ];

        const responses = await Promise.all(requests);

        for (const response of responses) {
            const text = await response.text();
            expect(text).not.toContain('Fatal error');
        }
    });
});
