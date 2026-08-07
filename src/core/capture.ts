import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { BrowserContext, Page } from "playwright-core";
import type {
  PageConfig,
  SiteSnapConfig,
  ScreenshotResult,
} from "../types/index.js";
import { joinUrl, ensureFileDirectory } from "../utils/paths.js";

/**
 * CSS injected to freeze and disable all animations, transitions, and blinking carets.
 */
const DISABLE_ANIMATIONS_CSS = `
*, *::before, *::after {
  -webkit-animation-delay: 0s !important;
  -moz-animation-delay: 0s !important;
  animation-delay: 0s !important;
  -webkit-animation-duration: 0s !important;
  -moz-animation-duration: 0s !important;
  animation-duration: 0s !important;
  -webkit-transition-duration: 0s !important;
  -moz-transition-duration: 0s !important;
  transition-duration: 0s !important;
  -webkit-transition-delay: 0s !important;
  -moz-transition-delay: 0s !important;
  transition-delay: 0s !important;
  caret-color: transparent !important;
}
::-webkit-scrollbar {
  display: none !important;
}
`;

/**
 * Captures a single page screenshot deterministically.
 */
export async function capturePageScreenshot(
  context: BrowserContext,
  pageConfig: PageConfig,
  globalConfig: SiteSnapConfig,
  targetFilePath: string
): Promise<ScreenshotResult> {
  const startTime = Date.now();
  const route = pageConfig.route || pageConfig.url || "/";
  const targetUrl = joinUrl(globalConfig.baseUrl || "", route);

  const page: Page = await context.newPage();

  try {
    const timeout = globalConfig.timeout || 30000;
    page.setDefaultTimeout(timeout);
    page.setDefaultNavigationTimeout(timeout);

    // Navigate to target URL, waiting for network idle
    try {
      await page.goto(targetUrl, {
        waitUntil: "networkidle",
        timeout,
      });
    } catch {
      // If networkidle times out (e.g. persistent WebSocket or polling), fall back to load
      await page.goto(targetUrl, {
        waitUntil: "load",
        timeout: Math.min(10000, timeout),
      });
    }

    // Wait for web fonts to load
    await page.evaluate(async () => {
      if ("fonts" in document && document.fonts && typeof document.fonts.ready !== "undefined") {
        await (document.fonts as any).ready;
      }
    });

    // Disable animations & transitions for deterministic rendering
    if (pageConfig.disableAnimations !== false) {
      await page.addStyleTag({ content: DISABLE_ANIMATIONS_CSS });
    }

    // Handle custom waitFor selector or timeout
    if (pageConfig.waitFor) {
      if (typeof pageConfig.waitFor === "number") {
        await page.waitForTimeout(pageConfig.waitFor);
      } else if (typeof pageConfig.waitFor === "string") {
        await page.waitForSelector(pageConfig.waitFor, {
          state: "visible",
          timeout,
        });
      }
    }

    // Additional delay if configured
    if (pageConfig.delay && pageConfig.delay > 0) {
      await page.waitForTimeout(pageConfig.delay);
    }

    // Execute global beforeScreenshot hook if present
    if (typeof globalConfig.beforeScreenshot === "function") {
      await globalConfig.beforeScreenshot({
        page,
        context,
        route,
        outputPath: targetFilePath,
        pageConfig,
        config: globalConfig,
      });
    }

    // Execute page-level beforeScreenshot hook if present
    if (typeof pageConfig.beforeScreenshot === "function") {
      await pageConfig.beforeScreenshot({
        page,
        context,
        route,
        outputPath: targetFilePath,
        pageConfig,
        config: globalConfig,
      });
    }

    // Ensure parent directory exists
    await ensureFileDirectory(targetFilePath);

    const screenshotOptions: any = {
      path: targetFilePath,
      type: pageConfig.type || "png",
      omitBackground: pageConfig.omitBackground || false,
    };

    if (pageConfig.type === "jpeg" && typeof pageConfig.quality === "number") {
      screenshotOptions.quality = pageConfig.quality;
    }

    let capturedWidth = pageConfig.viewport?.width || globalConfig.viewport?.width || 1200;
    let capturedHeight = pageConfig.viewport?.height || globalConfig.viewport?.height || 630;

    if (pageConfig.selector) {
      const element = await page.$(pageConfig.selector);
      if (!element) {
        throw new Error(
          `Element with selector "${pageConfig.selector}" not found on page "${route}".`
        );
      }
      const box = await element.boundingBox();
      if (box) {
        capturedWidth = Math.round(box.width);
        capturedHeight = Math.round(box.height);
      }
      await element.screenshot(screenshotOptions);
    } else {
      if (pageConfig.fullPage) {
        screenshotOptions.fullPage = true;
      }
      await page.screenshot(screenshotOptions);
    }

    const durationMs = Date.now() - startTime;
    const stat = await fs.stat(targetFilePath);

    return {
      route,
      outputPath: pageConfig.output,
      absolutePath: targetFilePath,
      sizeBytes: stat.size,
      width: capturedWidth,
      height: capturedHeight,
      durationMs,
      success: true,
    };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    return {
      route,
      outputPath: pageConfig.output,
      absolutePath: targetFilePath,
      sizeBytes: 0,
      width: 0,
      height: 0,
      durationMs,
      success: false,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  } finally {
    await page.close().catch(() => {});
  }
}
