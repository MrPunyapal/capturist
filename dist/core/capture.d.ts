import type { BrowserContext } from "playwright-core";
import type { PageConfig, PageShotConfig, ScreenshotResult } from "../types/index.js";
/**
 * Captures a single page screenshot deterministically.
 */
export declare function capturePageScreenshot(context: BrowserContext, pageConfig: PageConfig, globalConfig: PageShotConfig, targetFilePath: string): Promise<ScreenshotResult>;
//# sourceMappingURL=capture.d.ts.map