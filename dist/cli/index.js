import * as fs from "node:fs/promises";
import * as path from "node:path";
import { parseCliArgs, printHelp } from "./args.js";
import { loadConfig } from "../config/loader.js";
import { generateScreenshots } from "../core/runner.js";
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
//# sourceMappingURL=index.js.map