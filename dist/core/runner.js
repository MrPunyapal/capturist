import * as path from "node:path";
import { launchBrowser, createBrowserContext } from "./browser.js";
import { capturePageScreenshot } from "./capture.js";
import { startStaticServer } from "../server/static-server.js";
import { isHtmlPage, validateConfig } from "../config/validate.js";
import { resolveOutputPath, ensureDirectory } from "../utils/paths.js";
import { logger } from "../utils/logger.js";
/**
 * Concurrency worker pool executor.
 */
async function asyncPool(poolLimit, items, iteratorFn) {
    const ret = [];
    const executing = new Set();
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
export function needsNetworkNavigation(pages) {
    return pages.some((p) => !isHtmlPage(p));
}
/**
 * Primary programmatic orchestrator: generates all screenshots according to configuration.
 */
export async function generateScreenshots(config, options = {}) {
    const cwd = options.cwd || process.cwd();
    const startTime = Date.now();
    const quiet = options.quiet === true;
    let server = null;
    let activeBaseUrl = config.baseUrl;
    const requiresNetwork = needsNetworkNavigation(config.pages);
    // If static server is specified and no baseUrl is given, start the server
    // (only when at least one page navigates by route/url)
    if (requiresNetwork && config.server && !activeBaseUrl) {
        if (config.server.buildCommand) {
            const { execSync } = await import("node:child_process");
            if (!quiet)
                logger.info(`Running build command: ${config.server.buildCommand}`);
            execSync(config.server.buildCommand, { stdio: quiet ? "ignore" : "inherit", cwd });
        }
        server = await startStaticServer(config.server, cwd);
        activeBaseUrl = server.url;
    }
    if (requiresNetwork &&
        !activeBaseUrl &&
        config.pages.some((p) => {
            if (isHtmlPage(p))
                return false;
            const route = p.route || p.url || "";
            return !route.startsWith("http");
        })) {
        throw new Error('A "baseUrl" or "server" configuration is required when capturing relative routes (e.g. "/"). ' +
            'HTML-only pages using "html" or "htmlFile" do not need a server.');
    }
    const effectiveConfig = {
        ...config,
        baseUrl: activeBaseUrl,
    };
    const baseOutputDir = path.resolve(cwd, effectiveConfig.outputDir || "public");
    await ensureDirectory(baseOutputDir);
    let browser = null;
    const results = [];
    try {
        browser = await launchBrowser(effectiveConfig);
        const concurrency = effectiveConfig.concurrency || 4;
        const captureTask = async (pageConfig) => {
            const pageOutputDir = pageConfig.outputDir
                ? path.resolve(cwd, pageConfig.outputDir)
                : baseOutputDir;
            const targetFilePath = resolveOutputPath(pageOutputDir, pageConfig.output);
            const viewport = pageConfig.viewport || effectiveConfig.viewport || { width: 1200, height: 630 };
            const colorScheme = pageConfig.colorScheme || effectiveConfig.colorScheme || "light";
            const context = await createBrowserContext(browser, viewport, colorScheme, effectiveConfig);
            try {
                const result = await capturePageScreenshot(context, pageConfig, effectiveConfig, targetFilePath, { cwd });
                if (!quiet)
                    logger.logCapture(result);
                if (options.onProgress) {
                    options.onProgress(result);
                }
                return result;
            }
            finally {
                await context.close().catch(() => { });
            }
        };
        const taskResults = await asyncPool(concurrency, effectiveConfig.pages, captureTask);
        results.push(...taskResults);
    }
    finally {
        if (browser) {
            await browser.close().catch(() => { });
        }
        if (server) {
            await server.close().catch(() => { });
        }
    }
    const totalDurationMs = Date.now() - startTime;
    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const summary = {
        results,
        total: results.length,
        succeeded,
        failed,
        totalDurationMs,
        outputDir: baseOutputDir,
    };
    if (!quiet)
        logger.summary(summary);
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
export async function captureHtml(html, options) {
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
        pages: [
            {
                html,
                output: path.basename(options.output),
                // If output is nested, use outputDir as full parent and basename as file —
                // when output has directories, resolve via absolute path through outputDir + relative
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
    // Prefer absolute output: set outputDir to dirname of resolved path
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
    const summary = await generateScreenshots(config, { cwd, quiet: true });
    const result = summary.results[0];
    if (!result) {
        throw new Error("captureHtml() produced no result.");
    }
    if (!result.success) {
        throw result.error || new Error("captureHtml() failed to capture image.");
    }
    return result;
}
//# sourceMappingURL=runner.js.map