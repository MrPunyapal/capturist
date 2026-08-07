import * as fs from "node:fs/promises";
import * as path from "node:path";
import { parseCliArgs, printHelp } from "./args.js";
import { loadConfig } from "../config/loader.js";
import { generateScreenshots } from "../core/runner.js";
import { logger } from "../utils/logger.js";
import type { PageShotConfig } from "../types/index.js";

const VERSION = "0.1.0";

const STARTER_CONFIG = `import { defineConfig } from "page-shot";

export default defineConfig({
  // Base URL of your website or local dev server
  baseUrl: "http://localhost:3000",

  // Default viewport dimensions (1200x630 is optimal for Open Graph social cards)
  viewport: {
    width: 1200,
    height: 630,
  },

  // Directory where generated screenshots are saved
  outputDir: "public",

  // Page targets to capture
  pages: [
    {
      route: "/",
      output: "master-og-image.png",
    },
    {
      route: "/projects",
      output: "og/projects.png",
    },
    {
      route: "/talks",
      output: "og/talks.png",
    },
  ],
});
`;

export async function runCli(argv: string[] = process.argv.slice(2)): Promise<void> {
  const options = parseCliArgs(argv);

  if (options.version) {
    console.log(`page-shot v${VERSION}`);
    return;
  }

  if (options.help) {
    printHelp();
    return;
  }

  if (options.verbose) {
    logger.verbose = true;
  }

  // Handle "init" command
  if (options.init) {
    logger.banner(VERSION);
    const targetFile = path.resolve(process.cwd(), "page-shot.config.js");
    try {
      await fs.access(targetFile);
      logger.warn(`Configuration file already exists: ${targetFile}`);
    } catch {
      await fs.writeFile(targetFile, STARTER_CONFIG, "utf-8");
      logger.success(`Created configuration starter at: ${targetFile}`);
      logger.info(`Run "page-shot" to generate your first screenshots.`);
    }
    return;
  }

  logger.banner(VERSION);

  try {
    const { config, configPath } = await loadConfig(process.cwd(), options.config);
    logger.info(`Loaded config: ${path.relative(process.cwd(), configPath) || configPath}`);

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
      logger.info(`Dry run mode: validated ${config.pages.length} page targets without launching browser.`);
      config.pages.forEach((p, i) => {
        logger.info(` [${i + 1}/${config.pages.length}] ${p.route || p.url} → ${p.output}`);
      });
      return;
    }

    const summary = await generateScreenshots(config);
    if (summary.failed > 0) {
      process.exitCode = 1;
    }
  } catch (err: any) {
    logger.error(err.message, err);
    process.exitCode = 1;
  }
}
