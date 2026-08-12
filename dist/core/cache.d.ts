import type { CapturistConfig, PageConfig } from "../types/index.js";
import { isHtmlPage } from "../config/validate.js";
export declare const CACHE_MANIFEST_VERSION = 1;
export declare const DEFAULT_CACHE_FILENAME = ".capturist-cache.json";
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
export declare function resolveCacheConfig(config: CapturistConfig, cwd: string, overrides?: {
    force?: boolean;
    cache?: boolean;
}): CacheConfigResolved;
export declare function readCacheManifest(manifestPath: string): CacheManifest;
export declare function writeCacheManifest(manifestPath: string, entries: Record<string, CacheManifestEntry>): void;
/**
 * Stable key for a page in the manifest (output path, POSIX-style).
 */
export declare function pageCacheKey(page: PageConfig): string;
/**
 * Map a site route to a static file under a server directory.
 * `/` → index.html, `/projects` → projects.html, `/tips/foo` → tips/foo.html
 */
export declare function routeToStaticFile(serverDir: string, route: string): string | null;
/**
 * Resolve the primary content used for fingerprinting a page.
 * Returns null when content cannot be determined (e.g. live remote URL) —
 * those pages are always treated as dirty.
 */
export declare function resolvePageContent(page: PageConfig, config: CapturistConfig, cwd: string): {
    kind: string;
    content: string;
} | null;
export declare function fingerprintPage(page: PageConfig, config: CapturistConfig, cwd: string): string | null;
export declare function sha256(value: string): string;
/**
 * Decide which pages need capture vs can be skipped.
 */
export declare function partitionCachedPages(config: CapturistConfig, cwd: string, cache: CacheConfigResolved, baseOutputDir: string): CachePartition;
/**
 * Build the next manifest from successful captures + still-valid cache hits.
 */
export declare function buildNextManifestEntries(partition: CachePartition, successfulKeys: Set<string>): Record<string, CacheManifestEntry>;
/**
 * Remove manifest entries (and optionally PNG files) for outputs no longer in config.
 */
export declare function pruneStaleCacheEntries(manifest: CacheManifest, currentKeys: Set<string>, cwd: string, baseOutputDir: string, deleteFiles: boolean): string[];
export declare function makeCachedResult(page: PageConfig, outputAbsolute: string, baseOutputDir: string): import("../types/index.js").ScreenshotResult;
export { isHtmlPage };
//# sourceMappingURL=cache.d.ts.map