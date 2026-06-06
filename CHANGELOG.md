# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
- Added real-time `AgentVisualizer` dashboard component with live event timeline.
- Implemented SSE support in `mock-backend` to stream request events to the dashboard.
- Added Helm deployment support for proxy, dashboard, Redis, and mock-backend.
- Added GitHub Actions CI workflow for build, tests, and integration validation.
- Added documentation assets: slide deck outline and demo plan.
- Added repository governance files: `LICENSE`, `CONTRIBUTING.md`, `CHANGELOG.md`.

## [0.1.0] - 2026-06-06
### Added
- AgentShield Go proxy with goal-based rate limiting, request coalescing, and loop detection.
- Next.js dashboard with live traffic feed, metrics cards, and goals summary.
- Mock backend for local development and demo mode.
- Docker Compose setup to run the full stack locally.
- Basic Helm chart for Kubernetes deployment.
