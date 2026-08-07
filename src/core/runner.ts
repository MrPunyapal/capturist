import * as path from "node:path";
import type { Browser } from "playwright-core";
import type {
  CapturistConfig,
  PageConfig,
  ScreenshotResult,
  RunSummary,
} from "../types/index.js";
import { launchBrowser, createBrowserContext } from "./browser.js";
import { capturePageScreenshot } from "./capture.js";
import { startStaticServer, RunningServer } from "../server/static-server.js";
import { resolveOutputPath, ensureDirectory } from "../utils/paths.js";
import { logger } from "../utils/logger.js";

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
 * Primary programmatic orchestrator: generates all screenshots according to configuration.
 */
export async function generateScreenshots(
  config: CapturistConfig,
  options: { cwd?: string; onProgress?: (result: ScreenshotResult) => void } = {}
): Promise<RunSummary> {
  const cwd = options.cwd || process.cwd();
  const startTime = Date.now();

  let server: RunningServer | null = null;
  let activeBaseUrl = config.baseUrl;

  // If static server is specified and no baseUrl is given, start the server
  if (config.server && !activeBaseUrl) {
    if (config.server.buildCommand) {
      const { execSync } = await import("node:child_process");
      logger.info(`Running build command: ${config.server.buildCommand}`);
      execSync(config.server.buildCommand, { stdio: "inherit", cwd });
    }
    server = await startStaticServer(config.server, cwd);
    activeBaseUrl = server.url;
  }

  if (!activeBaseUrl && config.pages.some((p: PageConfig) => !(p.route || p.url || "").startsWith("http"))) {
    throw new Error(
      'A "baseUrl" or "server" configuration is required when capturing relative routes (e.g. "/").'
    );
  }

  const effectiveConfig: CapturistConfig = {
    ...config,
    baseUrl: activeBaseUrl,
  };

  const baseOutputDir = path.resolve(cwd, effectiveConfig.outputDir || "public");
  await ensureDirectory(baseOutputDir);

  let browser: Browser | null = null;
  const results: ScreenshotResult[] = [];

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

      const context = await createBrowserContext(
        browser!,
        viewport,
        colorScheme,
        effectiveConfig
      );

      try {
        const result = await capturePageScreenshot(
          context,
          pageConfig,
          effectiveConfig,
          targetFilePath
        );

        logger.logCapture(result);
        if (options.onProgress) {
          options.onProgress(result);
        }
        return result;
      } finally {
        await context.close().catch(() => {});
      }
    };

    const taskResults = await asyncPool(concurrency, effectiveConfig.pages, captureTask);
    results.push(...taskResults);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    if (server) {
      await server.close().catch(() => {});
    }
  }

  const totalDurationMs = Date.now() - startTime;
  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  const summary: RunSummary = {
    results,
    total: results.length,
    succeeded,
    failed,
    totalDurationMs,
    outputDir: baseOutputDir,
  };

  logger.summary(summary);
  return summary;
}
