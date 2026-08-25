import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type { Browser, BrowserContext } from "playwright-core";
import type {
  CapturistConfig,
  PageConfig,
  ScreenshotResult,
  RunSummary,
  CaptureHtmlOptions,
} from "../types/index.js";
import { launchBrowser, createBrowserContext } from "./browser.js";
import { capturePageScreenshot, capturePageVideo } from "./capture.js";
import { executeSteps } from "./steps.js";
import { startStaticServer, RunningServer } from "../server/static-server.js";
import { isHtmlPage, validateConfig } from "../config/validate.js";
import { resolveOutputPath, ensureDirectory } from "../utils/paths.js";
import { logger } from "../utils/logger.js";
import {
  resolveCacheConfig,
  partitionCachedPages,
  writeCacheManifest,
  buildNextManifestEntries,
  pruneStaleCacheEntries,
  readCacheManifest,
  makeCachedResult,
} from "./cache.js";

/**
 * Concurrency worker pool executor.
 */
async function asyncPool<T, R>(
  poolLimit: number,
  items: T[],
  iteratorFn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const ret: Promise<R>[] = [];
  const executing = new Set<Promise<R>>();

  for (let i = 0; i < items.length; i++) {
    const p = Promise.resolve().then(() => iteratorFn(items[i], i));
    ret.push(p);
    executing.add(p);

    const clean = () => executing.delete(p);
    p.then(clean, clean);

    if (executing.size >= poolLimit) {
      await Promise.race(executing);
    }
  }

  return Promise.all(ret);
}

/**
 * True when at least one page needs HTTP navigation (and thus baseUrl/server).
 */
export function needsNetworkNavigation(pages: PageConfig[]): boolean {
  return pages.some((p) => !isHtmlPage(p));
}

/**
 * Runs a page's `before` steps (authentication, feature setup) in a separate
 * context that is never recorded, then returns its storage state so the real
 * capture context starts already logged in.
 */
