import type { Browser, BrowserContext } from "playwright-core";
import type { CapturistConfig, Viewport, ColorScheme } from "../types/index.js";
/**
 * Resolves the Playwright browser module dynamically (playwright or playwright-core).
 */
export declare function getPlaywrightBrowser(browserType?: "chromium" | "firefox" | "webkit"): Promise<any>;
/**
 * Launches a browser instance with production-grade flags for deterministic rendering.
 */
export declare function launchBrowser(config: CapturistConfig): Promise<Browser>;
/**
 * Creates an isolated browser context configured with viewport, scale factor, and color schemes.
 */
export declare function createBrowserContext(browser: Browser, viewport: Viewport, colorScheme: ColorScheme | undefined, config: CapturistConfig): Promise<BrowserContext>;
//# sourceMappingURL=browser.d.ts.map