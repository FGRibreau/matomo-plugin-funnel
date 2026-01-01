#!/bin/bash
set -e

# Start Containers
docker-compose up -d

# Wait for Matomo to be ready (naive wait)
echo "Waiting for Matomo to initialize..."
sleep 30

# Install Matomo (if needed) - using console
# docker-compose exec matomo ./console site:add --name="Test Site" --urls="http://localhost:8080"
# docker-compose exec matomo ./console plugin:activate Funnels

# Run Integration Tests
echo "Running Integration Tests..."
# Need PHPUnit locally or inside container
# docker-compose exec matomo ./vendor/bin/phpunit plugins/Funnels/tests/Integration

# Cleanup
# docker-compose down
