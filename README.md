# 📸 capturist

> **The canonical, configuration-driven screenshot engine for websites and Open Graph images.**  
> Turn your actual web pages into pixel-perfect static screenshots, social preview cards, and visual assets automatically.

[![npm version](https://img.shields.io/npm/v/capturist.svg?color=blue&style=flat-square)](https://www.npmjs.com/package/capturist)
[![license](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](LICENSE)
[![Playwright](https://img.shields.io/badge/powered%20by-Playwright-2EAD33.svg?style=flat-square&logo=playwright)](https://playwright.dev/)
[![TypeScript](https://img.shields.io/badge/written%20in-TypeScript-3178C6.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)

---

## 💡 Why capturist?

Many websites generate Open Graph images using Canva, Figma, Photoshop, or canvas-based SVG generators. These quickly become stale: when you change your website layout, design, or copy, the social share images lag behind.

**`capturist` flips this workflow: your website itself becomes the social preview.**

```text
/             ──►  public/og/home.png
/features     ──►  public/og/features.png
/pricing      ──►  public/og/pricing.png
/docs         ──►  public/og/docs.png
/blog/launch  ──►  public/og/blog-launch.png
```

Whenever your website changes, running `capturist` automatically updates every preview image deterministically.

---

## ✨ Features

- 🎯 **Configuration-driven**: Intuitive, type-safe `defineConfig` API like Vite, Vitest, and ESLint.
- ⚡ **Playwright Powered**: Handles browser launch, parallel worker pools, and clean teardown internally.
- 🎴 **HTML → PNG cards**: Capture inline `html` / `htmlFile` without a baseUrl or static server (perfect for OG images and SSGs).
- 🧊 **Deterministic Screenshots**: Automatically waits for `document.fonts.ready`, freezes CSS animations & transitions, and disables blinking carets.
- 🔍 **Subpixel Font Antialiasing**: Injects font smoothing rules for razor-sharp typography.
- 📱 **Retina & HiDPI Presets**: Native `retina: true` and `scale: 2` support for 2400 × 1260 social sharing cards.
- 📦 **Built-in Static Server**: Preview and capture local static folders (`./dist`, `./build`, `./out`) without running separate dev server commands.
- 🌓 **Color Scheme Emulation**: Render light mode, dark mode, or both.
- 🔍 **Element & Full Page Capture**: Target specific CSS selectors (`#hero`, `.card`, `#pricing-table`) or capture entire scrollable documents.
- 🧩 **Zero Playwright Boilerplate**: Users don't need to write custom browser automation scripts.
- 🔌 **Integrator-friendly CLI**: `--cwd`, `--quiet`, and `--json` for PHP/CI tools that shell out to capturist.
- 🚀 **Framework Agnostic**: Works with Vite, Next.js, Astro, SvelteKit, Remix, Nuxt, static HTML, and docs generators.

---

## 📦 Installation

```bash
npm install -D capturist playwright
```

*Note: You can also install only the Chromium browser engine:*
```bash
npx playwright install chromium
```

---

## ⚡ Quick Start

### 1. Initialize configuration

```bash
npx capturist init
```

This creates `capturist.config.ts` (or `.js` / `.mjs`):

```ts
import { defineConfig } from "capturist";

export default defineConfig({
  baseUrl: "http://localhost:3000",
  retina: true, // Crisp 2x HiDPI previews
  outputDir: "public/og",
  pages: [
    {
      route: "/",
      output: "home.png",
    },
    {
      route: "/features",
      output: "features.png",
    },
    {
      route: "/pricing",
      output: "pricing.png",
    },
  ],
});
```

### 2. Add build script

In your `package.json`:

```json
{
  "scripts": {
    "build": "vite build",
    "generate:og": "capturist"
  }
}
```

### 3. Generate screenshots

```bash
npm run generate:og
```

Output:
```text
📸 capturist v0.1.2 — Deterministic static screenshot engine

ℹ Loaded config: capturist.config.ts
  ✓ / → public/og/home.png (1200x630) 184.5 KB 340ms
  ✓ /features → public/og/features.png (1200x630) 198.2 KB 285ms
  ✓ /pricing → public/og/pricing.png (1200x630) 162.4 KB 260ms

Done! Generated 3/3 screenshots in 0.88s → public/og
```

---

## 🛠 Configuration Reference

### Global Options (`CapturistConfig`)

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `baseUrl` | `string` | `undefined` | Base URL prepended to relative routes (e.g. `http://localhost:3000`). |
| `outputDir` | `string` | `"public"` | Default directory where screenshots are saved. |
| `retina` | `boolean` | `false` | Shorthand to enable 2x HiDPI Retina resolution (`scale: 2`). |
| `scale` | `number` | `1` | Device pixel ratio multiplier (e.g. `2` or `3`). |
| `viewport` | `Viewport` | `{ width: 1200, height: 630 }` | Default viewport dimensions and scale factor. |
| `pages` | `PageConfig[]` | `[]` | Array of page targets to capture. |
| `concurrency` | `number` | `os.cpus().length` | Maximum concurrent browser pages. |
| `server` | `StaticServerConfig` | `undefined` | Built-in local static server configuration (e.g. `{ dir: "./dist" }`). |
| `browser` | `"chromium" \| "firefox" \| "webkit"` | `"chromium"` | Browser engine. |
| `colorScheme` | `"light" \| "dark" \| "no-preference"` | `"light"` | Emulated color scheme. |
| `disableAnimations` | `boolean` | `true` | Injects CSS to freeze transitions, animations, and carets. |
| `defaultDelay` | `number` | `0` | Extra delay in ms after page load. |
| `defaultWaitFor` | `string` | `undefined` | Selector to wait for across all pages. |
| `timeout` | `number` | `30000` | Navigation timeout in ms. |
| `beforeScreenshot` | `Function` | `undefined` | Global hook executed before each screenshot. |

### Page Options (`PageConfig`)

Provide **one of** `route`/`url`, `html`, or `htmlFile`.

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `route` / `url` | `string` | — | Route path (e.g. `"/pricing"`) or fully qualified URL. |
| `html` | `string` | — | Inline HTML document (no server / baseUrl needed). Ideal for OG cards. |
| `htmlFile` | `string` | — | Path to an HTML file to capture (no server needed). |
| `label` | `string` | auto | Name used in logs / JSON results. |
| `output` | `string` | **Required** | Output filename or path (e.g. `"pricing.png"`, `"og/card.png"`). |
| `outputDir` | `string` | `global.outputDir` | Per-page output directory override. |
| `retina` | `boolean` | `global.retina` | Per-page 2x Retina resolution toggle. |
| `scale` | `number` | `global.scale` | Per-page device pixel ratio override. |
| `viewport` | `Viewport` | `global.viewport` | Per-page viewport dimensions. |
| `selector` | `string` | `undefined` | Capture bounding box of a specific element (e.g. `"#hero-card"`). |
| `fullPage` | `boolean` | `false` | Capture the full scrollable page height. |
| `colorScheme` | `"light" \| "dark"` | `global.colorScheme` | Per-page color scheme override. |
| `delay` | `number` | `0` | Wait delay in ms before capturing. |
| `waitFor` | `string \| number` | `undefined` | Wait for selector or ms. |
| `disableAnimations`| `boolean` | `true` | Suppress animations for deterministic captures. |
| `omitBackground` | `boolean` | `false` | Transparent background for PNG. |
| `type` | `"png" \| "jpeg" \| "webp"` | `"png"` | Output image format (inferred from filename if omitted). |
| `quality` | `number` | `undefined` | Quality (0-100) for JPEG/WebP. |
| `beforeScreenshot` | `Function` | `undefined` | Page-level hook for custom DOM interactions. |

---

## 🖥 CLI Usage

```bash
capturist [command] [options]
```

### Options

- `-c, --config <path>`: Custom path to configuration file (`.ts`, `.js`, `.json`).
- `-u, --baseUrl <url>`: Override base URL.
- `-o, --outputDir <dir>`: Override output directory.
- `--concurrency <n>`: Set parallel worker count.
- `--serverDir <dir>`: Serve static directory automatically.
- `--serverPort <port>`: Port for static server.
- `--cwd <dir>`: Working directory for config and relative paths.
- `-q, --quiet`: Suppress human logs (errors still print).
- `--json`: Print a machine-readable JSON summary on stdout.
- `--dry-run`: Validate configuration without launching browser.
- `--verbose`: Enable debug logging.
- `-v, --version`: Print version.
- `-h, --help`: Show help.

---

## 🎴 HTML → PNG (OG cards / SSG integration)

When you already have HTML (a docs generator, MD frontmatter card, etc.), skip routes and servers:

```ts
import { defineConfig } from "capturist";

export default defineConfig({
  outputDir: "docs/og",
  retina: true,
  pages: [
    {
      label: "cover",
      html: `<!DOCTYPE html>
<html><body style="margin:0;width:1200px;height:630px;display:flex;flex-direction:column;justify-content:center;padding:80px;background:#0c141d;color:#e9f1fb;font-family:system-ui,sans-serif">
  <div style="font-size:28px;color:#a6b8cc">My Docs</div>
  <h1 style="font-size:64px;margin:24px 0 0;letter-spacing:-0.03em">Getting Started</h1>
</body></html>`,
      output: "cover.png",
    },
  ],
});
```

Or from Node without a config file:

```ts
import { captureHtml } from "capturist";

await captureHtml(htmlString, {
  output: "docs/og/cover.png",
  width: 1200,
  height: 630,
  scale: 2,
});
```

### JSON config contract (for PHP / other tools)

Static site tools can emit `capturist.config.json` and shell out:

```json
{
  "outputDir": "og",
  "viewport": { "width": 1200, "height": 630 },
  "pages": [
    {
      "label": "cover",
      "html": "<!DOCTYPE html><html>…card…</html>",
      "output": "cover.png"
    },
    {
      "label": "installation",
      "htmlFile": "og/preview/installation.html",
      "output": "installation.png"
    }
  ]
}
```

```bash
npx capturist --cwd ./docs --config capturist.config.json --json --quiet
```

`--json` stdout shape:

```json
{
  "ok": true,
  "total": 2,
  "succeeded": 2,
  "failed": 0,
  "totalDurationMs": 840,
  "outputDir": "/abs/path/docs/og",
  "results": [
    {
      "route": "cover",
      "outputPath": "cover.png",
      "absolutePath": "/abs/path/docs/og/cover.png",
      "sizeBytes": 48210,
      "width": 1200,
      "height": 630,
      "durationMs": 320,
      "success": true
    }
  ]
}
```

Exit code `0` when all captures succeed; `1` if any fail.

---

## 💡 Advanced Examples

### 1. Capturing a Built Static Site Zero-Config

No need to start a dev server manually: `capturist` includes a built-in static server that serves `./dist` directly and can execute your build script!

```ts
import { defineConfig } from "capturist";

export default defineConfig({
  server: {
    dir: "./dist",
    buildCommand: "npm run build",
  },
  retina: true,
  outputDir: "public/og",
  pages: [
    { route: "/", output: "home.png" },
    { route: "/features", output: "features.png" },
    { route: "/pricing", output: "pricing.png" },
    { route: "/changelog", output: "changelog.png" },
  ],
});
```

### 2. High-DPI Open Graph Cards (2400 × 1260)

For crisp Retina previews across Twitter, LinkedIn, and Facebook:

```ts
import { defineConfig } from "capturist";

export default defineConfig({
  viewport: {
    width: 1200,
    height: 630,
    deviceScaleFactor: 2, // 2x physical resolution (2400x1260)
  },
  pages: [
    { route: "/", output: "home.png" },
  ],
});
```

### 3. Light and Dark Mode Previews

```ts
import { defineConfig } from "capturist";

export default defineConfig({
  baseUrl: "http://localhost:3000",
  pages: [
    { route: "/", output: "home-light.png", colorScheme: "light" },
    { route: "/", output: "home-dark.png", colorScheme: "dark" },
  ],
});
```

### 4. Element Selector Screenshots

Capture only a specific widget, hero card, or diagram:

```ts
import { defineConfig } from "capturist";

export default defineConfig({
  baseUrl: "http://localhost:3000",
  pages: [
    {
      route: "/pricing",
      selector: "#pricing-table",
      output: "assets/pricing-card.png",
      omitBackground: true,
    },
  ],
});
```

### 5. Interactive `beforeScreenshot` Hook

Interact with your UI (e.g. close modals, click tabs, accept cookies) before capturing:

```ts
import { defineConfig } from "capturist";

export default defineConfig({
  baseUrl: "http://localhost:3000",
  pages: [
    {
      route: "/dashboard",
      output: "dashboard-analytics.png",
      beforeScreenshot: async ({ page }) => {
        // Switch to the 'Analytics' tab
        await page.click("button#tab-analytics");
        await page.waitForSelector("#chart-ready");
      },
    },
  ],
});
```

---

## 💻 Programmatic API

You can use `capturist` directly from your Node.js or TypeScript build scripts:

```ts
import { generateScreenshots, defineConfig } from "capturist";

const config = defineConfig({
  baseUrl: "http://localhost:3000",
  retina: true,
  pages: [
    { route: "/", output: "public/og/home.png" },
    { route: "/pricing", output: "public/og/pricing.png" },
  ],
});

const summary = await generateScreenshots(config);
console.log(`Generated ${summary.succeeded}/${summary.total} screenshots.`);
```

---

## 🚀 CI/CD Automation (GitHub Actions)

Generate up-to-date screenshots automatically on every deploy:

```yaml
name: Generate Screenshots

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install chromium --with-deps

      - name: Build site & generate screenshots
        run: |
          npm run build
          npx capturist
```

---

## 🗺 Future Roadmap

- 📱 Responsive device presets (iPhone, iPad, Pixel, Desktop)
- ⏱ Watch mode with live reload
- 🖼 Built-in image optimization (WebP/AVIF compression)
- 🔐 Cookie and authentication injection hooks
- 🌐 Multi-viewport matrix generation in a single pass

---

## 📄 License

MIT © [Punyapal Shah](https://github.com/MrPunyapal)
