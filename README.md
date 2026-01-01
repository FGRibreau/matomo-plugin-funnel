# Matomo Funnels Plugin

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![PHP Version](https://img.shields.io/badge/php-%3E%3D7.2-8892BF.svg)](https://php.net/)
[![Matomo Version](https://img.shields.io/badge/matomo-%3E%3D4.0.0-3152A0.svg)](https://matomo.org/)

A powerful analytics plugin for [Matomo](https://matomo.org/) that enables you to define, track, and analyze visitor paths (funnels) towards conversion goals.

Understand where visitors drop off in your checkout process, signup flow, or any multi-step journey on your website.

---

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
  - [Option 1: Manual Installation](#option-1-manual-installation)
  - [Option 2: Matomo Marketplace](#option-2-matomo-marketplace)
- [Configuration](#configuration)
  - [Creating Your First Funnel](#creating-your-first-funnel)
  - [Step Configuration Options](#step-configuration-options)
- [Usage](#usage)
  - [Viewing Reports](#viewing-reports)
  - [Using Segments](#using-segments)
  - [API Access](#api-access)
- [Development Setup](#development-setup)
  - [Using Docker](#using-docker)
  - [Running Tests](#running-tests)
- [CLI Commands](#cli-commands)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)

---

## Features

- **Visual Funnel Analysis** - See exactly where visitors drop off in multi-step processes
- **Flexible Step Matching** - Match steps by URL, Page Title, Events, or Search Queries
- **Multiple Comparison Operators** - Equals, Contains, Starts with, Ends with, Regex
- **Goal Integration** - Link funnels to existing Matomo Goals for conversion tracking
- **Standalone Funnels** - Create funnels without requiring a Goal
- **Strict Mode** - Enforce exact path following for accurate analysis
- **Historical Data** - Re-process past data when creating new funnels
- **Segmentation** - Filter visitors who participated in specific funnels
- **Custom Alerts** - Get notified when conversion rates change
- **Privacy-First** - 100% data ownership, GDPR compliant, no external data sharing
- **Performance Optimized** - Reports generated during offline archiving

---

## Requirements

Before installing, ensure you have:

| Requirement | Version |
|-------------|---------|
| Matomo | 4.0.0 or higher |
| PHP | 7.2 or higher |
| MySQL/MariaDB | 5.7+ / 10.2+ |

---

## Installation

### Option 1: Manual Installation

**Step 1: Download the plugin**

```bash
cd /path/to/your/matomo/plugins
git clone https://github.com/fgribreau/matomo-plugin-funnel.git Funnels
```

> **Note:** The folder name must be `Funnels` (case-sensitive).

**Step 2: Install dependencies (if any)**

```bash
cd Funnels
composer install --no-dev
```

**Step 3: Activate the plugin via CLI**

```bash
cd /path/to/your/matomo
./console plugin:activate Funnels
```

**Step 4: Verify installation**

1. Log in to your Matomo dashboard
2. Go to **Administration** (gear icon) → **System** → **Plugins**
3. Confirm "Funnels" appears in the list and is activated

The plugin will automatically create the required database table (`matomo_log_funnel`) during activation.

### Option 2: Matomo Marketplace

1. Log in to your Matomo dashboard as a Super User
2. Go to **Administration** → **Platform** → **Marketplace**
3. Search for "Funnels"
4. Click **Install**
5. Click **Activate**

---

## Configuration

### Creating Your First Funnel

**Step 1: Access the Funnel Manager**

1. Go to your Matomo dashboard
2. Navigate to **Administration** (gear icon)
3. Under your website settings, click **Funnels** → **Manage Funnels**

**Step 2: Create a new funnel**

1. Click **Create New Funnel**
2. Enter a descriptive **Funnel Name** (e.g., "Checkout Process")
3. (Optional) Link to an existing **Goal** for conversion tracking
4. Configure your steps (see below)
5. Click **Save**

**Step 3: Define funnel steps**

Each step represents a page or action in your visitor's journey. Add steps in the order visitors should complete them:

| Step | Example |
|------|---------|
| Step 1 | Cart page (`/cart`) |
| Step 2 | Shipping info (`/checkout/shipping`) |
| Step 3 | Payment (`/checkout/payment`) |
| Step 4 | Confirmation (`/checkout/complete`) |

### Step Configuration Options

Each step supports multiple matching criteria:

| Match Type | Description | Example |
|------------|-------------|---------|
| **URL** | Full page URL | `https://example.com/cart` |
| **Path** | URL path only | `/checkout/shipping` |
| **Page Title** | HTML title tag | `Checkout - Payment` |
| **Event Category** | Matomo event category | `Ecommerce` |
| **Event Action** | Matomo event action | `AddToCart` |
| **Event Name** | Matomo event name | `Product XYZ` |
| **Search Query** | Site search term | `blue shoes` |

**Comparison Operators:**

| Operator | Description |
|----------|-------------|
| `equals` | Exact match |
| `contains` | Substring match |
| `starts_with` | Prefix match |
| `ends_with` | Suffix match |
| `regex` | Regular expression |

**Advanced Options:**

- **Case Sensitive** - Enable for exact case matching
- **Ignore Query Parameters** - Match URLs regardless of query strings
- **OR Logic** - Multiple conditions per step (visitor matches if ANY condition is met)

---

## Usage

### Viewing Reports

Access funnel reports from your Matomo dashboard:

1. Go to **Reports** → **Funnels**
2. Select a funnel from the list

**Available Reports:**

| Report | Description |
|--------|-------------|
| **Funnel Overview** | Visual funnel with drop-off rates at each step |
| **Funnel Evolution** | Conversion trends over time |
| **Step Details** | Detailed metrics per step |

**Key Metrics:**

- **Entries** - Visitors entering the funnel
- **Proceeds** - Visitors continuing to next step
- **Drop-offs** - Visitors leaving the funnel
- **Conversion Rate** - Percentage completing all steps

### Using Segments

Filter your reports to visitors who participated in funnels:

1. Click **Add Segment** in any Matomo report
2. Choose from:
   - `Funnel Participated` - Visitors who entered any funnel
   - `Funnel Participated Step` - Visitors at a specific step position

### API Access

Access funnel data programmatically:

```bash
# Get all funnels for a site
curl "https://your-matomo.com/index.php?\
module=API&\
method=Funnels.getFunnels&\
idSite=1&\
format=JSON&\
token_auth=YOUR_TOKEN"
```

**Available API Methods:**

| Method | Description |
|--------|-------------|
| `Funnels.getFunnels` | List all funnels |
| `Funnels.getFunnel` | Get single funnel details |
| `Funnels.getFunnelReport` | Get funnel report data |
| `Funnels.createFunnel` | Create a new funnel |
| `Funnels.updateFunnel` | Update existing funnel |
| `Funnels.deleteFunnel` | Delete a funnel |
| `Funnels.duplicateFunnel` | Duplicate a funnel |

---

## Development Setup

### Using Docker

The easiest way to set up a development environment is with Docker.

**Step 1: Clone the repository**

```bash
git clone https://github.com/fgribreau/matomo-plugin-funnel.git
cd matomo-plugin-funnel
```

**Step 2: Start the containers**

```bash
docker-compose up -d
```

**Step 3: Wait for initialization**

```bash
# Wait approximately 30 seconds for Matomo to initialize
docker-compose logs -f matomo
```

**Step 4: Access Matomo**

Open http://localhost:8080 in your browser and complete the Matomo setup wizard.

**Default Docker Configuration:**

| Service | Details |
|---------|---------|
| Matomo | http://localhost:8080 |
| MariaDB | Port 3306, User: `matomo`, Password: `matomo` |
| Database | `matomo` |

**Step 5: Activate the plugin**

```bash
docker-compose exec matomo ./console plugin:activate Funnels
```

### Running Tests

**Unit Tests:**

```bash
# Install dependencies
composer install

# Run unit tests
./vendor/bin/phpunit tests/Unit
```

**Integration Tests:**

```bash
# Using the provided script (requires Docker)
./run_integration_tests.sh
```

**E2E Tests (Playwright):**

```bash
cd e2e

# Install dependencies
npm install

# Install browsers
npx playwright install

# Run tests
npm test
```

**Static Analysis:**

```bash
./vendor/bin/phpstan analyse -c phpstan.neon.dist
```

---

## CLI Commands

The plugin provides CLI commands for administration:

**Re-archive Funnel Data:**

```bash
./console funnels:rearchive --idsite=1 --idfunnel=2
```

This command invalidates and regenerates funnel reports. Use it after:
- Modifying funnel step configuration
- Fixing tracking issues
- Importing historical data

**Options:**

| Option | Description |
|--------|-------------|
| `--idsite` | Site ID (required) |
| `--idfunnel` | Funnel ID (required) |

---

## Contributing

Contributions are welcome! Here's how to get started:

1. **Fork the repository**

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**

4. **Run tests**
   ```bash
   composer install
   ./vendor/bin/phpunit
   ./vendor/bin/phpstan analyse -c phpstan.neon.dist
   ```

5. **Commit your changes**
   ```bash
   git commit -m "Add: description of your changes"
   ```

6. **Push and create a Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```

**Coding Standards:**

- Follow [PSR-12](https://www.php-fig.org/psr/psr-12/) coding style
- Write tests for new features
- Update documentation as needed
- Keep commits focused and atomic

---

## License

This project is licensed under the **GNU General Public License v3.0** - see the [LICENSE](LICENSE) file for details.

```
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
```

---

## Support

- **Documentation:** [User Guide](docs/user_guide.md)
- **Issues:** [GitHub Issues](https://github.com/fgribreau/matomo-plugin-funnel/issues)
- **Matomo Forums:** [forum.matomo.org](https://forum.matomo.org/)

---

Made with care for the Matomo community.
