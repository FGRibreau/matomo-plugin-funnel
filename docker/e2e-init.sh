#!/bin/bash
# This script runs after Matomo is installed to activate FunnelInsights plugin
set -e

echo "Waiting for Matomo to be ready..."
sleep 30

echo "Activating FunnelInsights plugin..."
cd /opt/bitnami/matomo

# Activate the plugin using Matomo console
php console plugin:activate FunnelInsights || echo "Plugin may already be active"

# Clear caches
rm -rf tmp/cache/* tmp/assets/* tmp/templates_c/* 2>/dev/null || true

echo "FunnelInsights plugin activated successfully"
