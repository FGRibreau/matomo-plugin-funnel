#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
MATOMO_DIR="$PROJECT_DIR/.matomo"
MATOMO_VERSION="${MATOMO_VERSION:-5.x-dev}"

echo "=========================================="
echo "  Setting up Matomo for development"
echo "=========================================="
echo ""

# Check if Matomo is already installed
if [[ -d "$MATOMO_DIR" && -f "$MATOMO_DIR/core/Piwik.php" ]]; then
    echo "✓ Matomo already installed at $MATOMO_DIR"
    echo ""

    # Update if requested
    if [[ "${UPDATE_MATOMO:-false}" == "true" ]]; then
        echo "Updating Matomo..."
        cd "$MATOMO_DIR"
        git fetch origin
        git reset --hard "origin/$MATOMO_VERSION" 2>/dev/null || git reset --hard "$MATOMO_VERSION"
        composer install --no-interaction --prefer-dist
    fi
else
    echo "Cloning Matomo $MATOMO_VERSION..."

    # Clone Matomo
    git clone --depth 1 --branch "$MATOMO_VERSION" https://github.com/matomo-org/matomo.git "$MATOMO_DIR" 2>/dev/null || \
    git clone --depth 1 https://github.com/matomo-org/matomo.git "$MATOMO_DIR"

    echo "Installing Matomo dependencies..."
    cd "$MATOMO_DIR"

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

    $COMPOSER_CMD install --no-interaction --prefer-dist --no-dev

    echo "✓ Matomo installed successfully"
fi

# Create symlink for the plugin
PLUGIN_LINK="$MATOMO_DIR/plugins/FunnelInsights"
if [[ -L "$PLUGIN_LINK" ]]; then
    rm "$PLUGIN_LINK"
fi
if [[ -d "$PLUGIN_LINK" ]]; then
    rm -rf "$PLUGIN_LINK"
fi

ln -sf "$PROJECT_DIR" "$PLUGIN_LINK"
echo "✓ Plugin symlinked to $PLUGIN_LINK"

echo ""
echo "=========================================="
echo "  Matomo setup complete!"
echo "  Matomo path: $MATOMO_DIR"
echo "=========================================="
