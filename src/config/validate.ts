import * as os from "node:os";
import type {
  CapturistConfig,
  PageConfig,
  Viewport,
  ScreenshotFormat,
  ColorScheme,
} from "../types/index.js";

export const DEFAULT_VIEWPORT: Viewport = {
  width: 1200,
  height: 630,
  deviceScaleFactor: 1,
};

export const DEFAULT_OUTPUT_DIR = "public";
export const DEFAULT_TIMEOUT = 30000;

/**
 * Infers image format type from output filename extension if not explicitly set.
 */
export function inferFormatFromPath(outputPath: string): ScreenshotFormat {
  const lower = outputPath.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
    return "jpeg";
  }
  if (lower.endsWith(".webp")) {
    return "webp";
  }
  return "png";
}

/**
 * Resolves the device scale factor considering scale and retina presets.
 */
export function resolveScaleFactor(
  viewport?: Viewport,
  scale?: number,
  retina?: boolean
): number {
  if (typeof scale === "number" && scale > 0) {
    return scale;
  }
  if (retina === true) {
    return 2;
  }
  if (viewport?.deviceScaleFactor && viewport.deviceScaleFactor > 0) {
    return viewport.deviceScaleFactor;
  }
  return 1;
}

/**
 * Validates and normalizes a single page configuration.
 */
export function validatePageConfig(
  page: unknown,
  index: number,
  globalConfig: CapturistConfig
): PageConfig {
  if (!page || typeof page !== "object") {
    throw new Error(`Invalid page at index ${index}: must be an object.`);
  }

  const p = page as Record<string, unknown>;
  const route = (typeof p.route === "string" ? p.route : typeof p.url === "string" ? p.url : "").trim();
  const output = typeof p.output === "string" ? p.output.trim() : "";

  if (!route) {
    throw new Error(
      `Invalid page at index ${index}: missing required "route" or "url" property.`
    );
  }

  if (!output) {
    throw new Error(
      `Invalid page at index ${index} (route: "${route}"): missing required "output" filename.`
    );
  }

  const baseViewport = p.viewport
    ? validateViewport(p.viewport, `page[${index}].viewport`)
    : globalConfig.viewport || DEFAULT_VIEWPORT;

  const pageScale = typeof p.scale === "number" ? p.scale : undefined;
  const pageRetina = typeof p.retina === "boolean" ? p.retina : undefined;

  let resolvedScaleFactor: number;
  if (pageScale !== undefined || pageRetina !== undefined) {
    resolvedScaleFactor = resolveScaleFactor(baseViewport, pageScale, pageRetina);
  } else {
    resolvedScaleFactor = resolveScaleFactor(baseViewport, globalConfig.scale, globalConfig.retina);
  }

  const viewport: Viewport = {
    ...baseViewport,
    deviceScaleFactor: resolvedScaleFactor,
  };

  const colorScheme = (p.colorScheme as ColorScheme) || globalConfig.colorScheme || "light";
  if (!["light", "dark", "no-preference"].includes(colorScheme)) {
    throw new Error(
      `Invalid colorScheme "${colorScheme}" in page[${index}]. Must be "light", "dark", or "no-preference".`
    );
  }

  const format = (p.type as ScreenshotFormat) || inferFormatFromPath(output);
  if (!["png", "jpeg", "webp"].includes(format)) {
    throw new Error(
      `Invalid type "${format}" in page[${index}]. Must be "png", "jpeg", or "webp".`
    );
  }

  return {
    route,
    url: route,
    output,
    outputDir: typeof p.outputDir === "string" ? p.outputDir : globalConfig.outputDir,
    viewport,
    scale: pageScale ?? globalConfig.scale,
    retina: pageRetina ?? globalConfig.retina,
    selector: typeof p.selector === "string" ? p.selector : undefined,
    fullPage: typeof p.fullPage === "boolean" ? p.fullPage : false,
    colorScheme,
    delay: typeof p.delay === "number" ? Math.max(0, p.delay) : globalConfig.defaultDelay || 0,
    waitFor: typeof p.waitFor === "string" || typeof p.waitFor === "number" ? p.waitFor : globalConfig.defaultWaitFor,
    disableAnimations:
      typeof p.disableAnimations === "boolean"
        ? p.disableAnimations
        : globalConfig.disableAnimations !== false,
    omitBackground: typeof p.omitBackground === "boolean" ? p.omitBackground : false,
    type: format,
    quality: typeof p.quality === "number" ? Math.min(100, Math.max(0, p.quality)) : undefined,
    beforeScreenshot: typeof p.beforeScreenshot === "function" ? (p.beforeScreenshot as any) : undefined,
    metadata: typeof p.metadata === "object" && p.metadata !== null ? (p.metadata as Record<string, unknown>) : undefined,
  };
}

