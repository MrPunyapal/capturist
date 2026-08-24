import * as fs from "node:fs/promises";
import * as path from "node:path";
import { parseCliArgs, printHelp } from "./args.js";
import { loadConfig } from "../config/loader.js";
import { generateScreenshots } from "../core/runner.js";
import { validateSteps } from "../core/steps.js";
import { resolvePageLabel } from "../config/validate.js";
import { logger } from "../utils/logger.js";
const VERSION = "0.1.3";
const STARTER_CONFIG = `import { defineConfig } from "capturist";

export default defineConfig({
  // Base URL of your website or local dev server
  // Not needed when every page uses \`html\` / \`htmlFile\`.
  baseUrl: "http://localhost:3000",

  // Default viewport dimensions (1200x630 is optimal for Open Graph social cards)
  viewport: {
    width: 1200,
    height: 630,
  },

  // Directory where generated screenshots are saved
  outputDir: "public",

  // Page targets to capture — route URLs and/or inline HTML cards
  pages: [
    {
      route: "/",
      output: "master-og-image.png",
    },
    {
      // Inline HTML needs no server (great for SSG OG cards)
      html: \`<!DOCTYPE html>
<html><body style="margin:0;width:1200px;height:630px;display:flex;align-items:center;justify-content:center;background:#0f172a;color:#fff;font:700 48px system-ui">
  Hello from capturist
</body></html>\`,
      output: "og/hello.png",
      label: "hello-card",
    },
  ],
});
`;
function printJsonSummary(summary) {
    const payload = {
        ok: summary.failed === 0,
        total: summary.total,
        succeeded: summary.succeeded,
        failed: summary.failed,
        cached: summary.cached ?? 0,
        captured: summary.captured ?? summary.total,
        totalDurationMs: summary.totalDurationMs,
        outputDir: summary.outputDir,
        results: summary.results.map((r) => ({
            route: r.route,
            outputPath: r.outputPath,
            absolutePath: r.absolutePath,
            sizeBytes: r.sizeBytes,
            width: r.width,
            height: r.height,
            durationMs: r.durationMs,
            success: r.success,
            cached: Boolean(r.cached),
            error: r.error ? r.error.message : undefined,
        })),
    };
    // Machine-readable contract for PHP / CI integrators
    process.stdout.write(JSON.stringify(payload) + "\n");
}
export async function runCli(argv = process.argv.slice(2)) {
    const options = parseCliArgs(argv);
    if (options.version) {
        console.log(`capturist v${VERSION}`);
        return;
    }
    if (options.help) {
        printHelp();
        return;
    }
    const cwd = options.cwd
        ? path.resolve(process.cwd(), options.cwd)
        : process.cwd();
    const quiet = Boolean(options.quiet || options.json);
    logger.quiet = quiet;
    if (options.verbose) {
        logger.verbose = true;
        logger.quiet = false;
    }
    // Handle "init" command
    if (options.init) {
        if (!quiet)
            logger.banner(VERSION);
        const targetFile = path.resolve(cwd, "capturist.config.js");
        try {
            await fs.access(targetFile);
            logger.warn(`Configuration file already exists: ${targetFile}`);
        }
        catch {
            await fs.writeFile(targetFile, STARTER_CONFIG, "utf-8");
            logger.success(`Created configuration starter at: ${targetFile}`);
            logger.info(`Run "capturist" to generate your first screenshots.`);
        }
        return;
    }
    if (!quiet)
        logger.banner(VERSION);
    // Single-shot commands (shot / record) build an in-memory one-page config.
    if (options.shot || options.record) {
        try {
            await runSingleShot(options, cwd, quiet);
        }
        catch (err) {
            if (options.json) {
                process.stdout.write(JSON.stringify({ ok: false, error: err?.message || String(err) }) + "\n");
            }
            else {
                logger.error(err?.message || String(err), err);
            }
            process.exitCode = 1;
        }
        return;
    }
    try {
        const { config, configPath } = await loadConfig(cwd, options.config);
        if (!quiet) {
            logger.info(`Loaded config: ${path.relative(cwd, configPath) || configPath}`);
        }
        // Merge CLI overrides
        if (options.baseUrl) {
            config.baseUrl = options.baseUrl;
        }
        if (options.outputDir) {
            config.outputDir = options.outputDir;
        }
        if (options.concurrency) {
            config.concurrency = options.concurrency;
        }
        if (options.serverDir) {
            config.server = {
                dir: options.serverDir,
                port: options.serverPort,
            };
        }
        if (options.dryRun) {
            if (!quiet) {
                logger.info(`Dry run mode: validated ${config.pages.length} page targets without launching browser.`);
                config.pages.forEach((p, i) => {
                    logger.info(` [${i + 1}/${config.pages.length}] ${resolvePageLabel(p)} → ${p.output}`);
                });
            }
            if (options.json) {
                process.stdout.write(JSON.stringify({
                    ok: true,
                    dryRun: true,
                    total: config.pages.length,
                    pages: config.pages.map((p) => ({
                        label: resolvePageLabel(p),
                        output: p.output,
                        html: Boolean(p.html),
                        htmlFile: p.htmlFile || null,
                        route: p.url || p.route || null,
                    })),
                }) + "\n");
            }
            return;
        }
        const summary = await generateScreenshots(config, {
            cwd,
            quiet: quiet && !options.verbose,
            force: Boolean(options.force || options.noCache),
            cache: options.cache === true ? true : options.noCache || options.force ? false : undefined,
        });
        if (options.json) {
            printJsonSummary(summary);
        }
        if (summary.failed > 0) {
            process.exitCode = 1;
        }
    }
    catch (err) {
        if (options.json) {
            process.stdout.write(JSON.stringify({
                ok: false,
                error: err?.message || String(err),
            }) + "\n");
        }
        else {
            logger.error(err.message, err);
        }
        process.exitCode = 1;
    }
}
/**
 * Builds an in-memory one-page config for `capturist shot` / `capturist record`
 * and runs it through the normal pipeline with caching disabled.
 */
