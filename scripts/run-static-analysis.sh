#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "=========================================="
echo "  Matomo Funnels Plugin - Static Analysis"
echo "=========================================="
echo ""

# Step 1: Setup Matomo if not present
if [[ ! -d "$PROJECT_DIR/.matomo" || ! -f "$PROJECT_DIR/.matomo/core/Piwik.php" ]]; then
    echo "Setting up Matomo development environment..."
    "$SCRIPT_DIR/setup-matomo.sh"
    echo ""
fi

# Step 2: Install plugin dependencies if needed
if [[ ! -d "$PROJECT_DIR/vendor" ]]; then
    echo "Installing plugin dependencies..."

    # Find composer command
    if command -v composer &> /dev/null; then
        COMPOSER_CMD="composer"
    elif [[ -f "$PROJECT_DIR/composer.phar" ]]; then
        COMPOSER_CMD="php $PROJECT_DIR/composer.phar"
    else
        echo "Downloading composer..."
        curl -sS https://getcomposer.org/composer.phar -o "$PROJECT_DIR/composer.phar"
        COMPOSER_CMD="php $PROJECT_DIR/composer.phar"
    fi

    $COMPOSER_CMD install --no-interaction --prefer-dist
    echo ""
fi

# Step 3: PHP syntax check
ERROR_COUNT=0
echo "Checking PHP syntax..."
while IFS= read -r -d '' file; do
    if ! php -l "$file" > /dev/null 2>&1; then
        echo "Syntax error in: $file"
        php -l "$file"
        ERROR_COUNT=$((ERROR_COUNT + 1))
    fi
done < <(find "$PROJECT_DIR" -name "*.php" -not -path "*/.matomo/*" -not -path "*/vendor/*" -not -path "*/node_modules/*" -print0)

if [[ $ERROR_COUNT -eq 0 ]]; then
    echo "✓ All PHP files have valid syntax"
else
    echo ""
    echo "✗ Found $ERROR_COUNT syntax error(s)"
    exit 1
fi

echo ""

# Step 4: Run PHPStan
echo "Running PHPStan static analysis..."
echo ""

if [[ -f "$PROJECT_DIR/vendor/bin/phpstan" ]]; then
    "$PROJECT_DIR/vendor/bin/phpstan" analyse --no-progress "$@"
else
    echo "⚠ PHPStan not installed, skipping static analysis"
fi

echo ""
echo "=========================================="
echo "  Static analysis completed!"
echo "=========================================="
