#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

MATOMO_URL="http://localhost:8080"
MAX_WAIT_SECONDS=120
CLEANUP_ON_EXIT="${CLEANUP_ON_EXIT:-false}"

cd "$PROJECT_DIR"

cleanup() {
    if [[ "$CLEANUP_ON_EXIT" == "true" ]]; then
        echo "Stopping Docker containers..."
        docker-compose down --remove-orphans
    fi
}

trap cleanup EXIT

wait_for_service() {
    local url="$1"
    local max_attempts=$((MAX_WAIT_SECONDS / 2))
    local attempt=1

    echo "Waiting for service at $url..."

    while [[ $attempt -le $max_attempts ]]; do
        if curl --silent --fail --output /dev/null "$url" 2>/dev/null; then
            echo "Service is ready!"
            return 0
        fi

        echo "Attempt $attempt/$max_attempts - Service not ready, waiting..."
        sleep 2
        ((attempt++))
    done

    echo "ERROR: Service at $url did not become ready within ${MAX_WAIT_SECONDS}s"
    return 1
}

wait_for_database() {
    local max_attempts=$((MAX_WAIT_SECONDS / 2))
    local attempt=1

    echo "Waiting for database..."

    while [[ $attempt -le $max_attempts ]]; do
        if docker-compose exec -T db mysqladmin ping -h localhost --silent 2>/dev/null; then
            echo "Database is ready!"
            return 0
        fi

        echo "Attempt $attempt/$max_attempts - Database not ready, waiting..."
        sleep 2
        ((attempt++))
    done

    echo "ERROR: Database did not become ready within ${MAX_WAIT_SECONDS}s"
    return 1
}

echo "=========================================="
echo "  Matomo Funnels Plugin - Integration Tests"
echo "=========================================="
echo ""

# Check dependencies
command -v docker >/dev/null 2>&1 || { echo "ERROR: docker is required but not installed."; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "ERROR: docker-compose is required but not installed."; exit 1; }

# Start containers
echo "Starting Docker containers..."
docker-compose up -d

# Wait for services
wait_for_database
wait_for_service "$MATOMO_URL"

# Check if Matomo needs installation
echo ""
echo "Checking Matomo installation status..."
INSTALL_CHECK=$(curl --silent "$MATOMO_URL" 2>/dev/null || echo "")

if echo "$INSTALL_CHECK" | grep -q "installation"; then
    echo ""
    echo "WARNING: Matomo is not installed yet."
    echo "Please complete the Matomo installation wizard at: $MATOMO_URL"
    echo ""
    echo "After installation:"
    echo "  1. Activate the Funnels plugin in Administration > Plugins"
    echo "  2. Re-run this script"
    echo ""
    exit 1
fi

# Activate plugin (if not already active)
echo "Ensuring Funnels plugin is activated..."
docker-compose exec -T matomo ./console plugin:activate Funnels 2>/dev/null || true

# Run integration tests
echo ""
echo "Running integration tests..."
echo ""

if [[ -f "$PROJECT_DIR/vendor/bin/phpunit" ]]; then
    "$PROJECT_DIR/vendor/bin/phpunit" --testsuite integration --colors=always
else
    echo "ERROR: PHPUnit not found. Run 'composer install' first."
    exit 1
fi

echo ""
echo "=========================================="
echo "  Integration tests completed!"
echo "=========================================="
