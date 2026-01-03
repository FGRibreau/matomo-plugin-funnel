#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "=========================================="
echo "  FunnelInsights E2E Tests"
echo "=========================================="
echo ""

# Check if docker compose is available
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is required but not installed."
    exit 1
fi

# Determine docker compose command
if docker compose version &> /dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif docker-compose version &> /dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
else
    echo "ERROR: Docker Compose is required but not installed."
    exit 1
fi

COMPOSE_FILE="$PROJECT_DIR/docker-compose.e2e.yml"

cleanup() {
    echo ""
    echo "Cleaning up..."
    $COMPOSE_CMD -f "$COMPOSE_FILE" down -v 2>/dev/null || true
}

trap cleanup EXIT

echo "Starting test environment..."
$COMPOSE_CMD -f "$COMPOSE_FILE" down -v 2>/dev/null || true

echo "Starting database..."
$COMPOSE_CMD -f "$COMPOSE_FILE" up -d db

echo "Waiting for database to be ready..."
timeout 120 bash -c "until $COMPOSE_CMD -f \"$COMPOSE_FILE\" exec -T db healthcheck.sh --connect --innodb_initialized 2>/dev/null; do sleep 2; done" || {
    echo "ERROR: Database failed to start"
    $COMPOSE_CMD -f "$COMPOSE_FILE" logs db
    exit 1
}
echo "Database is ready!"

echo "Starting Matomo..."
$COMPOSE_CMD -f "$COMPOSE_FILE" up -d matomo

echo "Waiting for Matomo to be ready..."
timeout 180 bash -c 'until curl -sf http://localhost:8080/index.php >/dev/null 2>&1; do echo "Waiting..."; sleep 5; done' || {
    echo "ERROR: Matomo failed to start"
    $COMPOSE_CMD -f "$COMPOSE_FILE" logs matomo
    exit 1
}
echo "Matomo is responding!"

echo "Running init container..."
$COMPOSE_CMD -f "$COMPOSE_FILE" up matomo-init
echo "Init complete!"

echo "Clearing Matomo cache..."
$COMPOSE_CMD -f "$COMPOSE_FILE" exec -T matomo rm -rf /var/www/html/tmp/cache/* /var/www/html/tmp/assets/* /var/www/html/tmp/templates_c/* 2>/dev/null || true
$COMPOSE_CMD -f "$COMPOSE_FILE" exec -T matomo chown -R www-data:www-data /var/www/html/tmp 2>/dev/null || true

echo ""
echo "=========================================="
echo "  Running E2E tests"
echo "=========================================="
echo ""

cd "$PROJECT_DIR/e2e"

# Install dependencies if needed
if [[ ! -d "node_modules" ]]; then
    echo "Installing E2E dependencies..."
    npm ci 2>/dev/null || npm install
fi

# Install playwright browsers if needed
npx playwright install chromium 2>/dev/null || true

# Run tests
export MATOMO_URL="http://localhost:8080"
export MATOMO_USER="admin"
export MATOMO_PASSWORD="adminpassword123"
export MATOMO_IDSITE="1"

npm test -- "$@"

echo ""
echo "=========================================="
echo "  E2E tests completed!"
echo "=========================================="
