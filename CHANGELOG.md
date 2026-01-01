# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-01-01

### Changed

- **BREAKING:** Minimum Matomo version requirement updated from 4.0.0 to 5.0.0-b1
- **BREAKING:** Minimum PHP version requirement updated from 7.2 to 7.4
- Updated Docker development environment to use Matomo 5.x (matomo:5-fpm-alpine)
- Updated MariaDB version from 10.5 to 10.6 in Docker environment
- Added PHPUnit 10.x compatibility alongside PHPUnit 9.x
- Updated all tests to use PHP 7.4+ typed properties and return types

### Added

- New test `PluginVersionTest` to verify plugin version requirements
- New integration test `testMatomoVersionIs5OrHigher` to validate Matomo 5.x compatibility
- New integration test `testPluginIsActivatedInMatomo5` to verify plugin activation

### Fixed

- Updated test methods to use strict PHP 7.4+ typing

## [1.0.0] - 2025-12-15

### Added

- Initial release of the Matomo Funnels plugin
- Define funnels with multiple steps
- Support for URL, Path, Page Title, Event, and Search Query matching
- Multiple comparison operators (equals, contains, starts_with, ends_with, regex)
- Goal integration for conversion tracking
- Standalone funnels without Goal requirement
- Strict mode for exact path following
- Step time limit configuration
- Historical data re-processing
- Segmentation support (funnel_participated, funnel_participated_step)
- Custom alerts integration
- CLI command for funnel re-archiving
- Drop-off URL analysis
- Average time per step calculation
- Full API support (create, update, delete, duplicate, get reports)
- Vue.js visualization components
- Docker development environment
