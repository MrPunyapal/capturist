import type { CapturistConfig, PageConfig, ScreenshotResult, RunSummary, CaptureHtmlOptions } from "../types/index.js";
/**
 * True when at least one page needs HTTP navigation (and thus baseUrl/server).
 */
export declare function needsNetworkNavigation(pages: PageConfig[]): boolean;
export interface GenerateScreenshotsOptions {
    cwd?: string;
    onProgress?: (result: ScreenshotResult) => void;
    quiet?: boolean;
    /** Force recapture every page (ignore cache). */
    force?: boolean;
    /** Override config.cache for this run. */
    cache?: boolean;
}
/**
 * Primary programmatic orchestrator: generates all screenshots according to configuration.
 *
 * When `cache` is enabled (config or options), unchanged pages are skipped.
 */
export declare function generateScreenshots(config: CapturistConfig, options?: GenerateScreenshotsOptions): Promise<RunSummary>;
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