import type { BrowserContext } from "playwright-core";
import type { PageConfig, CapturistConfig, ScreenshotResult } from "../types/index.js";
/**
 * Captures a single page screenshot deterministically.
 */
export declare function capturePageScreenshot(context: BrowserContext, pageConfig: PageConfig, globalConfig: CapturistConfig, targetFilePath: string, options?: {
    cwd?: string;
}): Promise<ScreenshotResult>;
/**
 * Records a page flow as a video (`.webm`).
 *
 * The browser context must have been created with `recordVideo` enabled —
 * the runner handles that. Steps execute in order while Playwright records;
 * the video is finalized when the page closes.
 */
export declare function capturePageVideo(context: BrowserContext, pageConfig: PageConfig, globalConfig: CapturistConfig, targetFilePath: string, options?: {
    cwd?: string;
}): Promise<ScreenshotResult>;
//# sourceMappingURL=capture.d.ts.map