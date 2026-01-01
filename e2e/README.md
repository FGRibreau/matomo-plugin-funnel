# Matomo Funnels Plugin - End-to-End Tests with Playwright

This directory contains End-to-End (E2E) tests for the Matomo Funnels plugin, designed to simulate user interactions in a real browser environment.

## Setup

1.  **Node.js & npm:** Ensure Node.js (v18+) and npm are installed on your system.

2.  **Install Playwright Dependencies:**
    Navigate to the `e2e` directory and install the necessary Node.js packages:
    ```bash
    cd /Users/fgribreau/www/labs/matomo-plugin-funnel/e2e
    npm install
    npx playwright install
    ```

3.  **Matomo Instance:** You need a running Matomo instance. The `docker-compose.yml` in the project root can be used for this.
    ```bash
    cd /Users/fgribreau/www/labs/matomo-plugin-funnel
    docker-compose up -d
    ```
    Ensure the Funnels plugin is activated in your Matomo instance.

4.  **Environment Variables (Optional but Recommended):**
    You can configure the Matomo URL, admin user, and password using environment variables. Create a `.env` file in the `e2e` directory:
    ```
    MATOMO_URL=http://localhost:8080
    MATOMO_USER=your_matomo_admin_username
    MATOMO_PASSWORD=your_matomo_admin_password
    MATOMO_IDSITE=1
    ```
    *Default values for Matomo admin user/password are often `matomo_admin`/`matomo_password` for local Docker setups.* 
    *The default `MATOMO_URL` is `http://localhost:8080`.*

## Running Tests

1.  Ensure your Matomo instance is running and accessible at the configured `MATOMO_URL`.
2.  Navigate to the `e2e` directory:
    ```bash
    cd /Users/fgribreau/www/labs/matomo-plugin-funnel/e2e
    ```
3.  Run the tests:
    ```bash
    npm test
    ```

## Viewing Reports

After running the tests, an HTML report will be generated. You can open it with:
```bash
npx playwright show-report
```

## Troubleshooting

*   If tests fail due to login issues, double-check your `MATOMO_USER` and `MATOMO_PASSWORD` in the `.env` file or environment variables.
*   Ensure your Matomo instance is fully started and responsive before running tests.
*   If tests are flaky, consider increasing `retries` in `playwright.config.js` or adding `page.waitForTimeout()` for specific elements (though `waitForURL` and `expect` are preferred).
