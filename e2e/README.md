# FunnelInsights - E2E Tests

End-to-End tests for the FunnelInsights Matomo plugin using Playwright.

## Prerequisites

- Node.js 18+
- Docker & Docker Compose

## Quick Start

```bash
# From project root, start Matomo stack
docker compose -f docker-compose.e2e.yml up -d

# Wait for Matomo to be ready (about 2-3 minutes on first run)
# Check: http://localhost:8080

# Activate the plugin
docker compose -f docker-compose.e2e.yml exec matomo php /opt/bitnami/matomo/console plugin:activate FunnelInsights

# Install e2e dependencies
cd e2e
npm install
npx playwright install chromium

# Run tests
npm test
```

## Test Coverage

The E2E tests cover the complete CRUD lifecycle:

| Test | Description |
|------|-------------|
| Create | Creates a new funnel with multiple steps |
| Read | Verifies funnel list is accessible |
| Update | Modifies an existing funnel name |
| Delete | Removes a funnel with confirmation |
| Duplicate | Creates a copy of an existing funnel |
| Validate | Tests the step validation feature |
| OR Logic | Tests multiple conditions per step |

## Configuration

Environment variables (optional):

```bash
export MATOMO_URL=http://localhost:8080
export MATOMO_USER=admin
export MATOMO_PASSWORD=adminpassword123
export MATOMO_IDSITE=1
```

## Running Tests

```bash
# Run all tests
npm test

# Run with browser visible
npm run test:headed

# Debug mode (step through)
npm run test:debug

# Interactive UI mode
npm run test:ui

# View HTML report after tests
npm run report
```

## Troubleshooting

### Login failures
- Verify Matomo is running: `curl http://localhost:8080`
- Check credentials match docker-compose.e2e.yml settings

### Plugin not found
- Activate plugin: `docker compose -f docker-compose.e2e.yml exec matomo php /opt/bitnami/matomo/console plugin:activate FunnelInsights`
- Clear cache: `docker compose -f docker-compose.e2e.yml exec matomo rm -rf /opt/bitnami/matomo/tmp/cache/*`

### Slow startup
- First run downloads images and initializes DB
- Wait for healthcheck: `docker compose -f docker-compose.e2e.yml ps`

## CI Integration

Tests run automatically via GitHub Actions on push/PR to main branch.
