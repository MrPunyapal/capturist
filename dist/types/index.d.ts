import type { BrowserContext, Page, LaunchOptions } from "playwright-core";
/**
 * Viewport dimensions and device scale factor for screenshot captures.
 */
export interface Viewport {
    /** Viewport width in pixels. Default is 1200. */
    width: number;
    /** Viewport height in pixels. Default is 630. */
    height: number;
    /** Device scale factor (e.g. 2 for Retina / HiDPI). Default is 1 (or 2 if retina: true). */
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
    /** The full global CapturistConfig. */
    config: CapturistConfig;
}
/**
 * Function called before a screenshot is taken, allowing DOM manipulation, interactions, or state setup.
 */
export type BeforeScreenshotHook = (ctx: ScreenshotHookContext) => Promise<void> | void;
/**
 * A single declarative interaction executed against the page while a video is
 * being recorded. Steps run in order after the initial navigation.
 *
 * - `goto` — navigate to a URL (absolute, or resolved against `baseUrl`)
 * - `click` / `dblclick` / `hover` — pointer interactions on a selector
 * - `fill` — clear an input and set its value in one step
 * - `type` — keystroke-by-keystroke input (optional per-character delay)
 * - `press` — keyboard key press ("Enter", "Control+A", …), optionally focused on a selector
 * - `scroll` — wheel scroll by pixel offsets, or into view of a selector
 * - `wait` — pause for `ms` milliseconds and/or until `selector` is visible
 * - `screenshot` — capture a still frame mid-flow into the page's output directory
 */
export type RecordStep = {
    action: "goto";
    url: string;
} | {
    action: "click";
    selector: string;
} | {
    action: "dblclick";
    selector: string;
} | {
    action: "hover";
    selector: string;
} | {
    action: "fill";
    selector: string;
    value: string;
} | {
    action: "type";
    selector: string;
    text: string;
    delay?: number;
} | {
    action: "press";
    key: string;
    selector?: string;
} | {
    action: "scroll";
    x?: number;
    y?: number;
    selector?: string;
} | {
    action: "wait";
    ms?: number;
    selector?: string;
} | {
    action: "screenshot";
    output: string;
} | {
    action: "focus";
    selector: string;
};
/**
 * Configuration for an individual page screenshot target.
 *
 * Provide **one** of:
 * - `route` / `url` — navigate to a live page (optionally via built-in static server)
 * - `html` — capture an inline HTML document (ideal for OG cards; no server needed)
 * - `htmlFile` — capture an HTML file from disk (no server needed)
 */
export interface PageConfig {
    /**
     * The route or path to navigate to (e.g. "/", "/projects", "/talks").
     * Can also be a fully qualified URL (e.g. "https://example.com/about").
     * Not required when `html` or `htmlFile` is set.
     */
    route?: string;
    /**
     * Alias for `route`.
     */
    url?: string;
    /**
     * Inline HTML document to capture via Playwright `setContent`.
     * Perfect for Open Graph cards and static site generators
     * that already produce HTML strings — no baseUrl or static server required.
     */
    html?: string;
    /**
     * Path to an HTML file to load and capture (relative to cwd or absolute).
     * Same benefits as `html`, but content lives on disk.
     */
    htmlFile?: string;
    /**
     * Optional human-readable label used in logs and machine-readable output.
     * Defaults to `route`, `htmlFile`, or the output filename.
     */
    label?: string;
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
     * Convenient scale factor multiplier (e.g. 2 for high-resolution 2x Retina, 3 for 3x).
     * Overrides `viewport.deviceScaleFactor`.
     */
    scale?: number;
    /**
     * Shorthand boolean to enable crisp 2x Retina resolution (`scale: 2`).
     * Default is false unless globally enabled.
     */
    retina?: boolean;
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
    /**
     * When global `cache` is enabled, set `false` to always recapture this page.
     */
    cache?: boolean;
    /**
     * Extra file paths (relative to cwd or absolute) hashed into the cache fingerprint.
     * Useful when a route's visual output depends on shared CSS/partials not inlined in the HTML.
     */
    inputs?: string[];
    /**
     * Explicit cache fingerprint source. When set, used instead of auto-detected HTML content.
     * Ideal for integrators that already know when a card is dirty.
     */
    cacheKey?: string;
    /**
     * Record the page flow as a video instead of taking a screenshot.
     * Output must use a video extension (`.webm`). Playwright records WebM natively.
     * Default is false.
     */
    video?: boolean;
    /**
     * Declarative interactions executed in order while recording (`video: true`)
     * or before the screenshot. Each step is one of `goto`, `click`, `dblclick`,
     * `hover`, `fill`, `type`, `press`, `scroll`, `wait`, `screenshot`,
     * or `focus`.
     */
    steps?: RecordStep[];
    /**
     * Setup steps (e.g. logging in) that run in a separate browser context
     * BEFORE the capture starts. The resulting cookies / storage carry over,
     * so the recording never shows the login page or other setup navigation.
     */
    before?: RecordStep[];
    /**
     * Pause in milliseconds inserted between recorded steps so viewers can
     * follow the flow. Default 400. Only applies to video captures.
     */
    pace?: number;
}
/**
 * Incremental capture cache settings.
 *
 * When enabled, capturist fingerprints each page (HTML content + capture settings)
 * and skips Playwright for outputs whose fingerprint is unchanged.
 */
