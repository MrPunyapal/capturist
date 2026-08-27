# Changelog

All notable changes to **`capturist`** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.5.1] - 2026-08-28

- Harden step execution: `click`/`hover`/`fill`/`type`/`press`/`scroll` now target the first **visible** element instead of the first match in the DOM, so hidden duplicate nodes (e.g. all options) no longer break a step.
- `wait` polls for a visible element with a timeout instead of relying on a one-shot `waitForSelector`.
- Rewritten `focus` framing into a composed stage: opaque card, inline label copied in for unlabeled controls, a positioned dropdown/listbox, and a custom scrollbar + position cue so scrollable widgets read as a clean focused shot.
- `scroll` with a selector can scroll by offsets (`x`/`y`) inside the element.
- `inspect`-style selector suggestions prefer stable class/test-id/wire-key paths over per-request ids.

## [0.5.0] - 2026-08-27

- Selector screenshots crop the widget and keep padding around it (default 32px, `--padding`).
- `shot` runs same-page `steps` after load (open a dropdown, then crop). Login still belongs in `before`.
- `record --selector` frames that widget after steps, with padding and an opaque card so the rest of the page is not in the video.

## [0.2.0] - 2026-08-25

### ✨ Added — Video recording & single-shot CLI (agent capture)

- **`video: true` + `steps[]`** on page config — record an interaction flow as `.webm`
  via Playwright's native recorder.
  - Steps run in order after navigation: `goto`, `click`, `dblclick`, `hover`,
    `fill`, `type`, `press`, `scroll`, `wait`, and mid-flow `screenshot`.
  - Animations keep playing during recording (deterministic CSS is screenshot-only).
  - Output must use the `.webm` extension; video pages always recapture (cache bypass).
- **`capturist shot`** — one-off screenshot without a config file:
  `--url/--html/--html-file --output [--selector] [--full-page] [--wait-for]
  [--delay] [--viewport WxH] [--retina] [--dark]`
- **`capturist record`** — one-off video from a JSON steps file:
  `--url --output demo.webm --steps-file steps.json`
- Both commands print the standard `--json` run summary for machine integrators
  (PHP/CI), with `video: true` on recorded results.
- New programmatic API: `validateSteps()` and `executeSteps()` (`core/steps.js`).

---

## [0.1.3] - 2026-08-12

### ✨ Added — Incremental cache
- **`cache: true | CacheConfig`** — skip Playwright for pages whose fingerprint is unchanged.
  - Fingerprints `html` / `htmlFile` content, static files for `route` (via `server.dir`), capture settings, and optional `inputs` / `cacheKey`.
  - Manifest default: `{outputDir}/.capturist-cache.json`
  - **`adopt`** (default true): first enable reuses existing PNGs without a full recapture.
  - **`prune`**: optionally delete outputs for pages removed from config.
- **Per-page controls**: `cache: false`, `inputs: string[]`, `cacheKey: string`.
- **CLI**: `--cache`, `--no-cache`, `-f` / `--force`.
- **Run summary**: `cached` / `captured` counts; JSON results include `cached: true` on hits.
- Build command runs **before** fingerprinting so route-based sites see fresh `dist/` HTML; browser/server start only for dirty pages.

### 📝 Docs
- Documented cache configuration and force-regenerate workflow.

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
