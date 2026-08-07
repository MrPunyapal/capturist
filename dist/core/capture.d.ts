import type { BrowserContext } from "playwright-core";
import type { PageConfig, SnapSiteConfig, ScreenshotResult } from "../types/index.js";
/**
 * Captures a single page screenshot deterministically.
 */
export declare function capturePageScreenshot(context: BrowserContext, pageConfig: PageConfig, globalConfig: SnapSiteConfig, targetFilePath: string): Promise<ScreenshotResult>;
//# sourceMappingURL=capture.d.ts.map