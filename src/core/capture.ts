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
import { DEFAULT_WIDGET_PADDING, executeSteps, focusElement } from "./steps.js";

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

    // 5b. Same-page steps (open a dropdown, etc.) — not login; login is `before`.
    if (pageConfig.selector) {
      await focusElement(page, pageConfig.selector, pageConfig.padding);
    }

    if (pageConfig.steps && pageConfig.steps.length > 0) {
      await executeSteps(page, pageConfig.steps, {
        outputDir: path.dirname(targetFilePath),
        baseUrl: globalConfig.baseUrl,
      });
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
      const clip = await paddedSelectorClip(page, pageConfig.selector, pageConfig.padding);
      width = clip.width;
      height = clip.height;

      buffer = (await page.screenshot({
        type: screenshotType,
        quality,
        clip,
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

/**
 * Records a page flow as a video (`.webm`).
 *
 * The browser context must have been created with `recordVideo` enabled —
 * the runner handles that. Steps execute in order while Playwright records;
 * the video is finalized when the page closes.
 */
export async function capturePageVideo(
  context: BrowserContext,
  pageConfig: PageConfig,
  globalConfig: CapturistConfig,
  targetFilePath: string,
  options: { cwd?: string } = {}
): Promise<ScreenshotResult> {
  const startTime = Date.now();
  const cwd = options.cwd || process.cwd();
  const label = resolvePageLabel(pageConfig);
  const width = pageConfig.viewport?.width || globalConfig.viewport?.width || 1200;
  const height = pageConfig.viewport?.height || globalConfig.viewport?.height || 630;

  if (!/\.webm$/i.test(targetFilePath)) {
    return fail(`Video output "${path.basename(targetFilePath)}" must use the .webm extension.`);
  }

  // Animations must keep playing for a natural recording.
  const page: Page = await context.newPage();

  try {
    const timeout = globalConfig.timeout || 30000;
    page.setDefaultTimeout(timeout);
    page.setDefaultNavigationTimeout(timeout);

    // 1. Navigate or inject HTML
    await loadPageContent(page, pageConfig, globalConfig, cwd, timeout);

    // 2. Wait for fonts, custom waitFor, and delay — same readiness contract as screenshots
    await page.evaluate(async () => {
      if ("fonts" in document) {
        await (document as any).fonts.ready;
      }
    });

    if (pageConfig.waitFor) {
      if (typeof pageConfig.waitFor === "number") {
        await page.waitForTimeout(pageConfig.waitFor);
      } else if (typeof pageConfig.waitFor === "string") {
        await page.waitForSelector(pageConfig.waitFor, { state: "visible" });
      }
    }

    if (pageConfig.delay && pageConfig.delay > 0) {
      await page.waitForTimeout(pageConfig.delay);
    }

    const padding = pageConfig.padding ?? DEFAULT_WIDGET_PADDING;
    // Apply framing before recording. Applying it after the interaction steps
    // records the full page and only shows the focused subject at the end.
    if (pageConfig.selector) {
      await focusElement(page, pageConfig.selector, padding);
    }

    // 3. Run the interaction script while recording, paced so it stays watchable
    const stepOutputDir = path.dirname(targetFilePath);
    const executed = await executeSteps(page, pageConfig.steps || [], {
      outputDir: stepOutputDir,
      baseUrl: globalConfig.baseUrl,
      pace: pageConfig.pace ?? 400,
      padding,
    });

    // Small settle so the last interaction is visible before the recording stops
    await page.waitForTimeout(250);

    await ensureFileDirectory(targetFilePath);

    // 4. Finalize: close the page, then save the finished video
    const video = page.video();
    await page.close();
    if (!video) {
      throw new Error("Playwright did not provide a video recorder for this context.");
    }

    await video.saveAs(targetFilePath);

    const stat = await fs.stat(targetFilePath);
    const durationMs = Date.now() - startTime;

    void executed;

    return {
      route: label,
      outputPath: path.basename(targetFilePath),
      absolutePath: targetFilePath,
      sizeBytes: stat.size,
      width,
      height,
      durationMs,
      success: true,
      video: true,
    };
  } catch (err: any) {
    await page.close().catch(() => {});
    const durationMs = Date.now() - startTime;
    return {
      route: label,
      outputPath: path.basename(targetFilePath),
      absolutePath: targetFilePath,
      sizeBytes: 0,
      width,
      height,
      durationMs,
      success: false,
      error: err,
      video: true,
    };
  }

  function fail(message: string): ScreenshotResult {
    return {
      route: label,
      outputPath: path.basename(targetFilePath),
      absolutePath: targetFilePath,
      sizeBytes: 0,
      width,
      height,
      durationMs: Date.now() - startTime,
      success: false,
      error: new Error(message),
      video: true,
    };
  }
}

/**
 * Clip a selector with padding around it, clamped to the viewport.
 */
async function paddedSelectorClip(
  page: Page,
  selector: string,
  padding: number | undefined
): Promise<{ x: number; y: number; width: number; height: number }> {
  const element = await page.$(selector);

  if (!element) {
    throw new Error(`Target selector "${selector}" not found on page.`);
  }

  await element.scrollIntoViewIfNeeded();
  const box = await element.boundingBox();

  if (!box || box.width < 1 || box.height < 1) {
    throw new Error(`Target selector "${selector}" has no visible box.`);
  }

  const pad =
    typeof padding === "number" && Number.isFinite(padding) && padding >= 0
      ? padding
      : DEFAULT_WIDGET_PADDING;
  const viewport = page.viewportSize() ?? { width: 1200, height: 630 };
  const bounds = await page.evaluate(
    ({ sel, target }: { sel: string; target: { x: number; y: number; width: number; height: number } }) => {
      const targetElement = document.querySelector('[data-capturist-focus-root]') || document.querySelector(sel);
      if (!targetElement) return target;
      const targetRect = (targetElement as HTMLElement).getBoundingClientRect();
      let left = targetRect.width > 1 ? targetRect.left : target.x;
      let top = targetRect.height > 1 ? targetRect.top : target.y;
      let right = targetRect.width > 1 ? targetRect.right : target.x + target.width;
      let bottom = targetRect.height > 1 ? targetRect.bottom : target.y + target.height;
      const targetRight = right;
      const targetBottom = bottom;

      for (const candidate of document.querySelectorAll(
        '[role="listbox"], [role="dialog"], [role="menu"], [data-popper-placement], .fi-select-panel, .fi-dropdown-panel'
      )) {
        const rect = (candidate as HTMLElement).getBoundingClientRect();
        const style = window.getComputedStyle(candidate);
        if (
          rect.width < 2 || rect.height < 2 ||
          style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0 ||
          rect.left > targetRight + 24 || rect.right < left - 24 ||
          rect.top > targetBottom + 500 || rect.bottom < top - 150
        ) continue;
        left = Math.min(left, rect.left);
        top = Math.min(top, rect.top);
        right = Math.max(right, rect.right);
        bottom = Math.max(bottom, rect.bottom);
      }

      return { x: left, y: top, width: right - left, height: bottom - top };
    },
    { sel: selector, target: box }
  );

  const x = Math.max(0, bounds.x - pad);
  const y = Math.max(0, bounds.y - pad);
  const right = Math.min(viewport.width, bounds.x + bounds.width + pad);
  const bottom = Math.min(viewport.height, bounds.y + bounds.height + pad);

  return {
    x: Math.floor(x),
    y: Math.floor(y),
    width: Math.max(1, Math.ceil(right - x)),
    height: Math.max(1, Math.ceil(bottom - y)),
  };
}
