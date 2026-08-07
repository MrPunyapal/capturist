import type { CapturistConfig, ScreenshotResult, RunSummary } from "../types/index.js";
/**
 * Primary programmatic orchestrator: generates all screenshots according to configuration.
 */
export declare function generateScreenshots(config: CapturistConfig, options?: {
    cwd?: string;
    onProgress?: (result: ScreenshotResult) => void;
}): Promise<RunSummary>;
//# sourceMappingURL=runner.d.ts.map