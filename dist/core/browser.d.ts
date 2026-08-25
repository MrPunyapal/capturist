import type { Browser, BrowserContext } from "playwright-core";
import type { CapturistConfig, Viewport, ColorScheme } from "../types/index.js";
/** Shape returned by `context.storageState()` / accepted by `newContext({ storageState })`. */
type ContextStorageState = Awaited<ReturnType<BrowserContext["storageState"]>>;
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
 *
 * When `options.recordVideoDir` is provided (video captures), the context records
 * WebM video at the viewport size; the runner moves the finished file into place.
 * When `options.storageState` is provided (after `before` setup steps), cookies
 * and storage carry into this context so captures start already authenticated.
 */
export declare function createBrowserContext(browser: Browser, viewport: Viewport, colorScheme: ColorScheme | undefined, config: CapturistConfig, options?: {
    recordVideoDir?: string;
    storageState?: ContextStorageState;
}): Promise<BrowserContext>;
export {};
//# sourceMappingURL=browser.d.ts.map