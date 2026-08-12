import type { CapturistConfig, PageConfig, ScreenshotResult, RunSummary, CaptureHtmlOptions } from "../types/index.js";
/**
 * True when at least one page needs HTTP navigation (and thus baseUrl/server).
 */
export declare function needsNetworkNavigation(pages: PageConfig[]): boolean;
/**
 * Primary programmatic orchestrator: generates all screenshots according to configuration.
 */
export declare function generateScreenshots(config: CapturistConfig, options?: {
    cwd?: string;
    onProgress?: (result: ScreenshotResult) => void;
    quiet?: boolean;
}): Promise<RunSummary>;
/**
 * One-shot helper for integrators (SSGs, scripts, other tools):
 * capture a single HTML string to an image file without writing a config file.
 *
 * @example
 * ```ts
 * import { captureHtml } from "capturist";
 *
 * await captureHtml("<!DOCTYPE html><html>…</html>", {
 *   output: "docs/og/cover.png",
 *   width: 1200,
 *   height: 630,
 *   scale: 2,
 * });
 * ```
 */
export declare function captureHtml(html: string, options: CaptureHtmlOptions): Promise<ScreenshotResult>;
//# sourceMappingURL=runner.d.ts.map