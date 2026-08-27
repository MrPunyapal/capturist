import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import type { CapturistConfig, PageConfig, Viewport } from "../types/index.js";
import { isHtmlPage, resolvePageLabel } from "../config/validate.js";
import { fileExistsSync, isHttpUrl } from "../utils/paths.js";

export const CACHE_MANIFEST_VERSION = 1;
export const DEFAULT_CACHE_FILENAME = ".capturist-cache.json";

export interface CacheConfigResolved {
  enabled: boolean;
  /** Absolute path to the manifest file. */
  path: string;
  /**
   * When a PNG exists but has no manifest entry, record the current fingerprint
   * and skip capture (migration-friendly). Default true.
   */
  adopt: boolean;
}

export interface CacheManifestEntry {
  hash: string;
  output: string;
  label?: string;
}

export interface CacheManifest {
  version: number;
  entries: Record<string, CacheManifestEntry>;
}

export interface PageCacheDecision {
  page: PageConfig;
  key: string;
  hash: string;
  outputAbsolute: string;
  /** true when capture can be skipped */
  cached: boolean;
  /** true when PNG was kept and hash newly recorded without capture */
  adopted: boolean;
}

export interface CachePartition {
  dirty: PageCacheDecision[];
  cached: PageCacheDecision[];
  adopted: PageCacheDecision[];
  /** Fingerprints for every configured page (for writing the next manifest). */
  all: PageCacheDecision[];
}

/**
 * Normalize `cache` config into a resolved object.
 */
export function resolveCacheConfig(
  config: CapturistConfig,
  cwd: string,
  overrides: { force?: boolean; cache?: boolean } = {}
): CacheConfigResolved {
  if (overrides.force === true || overrides.cache === false) {
    return {
      enabled: false,
      path: "",
      adopt: true,
    };
  }

  const raw = config.cache;
  if (raw === false || raw === undefined) {
    // Explicit CLI --cache can enable defaults even without config.cache
    if (overrides.cache === true) {
      return {
        enabled: true,
        path: path.resolve(cwd, config.outputDir || "public", DEFAULT_CACHE_FILENAME),
        adopt: true,
      };
    }
    return { enabled: false, path: "", adopt: true };
  }

  if (raw === true) {
    return {
      enabled: true,
      path: path.resolve(cwd, config.outputDir || "public", DEFAULT_CACHE_FILENAME),
      adopt: true,
    };
  }

  const enabled = raw.enabled !== false;
  const relative =
    typeof raw.path === "string" && raw.path.trim()
      ? raw.path.trim()
      : path.join(config.outputDir || "public", DEFAULT_CACHE_FILENAME);

  return {
    enabled,
    path: path.isAbsolute(relative) ? relative : path.resolve(cwd, relative),
    adopt: raw.adopt !== false,
  };
}

export function readCacheManifest(manifestPath: string): CacheManifest {
  if (!manifestPath || !fileExistsSync(manifestPath)) {
    return { version: CACHE_MANIFEST_VERSION, entries: {} };
  }

  try {
    const decoded = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Partial<CacheManifest>;
    if (!decoded || typeof decoded !== "object" || !decoded.entries || typeof decoded.entries !== "object") {
      return { version: CACHE_MANIFEST_VERSION, entries: {} };
    }

    const entries: Record<string, CacheManifestEntry> = {};
    for (const [key, entry] of Object.entries(decoded.entries)) {
      if (!entry || typeof entry !== "object") continue;
      const hash = typeof entry.hash === "string" ? entry.hash : "";
      const output = typeof entry.output === "string" ? entry.output : key;
      if (!hash) continue;
      entries[key] = {
        hash,
        output,
        label: typeof entry.label === "string" ? entry.label : undefined,
      };
    }

    return { version: CACHE_MANIFEST_VERSION, entries };
  } catch {
    return { version: CACHE_MANIFEST_VERSION, entries: {} };
  }
}

