import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { BrowserContext, Page } from "playwright-core";
import type {
  PageConfig,
  CapturistConfig,
  ScreenshotResult,
} from "../types/index.js";
import { isHtmlPage, resolvePageLabel } from "../config/validate.js";
import { joinUrl, ensureFileDirectory } from "../utils/paths.js";

/**
 * CSS injected into pages to enforce pixel-perfect determinism and ultra-crisp typography.
 */
const DETERMINISTIC_CSS = `
html, body {
  -webkit-font-smoothing: antialiased !important;
  -moz-osx-font-smoothing: grayscale !important;
  text-rendering: optimizeLegibility !important;
}

img, svg {
  image-rendering: -webkit-optimize-contrast !important;
}

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
 * Loads page content either by URL navigation or by injecting HTML (inline / file).
 */
async function loadPageContent(
  page: Page,
  pageConfig: PageConfig,
  globalConfig: CapturistConfig,
  cwd: string,
  timeout: number
): Promise<string> {
  if (isHtmlPage(pageConfig)) {
    let html = pageConfig.html ?? "";

    if (pageConfig.htmlFile) {
      const filePath = path.isAbsolute(pageConfig.htmlFile)
        ? pageConfig.htmlFile
        : path.resolve(cwd, pageConfig.htmlFile);
      try {
        html = await fs.readFile(filePath, "utf-8");
      } catch (err: any) {
        throw new Error(
          `Failed to read htmlFile "${pageConfig.htmlFile}": ${err?.message || err}`
        );
      }
    }

    if (!html.trim()) {
      throw new Error(
        `Page "${resolvePageLabel(pageConfig)}" has empty HTML content.`
      );
    }

    // setContent does not fire a full navigation lifecycle; "load" is enough for inline docs.
    await page.setContent(html, {
      waitUntil: "load",
      timeout,
    });

    return resolvePageLabel(pageConfig);
  }

  const route = pageConfig.route || pageConfig.url || "/";
  const targetUrl = joinUrl(globalConfig.baseUrl || "", route);

  await page.goto(targetUrl, {
    waitUntil: "networkidle",
    timeout,
  });

  return route;
}

/**
 * Captures a single page screenshot deterministically.
 */
export async function capturePageScreenshot(
  context: BrowserContext,
  pageConfig: PageConfig,
  globalConfig: CapturistConfig,
  targetFilePath: string,
  options: { cwd?: string } = {}
): Promise<ScreenshotResult> {
  const startTime = Date.now();
  const cwd = options.cwd || process.cwd();
  const label = resolvePageLabel(pageConfig);

  const page: Page = await context.newPage();

  try {
    const timeout = globalConfig.timeout || 30000;
    page.setDefaultTimeout(timeout);
    page.setDefaultNavigationTimeout(timeout);

    // 1. Navigate or inject HTML
    const route = await loadPageContent(page, pageConfig, globalConfig, cwd, timeout);

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
          `Target selector "${pageConfig.selector}" not found on page "${label}".`
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
      route: label,
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
      route: label,
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