export interface CacheConfig {
    /**
     * Enable or disable caching. Default true when a cache object is provided.
     */
    enabled?: boolean;
    /**
     * Manifest path relative to cwd (or absolute).
     * Default: `{outputDir}/.capturist-cache.json`
     */
    path?: string;
    /**
     * When a PNG exists but has no manifest entry, record the current fingerprint
     * and skip capture (avoids a full recapture on first enable). Default true.
     */
    adopt?: boolean;
    /**
     * Delete output files for pages removed from `pages`. Default false.
     */
    prune?: boolean;
}
/**
 * Root configuration for capturist.
 */
export interface CapturistConfig {
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
     * Convenient scale factor multiplier (e.g. 2 for 2x high-resolution Retina, 3 for 3x).
     * Overrides `viewport.deviceScaleFactor`.
     */
    scale?: number;
    /**
     * Shorthand boolean to enable crisp 2x Retina resolution across all pages (`scale: 2`).
     * Default is false (1x).
     */
    retina?: boolean;
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
    /**
     * Incremental capture cache.
     *
     * - `true` — enable with defaults (`{outputDir}/.capturist-cache.json`)
     * - `false` / omit — always capture every page
     * - object — fine-tune path, adopt, prune
     *
     * CLI: `--cache` enables, `--no-cache` / `--force` disables for one run.
     */
    cache?: boolean | CacheConfig;
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
    /** True when the existing file was reused (cache hit). */
    cached?: boolean;
    /** True when the output is a recorded video (`.webm`). */
    video?: boolean;
}
/**
 * Overall summary returned by `generateScreenshots()`.
 */
export interface RunSummary {
    /** Individual screenshot results. */
    results: ScreenshotResult[];
    /** Total number of pages processed (captured + cached). */
    total: number;
    /** Number of successful captures (includes cache hits). */
    succeeded: number;
    /** Number of failed captures. */
    failed: number;
    /** Pages skipped because the cache fingerprint matched. */
    cached: number;
    /** Pages actually captured with Playwright. */
    captured: number;
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
    /** Working directory for config resolution and relative paths. */
    cwd?: string;
    /** Suppress non-error human logs (useful when driven by another tool). */
    quiet?: boolean;
    /** Emit a single JSON summary object on stdout (logs go to stderr unless quiet). */
    json?: boolean;
    /** Print verbose debug output. */
    verbose?: boolean;
    /** Dry run mode (validates config without launching browser). */
    dryRun?: boolean;
    /** Enable incremental cache for this run (even if config omits cache). */
    cache?: boolean;
    /** Disable cache / recapture every page (alias of force). */
    noCache?: boolean;
    /** Force recapture of every page, ignoring cache. */
    force?: boolean;
    /** Show version. */
    version?: boolean;
    /** Show help. */
    help?: boolean;
    /** Init command. */
    init?: boolean;
    /** Single-shot screenshot command options (`capturist shot …`). */
    shot?: SingleShotOptions;
    /** Single-shot video recording command options (`capturist record …`). */
    record?: SingleShotOptions;
}
/**
 * Options for the single-shot CLI commands (`shot` / `record`).
 * These build an in-memory one-page config — no capturist.config.js required.
 */
export interface SingleShotOptions {
    /** URL or route to navigate to (resolved against --baseUrl when relative). */
    url?: string;
    /** Inline HTML document to load instead of a URL. */
    html?: string;
    /** Path to an HTML file to load instead of a URL. */
    htmlFile?: string;
    /** Output file name/path (.png/.jpeg/.webp for shot, .webm for record). */
    output?: string;
    /** Output directory override. */
    outputDir?: string;
    /** CSS selector of the element to capture (shot only). */
    selector?: string;
    /** Capture the full scrollable page (shot only). */
    fullPage?: boolean;
    /** CSS selector to wait for before capturing/recording. */
    waitFor?: string;
    /** Extra delay in milliseconds after page load. */
    delay?: number;
    /** Viewport as WIDTHxHEIGHT (e.g. 1280x720). Default 1200x630. */
    viewport?: string;
    /** Crisp 2x Retina output (shot only). */
    retina?: boolean;
    /** Emulate dark color scheme. */
    dark?: boolean;
    /** JSON file with a steps array or { "steps": [...] } (record only). */
    stepsFile?: string;
}
/**
 * Options for the lightweight `captureHtml()` helper used by integrators.
 */
export interface CaptureHtmlOptions {
    /** Output file path (absolute or relative to cwd). */
    output: string;
    /** Viewport width. Default 1200. */
    width?: number;
    /** Viewport height. Default 630. */
    height?: number;
    /** Device scale factor / retina multiplier. Default 1. */
    scale?: number;
    /** CSS selector to clip. */
    selector?: string;
    /** Image format. Inferred from output path when omitted. */
    type?: ScreenshotFormat;
    /** JPEG/WebP quality 0–100. */
    quality?: number;
    /** Transparent background for PNG. */
    omitBackground?: boolean;
    /** Working directory for relative output paths. */
    cwd?: string;
    /** Browser engine. Default chromium. */
    browser?: BrowserName;
}
//# sourceMappingURL=index.d.ts.map