export function writeCacheManifest(manifestPath: string, entries: Record<string, CacheManifestEntry>): void {
  const dir = path.dirname(manifestPath);
  fs.mkdirSync(dir, { recursive: true });

  const sortedKeys = Object.keys(entries).sort();
  const sorted: Record<string, CacheManifestEntry> = {};
  for (const key of sortedKeys) {
    sorted[key] = entries[key];
  }

  const payload: CacheManifest = {
    version: CACHE_MANIFEST_VERSION,
    entries: sorted,
  };

  fs.writeFileSync(manifestPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

/**
 * Stable key for a page in the manifest (output path, POSIX-style).
 */
export function pageCacheKey(page: PageConfig): string {
  return page.output.replace(/\\/g, "/");
}

/**
 * Map a site route to a static file under a server directory.
 * `/` → index.html, `/projects` → projects.html, `/tips/foo` → tips/foo.html
 */
export function routeToStaticFile(serverDir: string, route: string): string | null {
  if (!route || isHttpUrl(route)) {
    return null;
  }

  let normalized = route.split("?")[0].split("#")[0];
  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }
  if (normalized === "/") {
    return path.join(serverDir, "index.html");
  }

  const trimmed = normalized.replace(/\/$/, "");
  const asHtml = path.join(serverDir, `${trimmed.slice(1)}.html`);
  if (fileExistsSync(asHtml)) {
    return asHtml;
  }

  const asIndex = path.join(serverDir, trimmed.slice(1), "index.html");
  if (fileExistsSync(asIndex)) {
    return asIndex;
  }

  // bare path without extension (e.g. dist/projects)
  const bare = path.join(serverDir, trimmed.slice(1));
  if (fileExistsSync(bare) && fs.statSync(bare).isFile()) {
    return bare;
  }

  return null;
}

function readTextIfExists(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function hashInputs(cwd: string, inputs: string[] | undefined): Array<{ path: string; hash: string }> {
  if (!inputs || inputs.length === 0) {
    return [];
  }

  return inputs.map((input) => {
    const abs = path.isAbsolute(input) ? input : path.resolve(cwd, input);
    const body = readTextIfExists(abs);
    return {
      path: input.replace(/\\/g, "/"),
      hash: body === null ? "missing" : sha256(body),
    };
  });
}

/**
 * Resolve the primary content used for fingerprinting a page.
 * Returns null when content cannot be determined (e.g. live remote URL) —
 * those pages are always treated as dirty.
 */
export function resolvePageContent(
  page: PageConfig,
  config: CapturistConfig,
  cwd: string
): { kind: string; content: string } | null {
  if (typeof page.cacheKey === "string" && page.cacheKey.length > 0) {
    return { kind: "cacheKey", content: page.cacheKey };
  }

  if (typeof page.html === "string" && page.html.length > 0) {
    return { kind: "html", content: page.html };
  }

  if (typeof page.htmlFile === "string" && page.htmlFile.trim()) {
    const abs = path.isAbsolute(page.htmlFile)
      ? page.htmlFile
      : path.resolve(cwd, page.htmlFile);
    const body = readTextIfExists(abs);
    if (body === null) {
      return null;
    }
    return { kind: "htmlFile", content: body };
  }

  // route / url — try static file under server.dir
  const route = (page.url || page.route || "").replace(/^file:/, "");
  if (!route || isHttpUrl(route)) {
    return null;
  }

  if (config.server?.dir) {
    const serverDir = path.isAbsolute(config.server.dir)
      ? config.server.dir
      : path.resolve(cwd, config.server.dir);
    const file = routeToStaticFile(serverDir, route.startsWith("/") ? route : `/${route}`);
    if (file) {
      const body = readTextIfExists(file);
      if (body !== null) {
        return { kind: "route-file", content: body };
      }
    }
  }

  return null;
}

function captureFingerprintSlice(page: PageConfig, config: CapturistConfig): Record<string, unknown> {
  const viewport: Viewport = page.viewport || config.viewport || { width: 1200, height: 630 };

  return {
    viewport: {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: viewport.deviceScaleFactor ?? 1,
    },
    scale: page.scale ?? config.scale ?? null,
    retina: page.retina ?? config.retina ?? false,
    selector: page.selector || null,
    padding: page.padding ?? null,
    fullPage: page.fullPage === true,
    colorScheme: page.colorScheme || config.colorScheme || "light",
    type: page.type || "png",
    quality: page.quality ?? null,
    omitBackground: page.omitBackground === true,
    delay: page.delay ?? config.defaultDelay ?? 0,
    waitFor: page.waitFor ?? config.defaultWaitFor ?? null,
    browser: config.browser || "chromium",
    disableAnimations: page.disableAnimations !== false && config.disableAnimations !== false,
    hasBeforeScreenshot: typeof (page.beforeScreenshot || config.beforeScreenshot) === "function",
  };
}

export function fingerprintPage(page: PageConfig, config: CapturistConfig, cwd: string): string | null {
  const source = resolvePageContent(page, config, cwd);
  if (!source) {
    return null;
  }

  const payload = {
    kind: source.kind,
    content: source.content,
    inputs: hashInputs(cwd, page.inputs),
    capture: captureFingerprintSlice(page, config),
    route: page.url || page.route || null,
    output: page.output,
    label: page.label || null,
  };

  return sha256(JSON.stringify(payload));
}

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/**
 * Decide which pages need capture vs can be skipped.
 */
export function partitionCachedPages(
  config: CapturistConfig,
  cwd: string,
  cache: CacheConfigResolved,
  baseOutputDir: string
): CachePartition {
  const manifest = readCacheManifest(cache.path);
  const dirty: PageCacheDecision[] = [];
  const cached: PageCacheDecision[] = [];
  const adopted: PageCacheDecision[] = [];
  const all: PageCacheDecision[] = [];

  for (const page of config.pages) {
    const key = pageCacheKey(page);
    const pageOutputDir = page.outputDir
      ? path.isAbsolute(page.outputDir)
        ? page.outputDir
        : path.resolve(cwd, page.outputDir)
      : baseOutputDir;
    const outputAbsolute = path.isAbsolute(page.output)
      ? page.output
      : path.resolve(pageOutputDir, page.output);

    const hash = page.cache === false ? null : fingerprintPage(page, config, cwd);
    const pngExists = fileExistsSync(outputAbsolute);
    const previousHash = manifest.entries[key]?.hash;

    const decision: PageCacheDecision = {
      page,
      key,
      hash: hash || "",
      outputAbsolute,
      cached: false,
      adopted: false,
    };

    // Uncacheable (remote URL / missing source), video capture, or page.cache === false → always dirty
    if (hash === null || page.cache === false || page.video === true) {
      decision.cached = false;
      dirty.push(decision);
      all.push(decision);
      continue;
    }

    if (!pngExists) {
      dirty.push(decision);
      all.push(decision);
      continue;
    }

    if (previousHash === undefined) {
      if (cache.adopt) {
        decision.cached = true;
        decision.adopted = true;
        adopted.push(decision);
        cached.push(decision);
      } else {
        dirty.push(decision);
      }
      all.push(decision);
      continue;
    }

    if (previousHash === hash) {
      decision.cached = true;
      cached.push(decision);
      all.push(decision);
      continue;
    }

    dirty.push(decision);
    all.push(decision);
  }

  return { dirty, cached, adopted, all };
}

/**
 * Build the next manifest from successful captures + still-valid cache hits.
 */
export function buildNextManifestEntries(
  partition: CachePartition,
  successfulKeys: Set<string>
): Record<string, CacheManifestEntry> {
  const entries: Record<string, CacheManifestEntry> = {};

  for (const decision of partition.all) {
    if (!decision.hash) {
      continue;
    }

    const wasDirty = partition.dirty.some((d) => d.key === decision.key);
    if (wasDirty && !successfulKeys.has(decision.key)) {
      continue;
    }

    if (!wasDirty || successfulKeys.has(decision.key)) {
      // Only keep if output file exists
      if (!fileExistsSync(decision.outputAbsolute)) {
        continue;
      }
      entries[decision.key] = {
        hash: decision.hash,
        output: decision.page.output.replace(/\\/g, "/"),
        label: resolvePageLabel(decision.page),
      };
    }
  }

  return entries;
}

/**
 * Remove manifest entries (and optionally PNG files) for outputs no longer in config.
 */
export function pruneStaleCacheEntries(
  manifest: CacheManifest,
  currentKeys: Set<string>,
  cwd: string,
  baseOutputDir: string,
  deleteFiles: boolean
): string[] {
  const removed: string[] = [];

  for (const [key, entry] of Object.entries(manifest.entries)) {
    if (currentKeys.has(key)) {
      continue;
    }

    if (deleteFiles && entry.output) {
      const abs = path.isAbsolute(entry.output)
        ? entry.output
        : path.resolve(baseOutputDir, entry.output);
      if (fileExistsSync(abs)) {
        try {
          fs.unlinkSync(abs);
          removed.push(entry.output);
        } catch {
          // ignore delete failures
        }
      }
    }
  }

  return removed;
}

export function makeCachedResult(
  page: PageConfig,
  outputAbsolute: string,
  baseOutputDir: string
): import("../types/index.js").ScreenshotResult {
  let sizeBytes = 0;
  try {
    sizeBytes = fs.statSync(outputAbsolute).size;
  } catch {
    sizeBytes = 0;
  }

  const viewport = page.viewport || { width: 1200, height: 630 };
  const relative = path.relative(baseOutputDir, outputAbsolute) || page.output;

  return {
    route: resolvePageLabel(page),
    outputPath: relative.replace(/\\/g, "/"),
    absolutePath: outputAbsolute,
    sizeBytes,
    width: viewport.width || 1200,
    height: viewport.height || 630,
    durationMs: 0,
    success: true,
    cached: true,
  };
}

// Re-export for tests that need html detection alongside cache
export { isHtmlPage };
