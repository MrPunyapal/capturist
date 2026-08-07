import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { BrowserContext, Page } from "playwright-core";
import type {
  PageConfig,
  CapturistConfig,
  ScreenshotResult,
} from "../types/index.js";
import { joinUrl, ensureFileDirectory } from "../utils/paths.js";

/**
 * CSS injected into pages to enforce pixel-perfect determinism.
 */
const DETERMINISTIC_CSS = `
*, *::before, *::after {
  -webkit-transition: none !important;
  -moz-transition: none !important;
  -o-transition: none !important;
  -ms-transition: none !important;
  transition: none !important;
  -webkit-animation: none !important;
  -moz-animation: none !important;
  -o-animation: none !important;
  -ms-animation: none !important;
  animation: none !important;
  caret-color: transparent !important;
}
`;

/**
 * Captures a single page screenshot deterministically.
 */
export async function capturePageScreenshot(
  context: BrowserContext,
  pageConfig: PageConfig,
  globalConfig: CapturistConfig,
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

    // 1. Navigate to target URL
    await page.goto(targetUrl, {
      waitUntil: "networkidle",
      timeout,
    });

    // 2. Wait for fonts to finish rendering
    await page.evaluate(async () => {
      if ("fonts" in document) {
        await (document as any).fonts.ready;
      }
    });

    // 3. Inject deterministic CSS if enabled
    if (pageConfig.disableAnimations !== false) {
      await page.addStyleTag({ content: DETERMINISTIC_CSS });
    }

    // 4. Custom waitFor selector or delay
    if (pageConfig.waitFor) {
      if (typeof pageConfig.waitFor === "number") {
        await page.waitForTimeout(pageConfig.waitFor);
      } else if (typeof pageConfig.waitFor === "string") {
        await page.waitForSelector(pageConfig.waitFor, { state: "visible" });
      }
    }

    // 5. Page delay if configured
    if (pageConfig.delay && pageConfig.delay > 0) {
      await page.waitForTimeout(pageConfig.delay);
    }

    // 6. Execute beforeScreenshot lifecycle hook if present
    if (pageConfig.beforeScreenshot) {
      await pageConfig.beforeScreenshot({
        page,
        context,
        route,
        outputPath: targetFilePath,
        pageConfig,
        config: globalConfig,
      });
    } else if (globalConfig.beforeScreenshot) {
      await globalConfig.beforeScreenshot({
        page,
        context,
        route,
        outputPath: targetFilePath,
        pageConfig,
        config: globalConfig,
      });
    }

    // Ensure parent directory exists before writing
    await ensureFileDirectory(targetFilePath);

    // 7. Take screenshot (element selector, fullPage, or viewport)
    let buffer: Buffer;
    let width = pageConfig.viewport?.width || 1200;
    let height = pageConfig.viewport?.height || 630;

    const screenshotType = pageConfig.type || "png";
    const quality = screenshotType === "png" ? undefined : pageConfig.quality;

    if (pageConfig.selector) {
      const element = await page.$(pageConfig.selector);
      if (!element) {
        throw new Error(
          `Target selector "${pageConfig.selector}" not found on page "${route}".`
        );
      }

      const box = await element.boundingBox();
      if (box) {
        width = Math.round(box.width);
        height = Math.round(box.height);
      }

      buffer = (await element.screenshot({
        type: screenshotType,
        quality,
        omitBackground: pageConfig.omitBackground,
      })) as Buffer;
    } else {
      buffer = (await page.screenshot({
        type: screenshotType,
        quality,
        fullPage: pageConfig.fullPage,
        omitBackground: pageConfig.omitBackground,
      })) as Buffer;

      if (pageConfig.fullPage) {
        const dimensions = await page.evaluate(() => ({
          width: document.documentElement.scrollWidth,
          height: document.documentElement.scrollHeight,
        }));
        width = dimensions.width;
        height = dimensions.height;
      }
    }

    // 8. Write binary output to disk
    await fs.writeFile(targetFilePath, buffer);
    const durationMs = Date.now() - startTime;

    return {
      route,
      outputPath: path.basename(targetFilePath),
      absolutePath: targetFilePath,
      sizeBytes: buffer.length,
      width,
      height,
      durationMs,
      success: true,
    };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    return {
      route,
      outputPath: path.basename(targetFilePath),
      absolutePath: targetFilePath,
      sizeBytes: 0,
      width: pageConfig.viewport?.width || 1200,
      height: pageConfig.viewport?.height || 630,
      durationMs,
      success: false,
      error: err,
    };
  } finally {
    await page.close().catch(() => {});
  }
}
