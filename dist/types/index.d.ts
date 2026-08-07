import type { BrowserContext, Page, LaunchOptions } from "playwright-core";
/**
 * Viewport dimensions and device scale factor for screenshot captures.
 */
export interface Viewport {
    /** Viewport width in pixels. Default is 1200. */
    width: number;
    /** Viewport height in pixels. Default is 630. */
    height: number;
    /** Device scale factor (e.g. 2 for Retina / HiDPI). Default is 1. */
    deviceScaleFactor?: number;
}
/**
 * Preferred color scheme emulation.
 */
export type ColorScheme = "light" | "dark" | "no-preference";
/**
 * Supported browser engines.
 */
export type BrowserName = "chromium" | "firefox" | "webkit";
/**
 * Supported screenshot image formats.
 */
export type ScreenshotFormat = "png" | "jpeg" | "webp";
/**
 * Configuration for the built-in local static server.
 */
export interface StaticServerConfig {
    /** Directory path to serve statically (e.g. "./dist", "./public", or "."). */
    dir: string;
    /** Port number to bind. Defaults to an available ephemeral port (e.g. 4173 or auto-detected). */
    port?: number;
    /** Hostname to bind. Defaults to "127.0.0.1". */
    host?: string;
    /** Optional custom command to run before screenshot generation (e.g. "npm run build"). */
    buildCommand?: string;
}
/**
 * Hook context passed to `beforeScreenshot` callbacks.
 */
export interface ScreenshotHookContext {
    /** The active Playwright Page instance. */
    page: Page;
    /** The active Playwright BrowserContext instance. */
    context: BrowserContext;
    /** The route being captured. */
    route: string;
    /** Target output destination path. */
    outputPath: string;
    /** Resolved configuration for this specific page. */
    pageConfig: PageConfig;
    /** The full global SnapSiteConfig. */
    config: SnapSiteConfig;
}
/**
 * Function called before a screenshot is taken, allowing DOM manipulation, interactions, or state setup.
 */
export type BeforeScreenshotHook = (ctx: ScreenshotHookContext) => Promise<void> | void;
/**
 * Configuration for an individual page screenshot target.
 */
export interface PageConfig {
    /**
     * The route or path to navigate to (e.g. "/", "/projects", "/talks").
     * Can also be a fully qualified URL (e.g. "https://example.com/about").
     */
    route?: string;
    /**
     * Alias for `route`.
     */
    url?: string;
    /**
     * The output filename or relative path (e.g. "master-og-image.png", "og/projects.png").
     */
    output: string;
    /**
     * Optional directory override for this page's screenshot.
     */
    outputDir?: string;
    /**
     * Viewport dimensions for this specific page. Overrides the global viewport.
     */
    viewport?: Viewport;
    /**
     * CSS selector of a specific element to capture (e.g. "#hero", ".card", "main").
     * When specified, only that element's bounding box is captured.
     */
    selector?: string;
    /**
     * Whether to capture the full scrollable page instead of just the viewport.
     * Default is false.
     */
    fullPage?: boolean;
    /**
     * Emulated color scheme ("light" | "dark" | "no-preference"). Overrides global setting.
     */
    colorScheme?: ColorScheme;
    /**
     * Additional delay in milliseconds to wait after page load and network idle before capturing.
     */
    delay?: number;
    /**
     * CSS selector or state to wait for before capturing (e.g. "#ready-indicator", "main > img").
     */
    waitFor?: string | number;
    /**
     * Whether to automatically inject CSS to disable animations, transitions, and blinking carets.
     * Ensures deterministic rendering. Default is true.
     */
    disableAnimations?: boolean;
    /**
     * Whether to hide the default white background for transparent PNG captures.
     * Default is false.
     */
    omitBackground?: boolean;
    /**
     * Image format type ("png" | "jpeg" | "webp"). Default is "png".
     */
    type?: ScreenshotFormat;
    /**
     * Image quality between 0 and 100 (for jpeg/webp).
     */
    quality?: number;
    /**
     * Lifecycle hook executed right before capturing the screenshot.
     */
    beforeScreenshot?: BeforeScreenshotHook;
    /**
     * Custom metadata attached to this page capture.
     */
    metadata?: Record<string, unknown>;
}
/**
 * Root configuration for snapsite.
 */