async function runSetupSteps(
  browser: Browser,
  pageConfig: PageConfig,
  config: CapturistConfig,
  viewport: { width: number; height: number; deviceScaleFactor?: number },
  colorScheme: "light" | "dark" | "no-preference"
): Promise<Awaited<ReturnType<BrowserContext["storageState"]>> | undefined> {
  if (!pageConfig.before || pageConfig.before.length === 0) {
    return undefined;
  }

  const context = await createBrowserContext(browser, viewport, colorScheme, config);

  try {
    const page = await context.newPage();
    await executeSteps(page, pageConfig.before, { baseUrl: config.baseUrl });
    return await context.storageState();
  } catch (err) {
    throw new Error(`before setup failed: ${(err as Error)?.message || err}`);
  } finally {
    await context.close().catch(() => {});
  }
}

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
export async function generateScreenshots(
  config: CapturistConfig,
  options: GenerateScreenshotsOptions = {}
): Promise<RunSummary> {
  const cwd = options.cwd || process.cwd();
  const startTime = Date.now();
  const quiet = options.quiet === true;

  const baseOutputDir = path.resolve(cwd, config.outputDir || "public");
  await ensureDirectory(baseOutputDir);

  // Run buildCommand before fingerprinting so route → dist HTML is current.
  const requiresNetwork = needsNetworkNavigation(config.pages);
  if (requiresNetwork && config.server?.buildCommand) {
    const { execSync } = await import("node:child_process");
    if (!quiet) logger.info(`Running build command: ${config.server.buildCommand}`);
    execSync(config.server.buildCommand, { stdio: quiet ? "ignore" : "inherit", cwd });
  }

  const cache = resolveCacheConfig(config, cwd, {
    force: options.force,
    cache: options.cache,
  });

  let pagesToCapture = config.pages;
  let partition: ReturnType<typeof partitionCachedPages> | null = null;
  const cachedResults: ScreenshotResult[] = [];

  if (cache.enabled) {
    partition = partitionCachedPages(config, cwd, cache, baseOutputDir);

    if (partition.adopted.length > 0 && !quiet) {
      logger.info(
        `Adopted ${partition.adopted.length} existing image(s) into cache (no recapture)`
      );
    }

    const pureHits = partition.cached.filter((d) => !d.adopted).length;
    if (pureHits > 0 && !quiet) {
      // Avoid spamming hundreds of lines; detail only in verbose mode.
      if (logger.verbose) {
        for (const decision of partition.cached) {
          if (decision.adopted) continue;
          const result = makeCachedResult(decision.page, decision.outputAbsolute, baseOutputDir);
          logger.info(`cache hit  ${result.route} → ${result.outputPath}`);
        }
      } else {
        logger.info(`${pureHits} page(s) unchanged (cache hit)`);
      }
    }

    for (const decision of partition.cached) {
      const result = makeCachedResult(decision.page, decision.outputAbsolute, baseOutputDir);
      cachedResults.push(result);
      if (options.onProgress) {
        options.onProgress(result);
      }
    }

    pagesToCapture = partition.dirty.map((d) => d.page);

    if (pagesToCapture.length === 0) {
      const prune =
        typeof config.cache === "object" && config.cache !== null
          ? config.cache.prune === true
          : false;
      if (prune && partition) {
        const removed = pruneStaleCacheEntries(
          readCacheManifest(cache.path),
          new Set(partition.all.map((d) => d.key)),
          cwd,
          baseOutputDir,
          true
        );
        if (removed.length > 0 && !quiet) {
          logger.info(`Pruned ${removed.length} stale output(s)`);
        }
      }

      writeCacheManifest(
        cache.path,
        buildNextManifestEntries(partition, new Set())
      );

      const summary: RunSummary = {
        results: cachedResults,
        total: cachedResults.length,
        succeeded: cachedResults.length,
        failed: 0,
        cached: cachedResults.length,
        captured: 0,
        totalDurationMs: Date.now() - startTime,
        outputDir: baseOutputDir,
      };

      if (!quiet) {
        logger.success(
          `Open Graph / screenshots up to date (${summary.cached} cached, 0 captured)`
        );
        logger.summary(summary);
      }

      return summary;
    }

    if (!quiet) {
      logger.info(
        `Capturing ${pagesToCapture.length}/${config.pages.length} page(s)` +
          (partition.cached.length > 0 ? ` (${partition.cached.length} cached)` : "")
      );
    }
  }

  let server: RunningServer | null = null;
  let activeBaseUrl = config.baseUrl;
  const captureRequiresNetwork = needsNetworkNavigation(pagesToCapture);

  // Start server only for dirty route pages; build already ran above.
  if (captureRequiresNetwork && config.server && !activeBaseUrl) {
    server = await startStaticServer(
      {
        ...config.server,
        buildCommand: undefined,
      },
      cwd
    );
    activeBaseUrl = server.url;
  }

  if (
    captureRequiresNetwork &&
    !activeBaseUrl &&
    pagesToCapture.some((p: PageConfig) => {
      if (isHtmlPage(p)) return false;
      const route = p.route || p.url || "";
      return !route.startsWith("http");
    })
  ) {
    throw new Error(
      'A "baseUrl" or "server" configuration is required when capturing relative routes (e.g. "/"). ' +
        'HTML-only pages using "html" or "htmlFile" do not need a server.'
    );
  }

  const effectiveConfig: CapturistConfig = {
    ...config,
    baseUrl: activeBaseUrl,
    pages: pagesToCapture,
  };

  let browser: Browser | null = null;
  const captureResults: ScreenshotResult[] = [];

  try {
    browser = await launchBrowser(effectiveConfig);
    const concurrency = effectiveConfig.concurrency || 4;

    const captureTask = async (pageConfig: PageConfig): Promise<ScreenshotResult> => {
      const pageOutputDir = pageConfig.outputDir
        ? path.resolve(cwd, pageConfig.outputDir)
        : baseOutputDir;

      const targetFilePath = resolveOutputPath(pageOutputDir, pageConfig.output);
      const viewport = pageConfig.viewport || effectiveConfig.viewport || { width: 1200, height: 630 };
      const colorScheme = pageConfig.colorScheme || effectiveConfig.colorScheme || "light";

      // Setup steps (login etc.) run off-camera in their own context; the
      // resulting storage state carries into the capture context so the video
      // or screenshot starts already inside the app.
      const storageState = await runSetupSteps(browser!, pageConfig, effectiveConfig, viewport, colorScheme);

      // Video pages record into a throwaway directory; the finished file is
      // saved into place by capturePageVideo and the temp dir removed after.
      if (pageConfig.video) {
        const tmpVideoDir = await fs.mkdtemp(path.join(os.tmpdir(), "capturist-video-"));
        const context = await createBrowserContext(browser!, viewport, colorScheme, effectiveConfig, {
          recordVideoDir: tmpVideoDir,
          storageState,
        });

        try {
          const result = await capturePageVideo(
            context,
            pageConfig,
            effectiveConfig,
            targetFilePath,
            { cwd }
          );

          if (!quiet) logger.logCapture(result);
          if (options.onProgress) {
            options.onProgress(result);
          }
          return result;
        } finally {
          await context.close().catch(() => {});
          await fs.rm(tmpVideoDir, { recursive: true, force: true }).catch(() => {});
        }
      }

      const context = await createBrowserContext(
        browser!,
        viewport,
        colorScheme,
        effectiveConfig,
        { storageState }
      );

      try {
        const result = await capturePageScreenshot(
          context,
          pageConfig,
          effectiveConfig,
          targetFilePath,
          { cwd }
        );

        if (!quiet) logger.logCapture(result);
        if (options.onProgress) {
          options.onProgress(result);
        }
        return result;
      } finally {
        await context.close().catch(() => {});
      }
    };

    const taskResults = await asyncPool(concurrency, pagesToCapture, captureTask);
    captureResults.push(...taskResults);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    if (server) {
      await server.close().catch(() => {});
    }
  }

  if (cache.enabled && partition) {
    const successfulKeys = new Set<string>();
    for (const result of captureResults) {
      if (!result.success) continue;
      const abs = path.normalize(result.absolutePath);
      const decision = partition.dirty.find(
        (d) =>
          path.normalize(d.outputAbsolute) === abs ||
          d.key === result.outputPath.replace(/\\/g, "/") ||
          d.page.output.replace(/\\/g, "/") === result.outputPath.replace(/\\/g, "/")
      );
      if (decision) {
        successfulKeys.add(decision.key);
      }
    }

    const prune =
      typeof config.cache === "object" && config.cache !== null
        ? config.cache.prune === true
        : false;
    if (prune) {
      const removed = pruneStaleCacheEntries(
        readCacheManifest(cache.path),
        new Set(partition.all.map((d) => d.key)),
        cwd,
        baseOutputDir,
        true
      );
      if (removed.length > 0 && !quiet) {
        logger.info(`Pruned ${removed.length} stale output(s)`);
      }
    }

    writeCacheManifest(cache.path, buildNextManifestEntries(partition, successfulKeys));
  }

  const results = [...cachedResults, ...captureResults];
  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const cachedCount = results.filter((r) => r.cached).length;
  const capturedCount = results.filter((r) => !r.cached).length;

  const summary: RunSummary = {
    results,
    total: results.length,
    succeeded,
    failed,
    cached: cachedCount,
    captured: capturedCount,
    totalDurationMs: Date.now() - startTime,
    outputDir: baseOutputDir,
  };

  if (!quiet) logger.summary(summary);
  return summary;
}

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
export async function captureHtml(
  html: string,
  options: CaptureHtmlOptions
): Promise<ScreenshotResult> {
  if (!html || !html.trim()) {
    throw new Error('captureHtml() requires a non-empty "html" string.');
  }
  if (!options?.output) {
    throw new Error('captureHtml() requires an "output" path.');
  }

  const cwd = options.cwd || process.cwd();
  const width = options.width ?? 1200;
  const height = options.height ?? 630;
  const scale = options.scale ?? 1;

  const rawConfig = {
    outputDir: path.dirname(options.output) || ".",
    browser: options.browser || "chromium",
    concurrency: 1,
    // One-shot helper always captures; callers that want cache use generateScreenshots.
    cache: false as const,
    pages: [
      {
        html,
        output: path.basename(options.output),
        viewport: {
          width,
          height,
          deviceScaleFactor: scale,
        },
        scale,
        selector: options.selector,
        type: options.type,
        quality: options.quality,
        omitBackground: options.omitBackground,
      },
    ],
  };

  const resolvedOutput = path.isAbsolute(options.output)
    ? options.output
    : path.resolve(cwd, options.output);

  const config = validateConfig({
    ...rawConfig,
    outputDir: path.dirname(resolvedOutput),
    pages: [
      {
        ...rawConfig.pages[0],
        output: path.basename(resolvedOutput),
      },
    ],
  });

  const summary = await generateScreenshots(config, { cwd, quiet: true, cache: false });
  const result = summary.results[0];
  if (!result) {
    throw new Error("captureHtml() produced no result.");
  }
  if (!result.success) {
    throw result.error || new Error("captureHtml() failed to capture image.");
  }
  return result;
}
