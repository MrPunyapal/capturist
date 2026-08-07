# 📸 page-shot

> **The canonical, configuration-driven screenshot engine for websites and Open Graph images.**  
> Turn your actual web pages into pixel-perfect static screenshots, social preview cards, and visual assets automatically.

[![npm version](https://img.shields.io/npm/v/page-shot.svg?color=blue&style=flat-square)](https://www.npmjs.com/package/page-shot)
[![license](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](LICENSE)
[![Playwright](https://img.shields.io/badge/powered%20by-Playwright-2EAD33.svg?style=flat-square&logo=playwright)](https://playwright.dev/)
[![TypeScript](https://img.shields.io/badge/written%20in-TypeScript-3178C6.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)

---

## 💡 Why page-shot?

Many websites generate Open Graph images using Canva, Figma, Photoshop, or canvas-based SVG generators. These quickly become stale: when you change your website layout, design, or copy, the social share images lag behind.

**`page-shot` flips this workflow: your website itself becomes the social preview.**

```
/           ──►  public/master-og-image.png
/projects   ──►  public/og/projects.png
/talks      ──►  public/og/talks.png
/opensource ──►  public/og/opensource.png
/resume     ──►  public/og/resume.png
```

Whenever your website changes, running `page-shot` automatically updates every preview image deterministically.

---

## ✨ Features

- 🎯 **Configuration-driven**: Intuitive, type-safe `defineConfig` API like Vite, Vitest, and ESLint.
- ⚡ **Playwright Powered**: Handles browser launch, parallel worker pools, and clean teardown internally.
- 🧊 **Deterministic Screenshots**: Automatically waits for `document.fonts.ready`, freezes CSS animations & transitions, and disables blinking carets.
- 📦 **Built-in Static Server**: Preview and capture local static folders (`./dist`, `./public`) without running separate dev server commands.
- 🌓 **Color Scheme Emulation**: Render light mode, dark mode, or both.
- 🔍 **Element & Full Page Capture**: Target specific CSS selectors (`#hero`, `.card`) or capture entire scrollable documents.
- 🧩 **Zero Playwright Boilerplate**: Users don't need to write custom browser automation scripts.
- 🚀 **Framework Agnostic**: Works with Vite, Next.js, Astro, SvelteKit, Remix, Nuxt, and static HTML.

---

## 📦 Installation

```bash
npm install -D page-shot playwright
```

*Note: You can also install only the Chromium browser engine:*
```bash
npx playwright install chromium
```

---

## ⚡ Quick Start

### 1. Initialize configuration

```bash
npx page-shot init
```

This creates `page-shot.config.ts` (or `.js`):

```ts
import { defineConfig } from "page-shot";

export default defineConfig({
  baseUrl: "http://localhost:3000",
  viewport: {
    width: 1200,
    height: 630,
  },
  outputDir: "public",
  pages: [
    {
      route: "/",
      output: "master-og-image.png",
    },
    {
      route: "/projects",
      output: "og/projects.png",
    },
    {
      route: "/talks",
      output: "og/talks.png",
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
    "generate:og": "page-shot"
  }
}
```

### 3. Generate screenshots

```bash
npm run generate:og
```

Output:
```text
📸 page-shot v1.0.0 — Deterministic static screenshot engine

ℹ Loaded config: page-shot.config.ts
  ✓ / → master-og-image.png (1200x630) 142.5 KB 340ms
  ✓ /projects → og/projects.png (1200x630) 168.2 KB 285ms
  ✓ /talks → og/talks.png (1200x630) 129.4 KB 260ms

Done! Generated 3/3 screenshots in 0.88s → public
```

---

## 🛠 Configuration Reference

### Global Options (`PageShotConfig`)

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `baseUrl` | `string` | `undefined` | Base URL prepended to relative routes (e.g. `http://localhost:5173`). |
| `outputDir` | `string` | `"public"` | Default directory where screenshots are saved. |
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

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `route` / `url` | `string` | **Required** | Route path (e.g. `"/about"`) or fully qualified URL. |
| `output` | `string` | **Required** | Output filename or path (e.g. `"master-og.png"`, `"og/card.png"`). |
| `outputDir` | `string` | `global.outputDir` | Per-page output directory override. |
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
page-shot [command] [options]
```

### Options

- `-c, --config <path>`: Custom path to configuration file.
- `-u, --baseUrl <url>`: Override base URL.
- `-o, --outputDir <dir>`: Override output directory.
- `--concurrency <n>`: Set parallel worker count.
- `--serverDir <dir>`: Serve static directory automatically.
- `--serverPort <port>`: Port for static server.
- `--dry-run`: Validate configuration without launching browser.
- `--verbose`: Enable debug logging.
- `-v, --version`: Print version.
- `-h, --help`: Show help.

---

## 💡 Advanced Examples

### 1. Capturing a Built Static Site Zero-Config

No need to start a dev server manually: `page-shot` includes a built-in static server that serves `./dist` directly!

```ts
import { defineConfig } from "page-shot";

export default defineConfig({
  server: {
    dir: "./dist",
  },
  pages: [
    { route: "/", output: "master-og-image.png" },
    { route: "/projects", output: "og/projects.png" },
    { route: "/talks", output: "og/talks.png" },
    { route: "/resume", output: "og/resume.png" },
  ],
});
```

### 2. High-DPI Open Graph Cards (2400 × 1260)

For crisp Retina previews across Twitter, LinkedIn, and Facebook:

```ts
export default defineConfig({
  viewport: {
    width: 2400,
    height: 1260,
    deviceScaleFactor: 2,
  },
  pages: [
    { route: "/", output: "master-og-image.png" },
  ],
});
```

### 3. Light and Dark Mode Previews

```ts
export default defineConfig({
  baseUrl: "http://localhost:3000",
  pages: [
    { route: "/", output: "og/home-light.png", colorScheme: "light" },
    { route: "/", output: "og/home-dark.png", colorScheme: "dark" },
  ],
});
```

### 4. Element Selector Screenshots

Capture only a specific widget, hero card, or diagram:

```ts
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
export default defineConfig({
  baseUrl: "http://localhost:3000",
  pages: [
    {
      route: "/dashboard",
      output: "og/dashboard-analytics.png",
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

You can use `page-shot` directly from your Node.js or TypeScript build scripts:

```ts
import { generateScreenshots, defineConfig } from "page-shot";

const config = defineConfig({
  baseUrl: "https://mrpunyapal.dev",
  pages: [
    { route: "/", output: "public/master-og-image.png" },
    { route: "/projects", output: "public/og/projects.png" },
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
          npx page-shot
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

MIT © [Punyapal Manvi](https://github.com/MrPunyapal)