export interface SnapSiteConfig {
    /**
     * Base URL prepended to all relative routes (e.g. "http://localhost:3000", "https://example.com").
     * If not specified and `server` is configured, the local server URL is automatically used.
     */
    baseUrl?: string;
    /**
     * Default output directory where screenshots are saved (e.g. "public", "dist/og", "./screenshots").
     * Default is "public".
     */
    outputDir?: string;
    /**
     * Default viewport dimensions for all pages.
     * Default is { width: 1200, height: 630, deviceScaleFactor: 1 }.
     */
    viewport?: Viewport;
    /**
     * Array of page targets to capture.
     */
    pages: PageConfig[];
    /**
     * Number of concurrent browser pages to run simultaneously.
     * Defaults to Math.min(4, os.cpus().length).
     */
    concurrency?: number;
    /**
     * Built-in static folder server configuration for testing local builds (e.g. `./dist`).
     */
    server?: StaticServerConfig;
    /**
     * Browser engine to use ("chromium" | "firefox" | "webkit"). Default is "chromium".
     */
    browser?: BrowserName;
    /**
     * Custom launch options passed directly to Playwright's `browserType.launch()`.
     */
    launchOptions?: LaunchOptions;
    /**
     * Global color scheme emulation ("light" | "dark" | "no-preference"). Default is "light".
     */
    colorScheme?: ColorScheme;
    /**
     * Globally disable CSS animations, transitions, and blinking carets for deterministic output.
     * Default is true.
     */
    disableAnimations?: boolean;
    /**
     * Default delay in milliseconds to wait after navigation before taking each screenshot.
     * Default is 0.
     */
    defaultDelay?: number;
    /**
     * Default CSS selector to wait for across all pages before capturing.
     */
    defaultWaitFor?: string;
    /**
     * Navigation and capture timeout in milliseconds per page. Default is 30000 (30 seconds).
     */
    timeout?: number;
    /**
     * Global lifecycle hook executed before every page screenshot.
     */
    beforeScreenshot?: BeforeScreenshotHook;
    /**
     * Custom HTTP headers to send with page requests.
     */
    headers?: Record<string, string>;
    /**
     * Custom User-Agent string to emulate.
     */
    userAgent?: string;
}
/**
 * Result details for a single screenshot capture.
 */
export interface ScreenshotResult {
    /** The route that was captured. */
    route: string;
    /** Relative output file path. */
    outputPath: string;
    /** Absolute output file path on disk. */
    absolutePath: string;
    /** File size in bytes. */
    sizeBytes: number;
    /** Viewport or element width in pixels. */
    width: number;
    /** Viewport or element height in pixels. */
    height: number;
    /** Time taken to capture in milliseconds. */
    durationMs: number;
    /** Whether the capture succeeded. */
    success: boolean;
    /** Error instance if capture failed. */
    error?: Error;
}
/**
 * Overall summary returned by `generateScreenshots()`.
 */
export interface RunSummary {
    /** Individual screenshot results. */
    results: ScreenshotResult[];
    /** Total number of pages processed. */
    total: number;
    /** Number of successful captures. */
    succeeded: number;
    /** Number of failed captures. */
    failed: number;
    /** Total execution time in milliseconds. */
    totalDurationMs: number;
    /** Resolved output directory. */
    outputDir: string;
}
/**
 * Command-line interface options.
 */
export interface CliOptions {
    /** Path to custom configuration file. */
    config?: string;
    /** Base URL override. */
    baseUrl?: string;
    /** Output directory override. */
    outputDir?: string;
    /** Concurrency level override. */
    concurrency?: number;
    /** Directory for built-in static server. */
    serverDir?: string;
    /** Port for built-in static server. */
    serverPort?: number;
    /** Print verbose debug output. */
    verbose?: boolean;
    /** Dry run mode (validates config without launching browser). */
    dryRun?: boolean;
    /** Show version. */
    version?: boolean;
    /** Show help. */
    help?: boolean;
    /** Init command. */
    init?: boolean;
}
//# sourceMappingURL=index.d.ts.map