async function runSingleShot(options, cwd, quiet) {
    const isRecord = Boolean(options.record);
    const single = (isRecord ? options.record : options.shot);
    if (!single.output) {
        throw new Error(isRecord
            ? 'capturist record requires --output <file.webm>.'
            : 'capturist shot requires --output <file.png>.');
    }
    const page = {
        output: single.output,
    };
    if (single.html) {
        page.html = single.html;
    }
    else if (single.htmlFile) {
        page.htmlFile = single.htmlFile;
    }
    else if (single.url) {
        // Absolute URLs go straight into route; relative routes need a baseUrl.
        if (!/^[a-z][a-z0-9+.-]*:/i.test(single.url) && !options.baseUrl) {
            throw new Error(`Relative URL "${single.url}" requires --baseUrl (e.g. --baseUrl http://127.0.0.1:8000).`);
        }
        page.route = single.url;
    }
    else {
        throw new Error(`${isRecord ? "capturist record" : "capturist shot"} requires --url, --html, or --html-file.`);
    }
    if (single.selector) {
        assertShotOnly(isRecord, "--selector");
        page.selector = single.selector;
    }
    if (single.fullPage) {
        assertShotOnly(isRecord, "--full-page");
        page.fullPage = true;
    }
    if (single.retina) {
        assertShotOnly(isRecord, "--retina");
        page.scale = 2;
    }
    if (single.waitFor) {
        page.waitFor = single.waitFor;
    }
    if (typeof single.delay === "number" && Number.isFinite(single.delay)) {
        page.delay = single.delay;
    }
    if (single.viewport) {
        const match = /^(\d{1,5})x(\d{1,5})$/.exec(single.viewport);
        if (!match) {
            throw new Error(`Invalid --viewport "${single.viewport}". Expected WIDTHxHEIGHT, e.g. 1280x720.`);
        }
        page.viewport = { width: parseInt(match[1], 10), height: parseInt(match[2], 10) };
    }
    if (isRecord) {
        if (!/\.webm$/i.test(single.output)) {
            throw new Error("Video output must use the .webm extension.");
        }
        if (!single.stepsFile) {
            throw new Error('capturist record requires --steps-file <steps.json>.');
        }
        const stepsPath = path.isAbsolute(single.stepsFile)
            ? single.stepsFile
            : path.resolve(cwd, single.stepsFile);
        let raw;
        try {
            raw = JSON.parse(await fs.readFile(stepsPath, "utf-8"));
        }
        catch (err) {
            throw new Error(`Failed to read steps file "${single.stepsFile}": ${err?.message || err}`);
        }
        const { steps, error } = validateSteps(raw);
        if (error) {
            throw new Error(error);
        }
        page.steps = steps;
        page.video = true;
    }
    const config = {
        ...(options.baseUrl ? { baseUrl: options.baseUrl } : {}),
        ...(options.outputDir ? { outputDir: options.outputDir } : {}),
        concurrency: 1,
        cache: false,
        pages: [page],
    };
    const summary = await generateScreenshots(config, {
        cwd,
        quiet: quiet && !options.verbose,
        force: true,
        cache: false,
    });
    if (options.json) {
        printJsonSummary(summary);
    }
    if (summary.failed > 0) {
        process.exitCode = 1;
    }
}
function assertShotOnly(isRecord, flag) {
    if (isRecord) {
        throw new Error(`${flag} only applies to capturist shot, not record.`);
    }
}
//# sourceMappingURL=index.js.map