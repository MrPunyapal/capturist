import type { CapturistConfig, PageConfig, Viewport, ScreenshotFormat } from "../types/index.js";
export declare const DEFAULT_VIEWPORT: Viewport;
export declare const DEFAULT_OUTPUT_DIR = "public";
export declare const DEFAULT_TIMEOUT = 30000;
/**
 * Infers image format type from output filename extension if not explicitly set.
 */
export declare function inferFormatFromPath(outputPath: string): ScreenshotFormat;
/**
 * Resolves the device scale factor considering scale and retina presets.
 */
export declare function resolveScaleFactor(viewport?: Viewport, scale?: number, retina?: boolean): number;
/**
 * Validates and normalizes a single page configuration.
 */
/**
 * Returns true when a page captures inline/file HTML instead of navigating to a URL.
 */
export declare function isHtmlPage(page: Pick<PageConfig, "html" | "htmlFile">): boolean;
/**
 * Human-readable target id for logs / results when no route is set.
 */
export declare function resolvePageLabel(page: PageConfig): string;
export declare function validatePageConfig(page: unknown, index: number, globalConfig: CapturistConfig): PageConfig;
/**
 * Validates a viewport object.
 */
export declare function validateViewport(viewport: unknown, label?: string): Viewport;
/**
 * Validates and applies defaults to a full `CapturistConfig`.
 */
export declare function validateConfig(config: unknown): CapturistConfig;
//# sourceMappingURL=validate.d.ts.map