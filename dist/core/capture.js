import * as fs from "node:fs/promises";
import * as path from "node:path";
import { isHtmlPage, resolvePageLabel } from "../config/validate.js";
import { joinUrl, ensureFileDirectory } from "../utils/paths.js";
import { executeSteps } from "./steps.js";
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
async function loadPageContent(page, pageConfig, globalConfig, cwd, timeout) {
    if (isHtmlPage(pageConfig)) {
        let html = pageConfig.html ?? "";
        if (pageConfig.htmlFile) {
            const filePath = path.isAbsolute(pageConfig.htmlFile)
                ? pageConfig.htmlFile
                : path.resolve(cwd, pageConfig.htmlFile);
            try {
                html = await fs.readFile(filePath, "utf-8");
            }
            catch (err) {
                throw new Error(`Failed to read htmlFile "${pageConfig.htmlFile}": ${err?.message || err}`);
            }
        }
        if (!html.trim()) {
            throw new Error(`Page "${resolvePageLabel(pageConfig)}" has empty HTML content.`);
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
export async function capturePageScreenshot(context, pageConfig, globalConfig, targetFilePath, options = {}) {
    const startTime = Date.now();
    const cwd = options.cwd || process.cwd();
    const label = resolvePageLabel(pageConfig);
    const page = await context.newPage();
    try {
        const timeout = globalConfig.timeout || 30000;
        page.setDefaultTimeout(timeout);
        page.setDefaultNavigationTimeout(timeout);
        // 1. Navigate or inject HTML
        const route = await loadPageContent(page, pageConfig, globalConfig, cwd, timeout);
        // 2. Wait for fonts to finish rendering
        await page.evaluate(async () => {
            if ("fonts" in document) {
                await document.fonts.ready;
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
            }
            else if (typeof pageConfig.waitFor === "string") {
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
        }
        else if (globalConfig.beforeScreenshot) {
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
        let buffer;
        let width = pageConfig.viewport?.width || 1200;
        let height = pageConfig.viewport?.height || 630;
        const screenshotType = pageConfig.type || "png";
        const quality = screenshotType === "png" ? undefined : pageConfig.quality;
        if (pageConfig.selector) {
            const element = await page.$(pageConfig.selector);
            if (!element) {
                throw new Error(`Target selector "${pageConfig.selector}" not found on page "${label}".`);
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
            }));
        }
        else {
            buffer = (await page.screenshot({
                type: screenshotType,
                quality,
                fullPage: pageConfig.fullPage,
                omitBackground: pageConfig.omitBackground,
            }));
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
    }
    catch (err) {
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
    }
    finally {
        await page.close().catch(() => { });
    }
}
/**
 * Records a page flow as a video (`.webm`).
 *
 * The browser context must have been created with `recordVideo` enabled —
 * the runner handles that. Steps execute in order while Playwright records;
 * the video is finalized when the page closes.
 */
export async function capturePageVideo(context, pageConfig, globalConfig, targetFilePath, options = {}) {
    const startTime = Date.now();
    const cwd = options.cwd || process.cwd();
    const label = resolvePageLabel(pageConfig);
    const width = pageConfig.viewport?.width || globalConfig.viewport?.width || 1200;
    const height = pageConfig.viewport?.height || globalConfig.viewport?.height || 630;
    if (!/\.webm$/i.test(targetFilePath)) {
        return fail(`Video output "${path.basename(targetFilePath)}" must use the .webm extension.`);
    }
    // Animations must keep playing for a natural recording.
    const page = await context.newPage();
    try {
        const timeout = globalConfig.timeout || 30000;
        page.setDefaultTimeout(timeout);
        page.setDefaultNavigationTimeout(timeout);
        // 1. Navigate or inject HTML
        await loadPageContent(page, pageConfig, globalConfig, cwd, timeout);
        // 2. Wait for fonts, custom waitFor, and delay — same readiness contract as screenshots
        await page.evaluate(async () => {
            if ("fonts" in document) {
                await document.fonts.ready;
            }
        });
        if (pageConfig.waitFor) {
            if (typeof pageConfig.waitFor === "number") {
                await page.waitForTimeout(pageConfig.waitFor);
            }
            else if (typeof pageConfig.waitFor === "string") {
                await page.waitForSelector(pageConfig.waitFor, { state: "visible" });
            }
        }
        if (pageConfig.delay && pageConfig.delay > 0) {
            await page.waitForTimeout(pageConfig.delay);
        }
        // 3. Run the interaction script while recording, paced so it stays watchable
        const stepOutputDir = path.dirname(targetFilePath);
        const executed = await executeSteps(page, pageConfig.steps || [], {
            outputDir: stepOutputDir,
            baseUrl: globalConfig.baseUrl,
            pace: pageConfig.pace ?? 400,
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
    }
    catch (err) {
        await page.close().catch(() => { });
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
    function fail(message) {
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
//# sourceMappingURL=capture.js.map