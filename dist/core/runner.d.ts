import type { SiteSnapConfig, ScreenshotResult, RunSummary } from "../types/index.js";
/**
 * Primary programmatic orchestrator: generates all screenshots according to configuration.
 */
export declare function generateScreenshots(config: SiteSnapConfig, options?: {
    cwd?: string;
    onProgress?: (result: ScreenshotResult) => void;
}): Promise<RunSummary>;
//# sourceMappingURL=runner.d.ts.map