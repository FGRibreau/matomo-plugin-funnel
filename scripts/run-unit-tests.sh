#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "=========================================="
echo "  Matomo Funnels Plugin - Unit Tests"
echo "=========================================="
echo ""

# Check if vendor exists
if [[ ! -d "$PROJECT_DIR/vendor" ]]; then
    echo "Installing dependencies..."
    composer install --no-interaction
fi

# Check if PHPUnit exists
if [[ ! -f "$PROJECT_DIR/vendor/bin/phpunit" ]]; then
    echo "ERROR: PHPUnit not found. Run 'composer install' first."
    exit 1
fi

# Run unit tests
echo "Running unit tests..."
echo ""

"$PROJECT_DIR/vendor/bin/phpunit" --testsuite unit --colors=always "$@"

echo ""
echo "=========================================="
echo "  Unit tests completed!"
echo "=========================================="
