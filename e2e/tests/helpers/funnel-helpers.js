/**
 * Shared test helpers for FunnelInsights E2E tests.
 *
 * These helpers ensure tests are self-contained by providing
 * functions to CREATE test data (not check if it exists).
 *
 * RULE: Never use conditional logic like `if (data.length > 0)`.
 * Always CREATE the data you need at the start of each test.
 */

/**
 * Create a test funnel via form submission
 * @param {Page} page - Playwright page
 * @param {string} matomoUrl - Base Matomo URL
 * @param {string} idSite - Site ID
 * @param {string} name - Funnel name
 * @param {Object} options - Additional options
 * @returns {Promise<number>} Created funnel ID
 */
export async function createTestFunnel(page, matomoUrl, idSite, name, options = {}) {
    await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=edit&idSite=${idSite}&idFunnel=0`);
    await page.waitForLoadState('networkidle');

    // Fill funnel name
    await page.locator('input[name="name"]').fill(name);

    // Add a step
    const addStepButton = page.locator('#addStepButton, .addStepButton, button:has-text("Add Step")');
    if (await addStepButton.count() > 0) {
        await addStepButton.first().click();
        await page.waitForTimeout(500);

        // Fill step name and condition
        const stepNameInput = page.locator('input[name*="step"][name*="name"], .step-name-input').first();
        if (await stepNameInput.count() > 0) {
            await stepNameInput.fill(options.stepName || 'Homepage');
        }

        const comparisonSelect = page.locator('select[name*="comparison"], .comparison-select').first();
        if (await comparisonSelect.count() > 0) {
            await comparisonSelect.selectOption(options.comparison || 'path');
        }

        const patternInput = page.locator('input[name*="pattern"], .pattern-input').first();
        if (await patternInput.count() > 0) {
            await patternInput.fill(options.pattern || '/');
        }
    }

    // Activate the funnel (unless explicitly disabled)
    if (options.active !== false) {
        const activeCheckbox = page.locator('input[name="active"], #active');
        if (await activeCheckbox.count() > 0) {
            await activeCheckbox.check();
        }
    }

    // Submit form
    await page.locator('input[type="submit"], button[type="submit"]').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Get the created funnel ID from URL
    const url = page.url();
    const idMatch = url.match(/idFunnel=(\d+)/);
    if (idMatch && idMatch[1] !== '0') {
        return parseInt(idMatch[1]);
    }

    // Fallback: get from manage page
    await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=manage&idSite=${idSite}`);
    await page.waitForLoadState('networkidle');
    const row = page.locator(`table.entityTable tbody tr:has-text("${name}")`).first();
    if (await row.count() > 0) {
        const editLink = row.locator('a[href*="idFunnel="]');
        const href = await editLink.getAttribute('href');
        const match = href ? href.match(/idFunnel=(\d+)/) : null;
        return match ? parseInt(match[1]) : null;
    }
    return null;
}

/**
 * Delete a funnel by ID
 * @param {Page} page - Playwright page
 * @param {string} matomoUrl - Base Matomo URL
 * @param {string} idSite - Site ID
 * @param {number} idFunnel - Funnel ID to delete
 */
export async function deleteFunnel(page, matomoUrl, idSite, idFunnel) {
    await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=manage&idSite=${idSite}`);
    await page.waitForLoadState('networkidle');

    const deleteButton = page.locator(`a[href*="action=delete"][href*="idFunnel=${idFunnel}"], button[data-idfunnel="${idFunnel}"]`);
    if (await deleteButton.count() > 0) {
        page.on('dialog', dialog => dialog.accept());
        await deleteButton.click();
        await page.waitForLoadState('networkidle');
    }
}

/**
 * Delete ALL funnels for the test site.
 * Use this in beforeEach when you need a clean slate.
 * @param {Page} page - Playwright page
 * @param {APIRequestContext} request - Playwright request context
 * @param {string} matomoUrl - Base Matomo URL
 * @param {string} idSite - Site ID
 */
export async function deleteAllFunnels(page, request, matomoUrl, idSite) {
    // Get all funnels via API
    const response = await request.get(`${matomoUrl}/index.php`, {
        params: {
            module: 'API',
            method: 'FunnelInsights.getFunnels',
            idSite: idSite,
            format: 'JSON',
        },
    });

    let funnels = [];
    const text = await response.text();
    if (!text.includes('error') && !text.includes('result')) {
        funnels = JSON.parse(text);
    }

    // Delete each funnel
    for (const funnel of funnels) {
        if (funnel.idfunnel) {
            await deleteFunnel(page, matomoUrl, idSite, funnel.idfunnel);
        }
    }
}

/**
 * Ensure at least one funnel exists, creating one if needed.
 * Returns the funnel ID.
 * @param {Page} page - Playwright page
 * @param {APIRequestContext} request - Playwright request context
 * @param {string} matomoUrl - Base Matomo URL
 * @param {string} idSite - Site ID
 * @returns {Promise<number>} Funnel ID
 */
export async function ensureTestFunnelExists(page, request, matomoUrl, idSite) {
    // Check if any funnels exist
    const response = await request.get(`${matomoUrl}/index.php`, {
        params: {
            module: 'API',
            method: 'FunnelInsights.getFunnels',
            idSite: idSite,
            format: 'JSON',
        },
    });

    const text = await response.text();
    let funnels = [];
    if (!text.includes('error') && !text.includes('result')) {
        funnels = JSON.parse(text);
    }

    if (funnels.length > 0) {
        return funnels[0].idfunnel;
    }

    // Create a test funnel
    const name = `E2E Test Funnel ${Date.now()}`;
    return await createTestFunnel(page, matomoUrl, idSite, name);
}

/**
 * Login to Matomo
 * @param {Page} page - Playwright page
 * @param {string} matomoUrl - Base Matomo URL
 * @param {string} username - Username
 * @param {string} password - Password
 */
export async function loginToMatomo(page, matomoUrl, username, password) {
    await page.goto(`${matomoUrl}/index.php?module=Login`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#login_form', { timeout: 30000 });

    const form = page.locator('#login_form');
    await form.locator('#login_form_login').fill(username);
    await form.locator('#login_form_password').fill(password);
    await page.waitForTimeout(500);
    await form.locator('input[type="submit"]').click();
    await page.waitForURL(/(?!.*module=Login)|.*module=CoreHome/, { timeout: 30000 });
    await page.waitForLoadState('networkidle');
}

/**
 * Get funnel ID from the manage page for a specific funnel name
 * @param {Page} page - Playwright page
 * @param {string} matomoUrl - Base Matomo URL
 * @param {string} idSite - Site ID
 * @param {string} name - Funnel name to find
 * @returns {Promise<number|null>} Funnel ID or null
 */
export async function getFunnelIdByName(page, matomoUrl, idSite, name) {
    await page.goto(`${matomoUrl}/index.php?module=FunnelInsights&action=manage&idSite=${idSite}`);
    await page.waitForLoadState('networkidle');

    const row = page.locator(`table.entityTable tbody tr:has-text("${name}")`).first();
    if (await row.count() > 0) {
        const editLink = row.locator('a[href*="idFunnel="]');
        const href = await editLink.getAttribute('href');
        const match = href ? href.match(/idFunnel=(\d+)/) : null;
        return match ? parseInt(match[1]) : null;
    }
    return null;
}
