#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "=========================================="
echo "  Matomo Funnels Plugin - Static Analysis"
echo "=========================================="
echo ""

# Check if vendor exists
if [[ ! -d "$PROJECT_DIR/vendor" ]]; then
    echo "Installing dependencies..."
    composer install --no-interaction
fi

# Check if PHPStan exists
if [[ ! -f "$PROJECT_DIR/vendor/bin/phpstan" ]]; then
    echo "ERROR: PHPStan not found. Run 'composer install' first."
    exit 1
fi

# Run PHPStan
echo "Running PHPStan..."
echo ""

"$PROJECT_DIR/vendor/bin/phpstan" analyse -c phpstan.neon.dist --no-progress "$@"

echo ""
echo "=========================================="
echo "  Static analysis completed!"
echo "=========================================="
