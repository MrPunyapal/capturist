# Changelog

All notable changes to **`page-shot`** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2026-08-08

### 🚀 Initial Preview Release
- **Core Screenshot Engine**:
  - Playwright-powered browser automation supporting `chromium`, `firefox`, and `webkit`.
  - Deterministic rendering pipeline with automatic web font waiting (`document.fonts.ready`), CSS animation & transition suppression, and caret freezing.
  - Multi-worker concurrency pool with automatic CPU core detection.
  - Support for element selector clipping (`selector: "#hero"`), full scrollable page captures (`fullPage: true`), and transparent PNG backgrounds (`omitBackground: true`).
  - Emulated color schemes (`light` | `dark` | `no-preference`) and high-DPI viewports (`deviceScaleFactor: 2`).
  - Custom lifecycle hooks (`beforeScreenshot`) for pre-capture UI interactions.
- **Configuration System**:
  - Type-safe `defineConfig` helper with full IntelliSense.
  - Multi-format configuration auto-discovery (`page-shot.config.ts`, `page-shot.config.mjs`, `page-shot.config.js`, `page-shot.config.cjs`, `page-shot.config.json`).
  - Schema normalization and default inference.
- **Built-in Static Server**:
  - Zero-dependency local static file server supporting local build directories (e.g. `./dist`, `./public`) with clean URL routing and SPA fallback.
  - Automated build command execution (`buildCommand: "npm run build"`).
- **Command-Line Interface (CLI)**:
  - `page-shot` binary with commands for generation, configuration initialization (`page-shot init`), custom configs (`--config`), base URL overrides (`--baseUrl`), output directories (`--outputDir`), concurrency (`--concurrency`), and dry runs (`--dry-run`).
- **Comprehensive Documentation**:
  - Framework recipes for Vite, Next.js, Astro, and static HTML sites.
  - GitHub Actions CI/CD automation workflow.
- **Automated Test Suite**:
  - 18 unit and integration tests covering config parsing, static server, CLI flags, and end-to-end Playwright captures.
