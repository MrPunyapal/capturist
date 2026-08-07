import type { Browser, BrowserContext, LaunchOptions } from "playwright-core";
import type { PageShotConfig, Viewport, ColorScheme } from "../types/index.js";

/**
 * Resolves the Playwright browser module dynamically (playwright or playwright-core).
 */
export async function getPlaywrightBrowser(browserType: "chromium" | "firefox" | "webkit" = "chromium") {
  let playwright: any;
  try {
    playwright = await import("playwright");
  } catch {
    try {
      playwright = await import("playwright-core");
    } catch {
      throw new Error(
        'Neither "playwright" nor "playwright-core" was found. Please install playwright:\n\n  npm install -D playwright\n  npx playwright install chromium\n'
      );
    }
  }

  const engine = playwright[browserType] || playwright.chromium;
  if (!engine) {
    throw new Error(`Unsupported browser engine: "${browserType}". Must be chromium, firefox, or webkit.`);
  }

  return engine;
}

/**
 * Launches a browser instance with production-grade flags for deterministic rendering.
 */
export async function launchBrowser(config: PageShotConfig): Promise<Browser> {
  const browserName = config.browser || "chromium";
  const engine = await getPlaywrightBrowser(browserName);

  const defaultArgs = [
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--disable-dev-shm-usage",
    "--font-render-hinting=none",
  ];

  const launchOpts: LaunchOptions = {
    headless: true,
    args: defaultArgs,
    ...config.launchOptions,
  };

  try {
    return await engine.launch(launchOpts);
  } catch (err: any) {
    if (err.message && err.message.includes("Executable doesn't exist")) {
      throw new Error(
        `Playwright browser binaries are not installed. Run:\n\n  npx playwright install ${browserName}\n`
      );
    }
    throw err;
  }
}

/**
 * Creates an isolated browser context configured with viewport, scale factor, and color schemes.
 */
export async function createBrowserContext(
  browser: Browser,
  viewport: Viewport,
  colorScheme: ColorScheme = "light",
  config: PageShotConfig
): Promise<BrowserContext> {
  return await browser.newContext({
    viewport: {
      width: viewport.width,
      height: viewport.height,
    },
    deviceScaleFactor: viewport.deviceScaleFactor || 1,
    colorScheme: colorScheme === "no-preference" ? "no-preference" : colorScheme,
    reducedMotion: "reduce",
    extraHTTPHeaders: config.headers,
    userAgent: config.userAgent,
    locale: "en-US",
    timezoneId: "UTC",
  });
}
