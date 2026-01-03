#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "=========================================="
echo "  Matomo Funnels Plugin - Static Analysis"
echo "=========================================="
echo ""

ERROR_COUNT=0

# Step 1: PHP syntax check on all PHP files
echo "Checking PHP syntax..."
while IFS= read -r -d '' file; do
    if ! php -l "$file" > /dev/null 2>&1; then
        echo "Syntax error in: $file"
        php -l "$file"
        ERROR_COUNT=$((ERROR_COUNT + 1))
    fi
done < <(find "$PROJECT_DIR" -name "*.php" -not -path "*/vendor/*" -not -path "*/node_modules/*" -print0)

if [[ $ERROR_COUNT -eq 0 ]]; then
    echo "✓ All PHP files have valid syntax"
else
    echo ""
    echo "✗ Found $ERROR_COUNT syntax error(s)"
    exit 1
fi

echo ""

# Step 2: Check for common issues using grep
echo "Checking for common issues..."

# Check for debug statements left in code
if grep -r --include="*.php" -n "var_dump\|print_r\|error_log.*DEBUG\|console\.log" "$PROJECT_DIR" --exclude-dir=vendor --exclude-dir=node_modules --exclude-dir=tests 2>/dev/null; then
    echo "⚠ Warning: Found debug statements (var_dump, print_r, etc.)"
fi

# Check for TODO/FIXME that might indicate incomplete code
TODO_COUNT=$(grep -r --include="*.php" -c "TODO\|FIXME" "$PROJECT_DIR" --exclude-dir=vendor --exclude-dir=node_modules 2>/dev/null | grep -v ":0$" | wc -l || true)
if [[ $TODO_COUNT -gt 0 ]]; then
    echo "ℹ Found $TODO_COUNT file(s) with TODO/FIXME comments"
fi

echo ""
echo "=========================================="
echo "  Static analysis completed!"
echo "=========================================="