/**
 * Validates a viewport object.
 */
export function validateViewport(viewport: unknown, label = "viewport"): Viewport {
  if (!viewport || typeof viewport !== "object") {
    throw new Error(`Invalid ${label}: must be an object with width and height numbers.`);
  }
  const v = viewport as Record<string, unknown>;
  const width = Number(v.width);
  const height = Number(v.height);
  const deviceScaleFactor = v.deviceScaleFactor !== undefined ? Number(v.deviceScaleFactor) : 1;

  if (isNaN(width) || width <= 0) {
    throw new Error(`Invalid ${label}.width: must be a positive number, received ${v.width}.`);
  }
  if (isNaN(height) || height <= 0) {
    throw new Error(`Invalid ${label}.height: must be a positive number, received ${v.height}.`);
  }
  if (isNaN(deviceScaleFactor) || deviceScaleFactor <= 0) {
    throw new Error(
      `Invalid ${label}.deviceScaleFactor: must be a positive number, received ${v.deviceScaleFactor}.`
    );
  }

  return { width, height, deviceScaleFactor };
}

/**
 * Validates and applies defaults to a full `CapturistConfig`.
 */
export function validateConfig(config: unknown): CapturistConfig {
  if (!config || typeof config !== "object") {
    throw new Error(
      "Invalid configuration: capturist expects a configuration object or function returning an object."
    );
  }

  const raw = config as Record<string, unknown>;

  if (!raw.pages || !Array.isArray(raw.pages)) {
    throw new Error(
      'Invalid configuration: missing "pages" array. Please provide at least one page target.'
    );
  }

  if (raw.pages.length === 0) {
    throw new Error('Invalid configuration: "pages" array is empty.');
  }

  const outputDir = typeof raw.outputDir === "string" && raw.outputDir.trim()
    ? raw.outputDir.trim()
    : DEFAULT_OUTPUT_DIR;

  const rawScale = typeof raw.scale === "number" ? raw.scale : undefined;
  const rawRetina = typeof raw.retina === "boolean" ? raw.retina : undefined;

  let viewport = raw.viewport ? validateViewport(raw.viewport, "config.viewport") : DEFAULT_VIEWPORT;
  const globalScaleFactor = resolveScaleFactor(viewport, rawScale, rawRetina);

  viewport = {
    ...viewport,
    deviceScaleFactor: globalScaleFactor,
  };

  const browser = (raw.browser as string) || "chromium";
  if (!["chromium", "firefox", "webkit"].includes(browser)) {
    throw new Error(
      `Invalid browser "${browser}". Must be "chromium", "firefox", or "webkit".`
    );
  }

  const colorScheme = (raw.colorScheme as ColorScheme) || "light";
  if (!["light", "dark", "no-preference"].includes(colorScheme)) {
    throw new Error(
      `Invalid colorScheme "${colorScheme}". Must be "light", "dark", or "no-preference".`
    );
  }

  const defaultCpuCount = typeof os.cpus === "function" ? os.cpus().length : 4;
  const concurrency = typeof raw.concurrency === "number" && raw.concurrency > 0
    ? Math.floor(raw.concurrency)
    : Math.min(4, Math.max(1, defaultCpuCount));

  const timeout = typeof raw.timeout === "number" && raw.timeout > 0 ? raw.timeout : DEFAULT_TIMEOUT;

  const normalizedConfig: CapturistConfig = {
    baseUrl: typeof raw.baseUrl === "string" ? raw.baseUrl.trim() : undefined,
    outputDir,
    viewport,
    scale: rawScale,
    retina: rawRetina,
    browser: browser as any,
    colorScheme,
    concurrency,
    disableAnimations: raw.disableAnimations !== false,
    defaultDelay: typeof raw.defaultDelay === "number" ? Math.max(0, raw.defaultDelay) : 0,
    defaultWaitFor: typeof raw.defaultWaitFor === "string" ? raw.defaultWaitFor : undefined,
    timeout,
    launchOptions: typeof raw.launchOptions === "object" && raw.launchOptions !== null ? (raw.launchOptions as any) : undefined,
    server: typeof raw.server === "object" && raw.server !== null ? (raw.server as any) : undefined,
    beforeScreenshot: typeof raw.beforeScreenshot === "function" ? (raw.beforeScreenshot as any) : undefined,
    headers: typeof raw.headers === "object" && raw.headers !== null ? (raw.headers as Record<string, string>) : undefined,
    userAgent: typeof raw.userAgent === "string" ? raw.userAgent : undefined,
    pages: [],
  };

  normalizedConfig.pages = raw.pages.map((p, idx) =>
    validatePageConfig(p, idx, normalizedConfig)
  );

  return normalizedConfig;
}
