#!/bin/bash
set -e

PLUGIN_DIR="/var/www/html/plugins/FunnelInsights"
SOURCE_DIR="/plugin-source"

echo "Waiting for database connection..."
until php -r "new PDO('mysql:host=db;dbname=matomo', 'matomo', 'matomo');" 2>/dev/null; do
    echo "Waiting for database..."
    sleep 2
done
echo "Database is ready!"

# Copy plugin files first
echo "Copying plugin files..."
mkdir -p "$PLUGIN_DIR"

# Copy PHP files
for f in "$SOURCE_DIR"/*.php; do
    [ -f "$f" ] && cp "$f" "$PLUGIN_DIR/"
done

# Copy plugin.json
cp "$SOURCE_DIR/plugin.json" "$PLUGIN_DIR/"

# Copy directories (Tasks is now a single file, not a directory)
for dir in lang templates javascripts vue DAO Model Columns Commands Reports; do
    if [ -d "$SOURCE_DIR/$dir" ]; then
        cp -r "$SOURCE_DIR/$dir" "$PLUGIN_DIR/"
    fi
done

# Remove old Tasks directory if it exists (migrated to Tasks.php file)
rm -rf "$PLUGIN_DIR/Tasks" 2>/dev/null || true

# Set correct permissions
chown -R www-data:www-data "$PLUGIN_DIR"
echo "Plugin files copied."

cd /var/www/html

CONFIG_FILE="/var/www/html/config/config.ini.php"

# Check if we need to install
NEED_INSTALL=false
if [ ! -f "$CONFIG_FILE" ]; then
    NEED_INSTALL=true
elif ! mysql -h db -umatomo -pmatomo matomo -e "SELECT 1 FROM matomo_user LIMIT 1" 2>/dev/null; then
    NEED_INSTALL=true
    # Remove config since tables don't exist
    rm -f "$CONFIG_FILE"
fi

if [ "$NEED_INSTALL" = "true" ]; then
    echo "Running fresh Matomo installation..."

    # Remove any stale config
    rm -f "$CONFIG_FILE" 2>/dev/null || true

    # Copy installation script
    cp "$SOURCE_DIR/docker/install-matomo.php" /var/www/html/install-matomo.php

    # Run the PHP installation script
    echo "Running PHP-based installation..."
    php /var/www/html/install-matomo.php

    # Remove the installation script after use
    rm -f /var/www/html/install-matomo.php

    # Verify installation worked - check if admin user exists
    sleep 2
    ADMIN_CHECK=$(mysql -h db -umatomo -pmatomo matomo -N -e "SELECT COUNT(*) FROM matomo_user WHERE login='admin'" 2>/dev/null || echo "0")
    if [ "$ADMIN_CHECK" = "0" ]; then
        echo "WARNING: Admin user not found, but continuing..."
    else
        echo "Verified: Admin user exists."
    fi

    echo "Installation completed."
else
    echo "Matomo already installed and tables exist."
fi

# Clear brute force lockouts (in case of previous test runs)
echo "Clearing brute force lockouts..."
mysql -h db -umatomo -pmatomo matomo -e "TRUNCATE TABLE matomo_brute_force_log" 2>/dev/null || echo "No brute force table to clear"

# Activate the plugin
echo "Activating FunnelInsights plugin..."
php console plugin:activate FunnelInsights 2>&1 || {
    echo "Plugin activation via console done (may already be active)"
}

# Clear caches and fix permissions
echo "Clearing caches and fixing permissions..."
rm -rf /var/www/html/tmp/cache/* 2>/dev/null || true
rm -rf /var/www/html/tmp/assets/* 2>/dev/null || true
rm -rf /var/www/html/tmp/templates_c/* 2>/dev/null || true

# Ensure tmp directories exist with correct permissions
mkdir -p /var/www/html/tmp/cache/tracker
mkdir -p /var/www/html/tmp/assets
mkdir -p /var/www/html/tmp/templates_c
chown -R www-data:www-data /var/www/html/tmp
chown -R www-data:www-data /var/www/html/config
chmod -R 755 /var/www/html/tmp

echo ""
echo "======================================"
echo "FunnelInsights E2E environment ready!"
echo "Matomo URL: http://localhost:8080"
echo "Admin credentials: admin / adminpassword123"
echo "======================================"
