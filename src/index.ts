// Main library entry point for capturist

export { defineConfig } from "./config/define.js";
export { loadConfig, loadConfigFile, resolveConfigFile } from "./config/loader.js";
export { validateConfig, validatePageConfig, validateViewport } from "./config/validate.js";
export { generateScreenshots } from "./core/runner.js";
export { launchBrowser, createBrowserContext, getPlaywrightBrowser } from "./core/browser.js";
export { capturePageScreenshot } from "./core/capture.js";
export { startStaticServer } from "./server/static-server.js";
export { runCli } from "./cli/index.js";
export { parseCliArgs, printHelp } from "./cli/args.js";
export { logger, Logger } from "./utils/logger.js";
export { joinUrl, formatBytes, resolveOutputPath, ensureDirectory } from "./utils/paths.js";

// Type exports
export type {
  CapturistConfig,
  PageConfig,
  Viewport,
  ColorScheme,
  BrowserName,
  ScreenshotFormat,
  StaticServerConfig,
  ScreenshotHookContext,
  BeforeScreenshotHook,
  ScreenshotResult,
  RunSummary,
  CliOptions,
} from "./types/index.js";
