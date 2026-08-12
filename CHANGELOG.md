# Changelog

All notable changes to **`capturist`** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.2] - 2026-08-12

### ✨ Added — HTML cards & tooling integration
- **Inline HTML pages**: `html` and `htmlFile` page targets capture via Playwright `setContent` — **no `baseUrl` or static server required**.
- **`label`**: optional log/result name for HTML cards (defaults to route / file / output).
- **`captureHtml(html, options)`** one-shot helper for integrators that already hold an HTML string.
- **CLI integrator flags**:
  - `--cwd <dir>` — run against another working directory (e.g. generated `docs/`)
  - `-q, --quiet` — suppress human logs
  - `--json` — machine-readable summary on stdout (`ok`, paths, sizes, errors)
- **Smarter networking**: browser server only starts when at least one page uses `route`/`url`.

### 📝 Docs
- Documented HTML-card workflow and JSON config contract for external tools / SSGs.

---

## [0.1.1] - 2026-08-08

### ✨ Added
- **Ultra-High Resolution & Retina Presets**:
  - Added top-level and per-page `retina: true` boolean option (automatically applies 2x HiDPI scale factor).
  - Added top-level and per-page `scale: number` multiplier option (e.g. `scale: 2` for Retina, `scale: 3` for Ultra-HD).
- **Crisp Typography & Subpixel Font Antialiasing**:
  - Injected deterministic font smoothing CSS (`-webkit-font-smoothing: antialiased`, `-moz-osx-font-smoothing: grayscale`, `text-rendering: optimizeLegibility`, `image-rendering: -webkit-optimize-contrast`).

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
  - Multi-format configuration auto-discovery (`capturist.config.ts`, `capturist.config.mjs`, `capturist.config.js`, `capturist.config.cjs`, `capturist.config.json`).
  - Schema normalization and default inference.
- **Built-in Static Server**:
  - Zero-dependency local static file server supporting local build directories (e.g. `./dist`, `./public`) with clean URL routing and SPA fallback.
  - Automated build command execution (`buildCommand: "npm run build"`).
- **Command-Line Interface (CLI)**:
  - `capturist` binary with commands for generation, configuration initialization (`capturist init`), custom configs (`--config`), base URL overrides (`--baseUrl`), output directories (`--outputDir`), concurrency (`--concurrency`), and dry runs (`--dry-run`).
- **Comprehensive Documentation**:
  - Framework recipes for Vite, Next.js, Astro, and static HTML sites.
  - GitHub Actions CI/CD automation workflow.
- **Automated Test Suite**:
  - 18 unit and integration tests covering config parsing, static server, CLI flags, and end-to-end Playwright captures.
