import * as path from "node:path";
import { joinUrl, ensureFileDirectory } from "../utils/paths.js";
const KNOWN_ACTIONS = new Set([
    "goto",
    "click",
    "dblclick",
    "hover",
    "fill",
    "type",
    "press",
    "scroll",
    "wait",
    "screenshot",
    "focus",
]);
/**
 * Validates an untrusted value (e.g. parsed from a JSON steps file) as a
 * RecordStep array. Returns a human-readable problem instead of throwing.
 */
export function validateSteps(value) {
    if (value === null || typeof value !== "object") {
        return { steps: [], error: "Steps must be a JSON array or an object with a \"steps\" array." };
    }
    const raw = Array.isArray(value) ? value : value.steps;
    if (!Array.isArray(raw)) {
        return { steps: [], error: "Steps must be a JSON array or an object with a \"steps\" array." };
    }
    const steps = [];
    for (let i = 0; i < raw.length; i++) {
        const item = raw[i];
        const where = `steps[${i}]`;
        if (item === null || typeof item !== "object") {
            return { steps: [], error: `${where} must be an object.` };
        }
        const step = item;
        if (typeof step.action !== "string" || !KNOWN_ACTIONS.has(step.action)) {
            return {
                steps: [],
                error: `${where}.action "${String(step.action)}" is not a known action. Known actions: ${[...KNOWN_ACTIONS].join(", ")}.`,
            };
        }
        const action = step.action;
        const requireSelector = (field = "selector") => typeof step[field] === "string" && step[field].length > 0
            ? null
            : `${where} requires a non-empty "${field}" string.`;
        let problem = null;
        switch (action) {
            case "goto":
                problem = typeof step.url === "string" && step.url.length > 0 ? null : `${where} requires a non-empty "url".`;
                break;
            case "click":
            case "dblclick":
            case "hover":
            case "focus":
                problem = requireSelector();
                break;
            case "fill":
                problem =
                    requireSelector() ??
                        (typeof step.value === "string" ? null : `${where} requires a "value" string.`);
                break;
            case "type":
                problem =
                    requireSelector() ??
                        (typeof step.text === "string" ? null : `${where} requires a "text" string.`);
                break;
            case "press":
                problem =
                    typeof step.key === "string" && step.key.length > 0
                        ? null
                        : `${where} requires a non-empty "key" (e.g. "Enter").`;
                break;
            case "scroll": {
                const hasOffsets = typeof step.x === "number" || typeof step.y === "number";
                const hasSelector = typeof step.selector === "string" && step.selector.length > 0;
                problem = hasOffsets || hasSelector ? null : `${where} requires x/y offsets or a "selector".`;
                break;
            }
            case "wait": {
                const hasMs = typeof step.ms === "number" && Number.isFinite(step.ms) && step.ms >= 0;
                const hasSelector = typeof step.selector === "string" && step.selector.length > 0;
                problem = hasMs || hasSelector ? null : `${where} requires "ms" and/or "selector".`;
                break;
            }
            case "screenshot":
                problem =
                    typeof step.output === "string" && step.output.length > 0
                        ? null
                        : `${where} requires an "output" file name.`;
                break;
        }
        if (problem) {
            return { steps: [], error: problem };
        }
        // Narrow into RecordStep (validated above).
        steps.push(step);
    }
    return { steps };
}
/**
 * Executes declarative interaction steps against the page, in order.
 *
 * When `options.pace` is set, that many milliseconds are inserted after every
 * step except the last so recordings stay followable.
 *
 * @returns The number of executed steps.
 */
export async function executeSteps(page, steps, options = {}) {
    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        try {
            await executeStep(page, step, options);
        }
        catch (err) {
            throw new Error(`Step ${i + 1}/${steps.length} (${step.action}) failed: ${err?.message || err}`);
        }
        if (options.pace && options.pace > 0 && i < steps.length - 1) {
            await page.waitForTimeout(options.pace);
        }
    }
    return steps.length;
}
async function executeStep(page, step, options) {
    switch (step.action) {
        case "goto": {
            const target = joinUrl(options.baseUrl || "", step.url);
            await page.goto(target, { waitUntil: "load", timeout: 30000 });
            break;
        }
        case "click":
            await (await firstVisible(page, step.selector)).click();
            break;
        case "dblclick":
            await (await firstVisible(page, step.selector)).dblclick();
            break;
        case "hover":
            await (await firstVisible(page, step.selector)).hover();
            break;
        case "fill":
            await (await firstVisible(page, step.selector)).fill(step.value);
            break;
        case "type":
            await (await firstVisible(page, step.selector)).pressSequentially(step.text, { delay: step.delay ?? 25 });
            break;
        case "press":
            if (step.selector) {
                await (await firstVisible(page, step.selector)).press(step.key);
            }
            else {
                await page.keyboard.press(step.key);
            }
            break;
        case "scroll":
            if (step.selector) {
                const target = await firstVisible(page, step.selector);
                if (typeof step.x === "number" || typeof step.y === "number") {
                    await target.evaluate((element, offsets) => {
                        element.scrollBy(offsets.x, offsets.y);
                    }, { x: step.x ?? 0, y: step.y ?? 0 });
                }
                else {
                    await target.scrollIntoViewIfNeeded();
                }
            }
            else {
                await page.mouse.wheel(step.x ?? 0, step.y ?? 0);
            }
            break;
        case "wait":
            if (step.selector) {
                await waitForVisible(page, step.selector);
            }
            if (typeof step.ms === "number" && step.ms > 0) {
                await page.waitForTimeout(step.ms);
            }
            break;
        case "screenshot": {
            const target = resolveStepOutput(step.output, options.outputDir);
            await ensureFileDirectory(target);
            await page.screenshot({ path: target, type: "png" });
            break;
        }
        case "focus":
            await focusElement(page, step.selector, typeof step.padding === "number" ? step.padding : options.padding);
            break;
    }
}
async function firstVisible(page, selector) {
    const candidates = page.locator(selector);
    const count = await candidates.count();
    for (let index = 0; index < count; index++) {
        const candidate = candidates.nth(index);
        if (await candidate.isVisible()) {
            return candidate;
        }
    }
    throw new Error(`No visible element matched selector "${selector}".`);
}
async function waitForVisible(page, selector) {
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
        try {
            const candidate = await firstVisible(page, selector);
            const box = await candidate.boundingBox();
            if (box && box.width > 0 && box.height > 0)
                return candidate;
        }
        catch {
            // The selector may be valid but the element may not exist yet.
        }
        await page.waitForTimeout(50);
    }
    throw new Error(`Timed out waiting for a visible element matching selector "${selector}".`);
}
export const DEFAULT_WIDGET_PADDING = 32;
/**
 * Frames a widget for video: opaque card, centered, with `padding` pixels of
 * solid backdrop around it so the rest of the page is not in the shot.
 */
export async function focusElement(page, selector, padding = DEFAULT_WIDGET_PADDING) {
    const pad = Number.isFinite(padding) && padding >= 0 ? padding : DEFAULT_WIDGET_PADDING;
    await page.evaluate(({ sel }) => {
        const element = document.querySelector(sel);
        if (!element) {
            throw new Error(`focus target "${sel}" not found in the DOM.`);
        }
        const rect = element.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) {
            throw new Error(`focus target "${sel}" has no visible box on the page.`);
        }
        document.getElementById("capturist-focus-style")?.remove();
        document.getElementById("capturist-focus-backdrop")?.remove();
        let root = element;
        for (let index = 0; index < 6 && root.parentElement; index++) {
            const parent = root.parentElement;
            if (parent.querySelector("label, .fi-field-label, .fi-field-label-ctn")) {
                root = parent;
                break;
            }
            root = parent;
        }
        root.setAttribute("data-capturist-focus-root", "");
        element.setAttribute("data-capturist-focus", "");
        // Filament renders some field labels outside the select's wire component.
        // Copy the nearest real label into the composed stage so focused captures
        // identify the control instead of showing an unlabeled dropdown.
        if (!root.querySelector("label, .fi-field-label, .fi-field-label-ctn")) {
            const labels = Array.from(document.querySelectorAll("label, .fi-field-label, .fi-field-label-ctn"))
                .filter((candidate) => (candidate.textContent || "").trim());
            const source = labels.sort((a, b) => {
                const score = (candidate) => {
                    const box = candidate.getBoundingClientRect();
                    return Math.abs(box.bottom - rect.top) + Math.abs(box.left - rect.left) * 0.15;
                };
                return score(a) - score(b);
            })[0];
            if (source) {
                const label = document.createElement("div");
                label.textContent = (source.textContent || "").trim();
                label.setAttribute("data-capturist-focus-label", "");
                root.prepend(label);
            }
        }
        const backdrop = document.createElement("div");
        backdrop.id = "capturist-focus-backdrop";
        document.body.appendChild(backdrop);
        const style = document.createElement("style");
        style.id = "capturist-focus-style";
        style.textContent = [
            "html, body { overflow: hidden !important; background: #0f172a !important; }",
            "#capturist-focus-backdrop { position: fixed !important; inset: 0 !important; z-index: 2147483000 !important; background: #0f172a !important; pointer-events: none !important; }",
            "[data-capturist-focus-root], [data-capturist-focus-root] * { visibility: visible !important; }",
            "[data-capturist-focus-root] { display: block !important; position: fixed !important; left: 50% !important; top: 50% !important; transform: translate(-50%, -50%) !important; z-index: 2147483001 !important; width: min(560px, calc(100vw - 48px)) !important; padding: 24px !important; background: #fff !important; border-radius: 12px !important; box-shadow: 0 16px 40px rgba(0, 0, 0, .35) !important; }",
            "[data-capturist-focus-label] { display: block !important; margin: 0 0 8px !important; color: #111827 !important; font-size: 14px !important; font-weight: 600 !important; line-height: 20px !important; visibility: visible !important; }",
            "[data-capturist-focus-root] .fi-select-input { display: block !important; }",
            "[data-capturist-focus-root] .fi-select-input, [data-capturist-focus-root] .fi-select-input-btn { width: 100% !important; }",
            "[data-capturist-focus-root] .fi-select-input-btn { display: flex !important; min-height: 40px !important; border: 1px solid #d1d5db !important; border-radius: 8px !important; background: #fff !important; color: #6b7280 !important; }",
            "[role=\"listbox\"], [role=\"dialog\"], [role=\"menu\"], [data-popper-placement], .fi-select-panel, .fi-dropdown-panel, .fi-select-panel *, .fi-dropdown-panel * { visibility: visible !important; pointer-events: auto !important; }",
            "[role=\"listbox\"] input, .fi-select-panel input, .fi-dropdown-panel input { display: none !important; }",
            "[role=\"listbox\"], .fi-select-panel, .fi-dropdown-panel { position: fixed !important; left: 50% !important; top: calc(50% + 70px) !important; transform: translateX(-50%) !important; width: min(560px, calc(100vw - 48px)) !important; max-height: 320px !important; overflow: auto !important; z-index: 2147483002 !important; background: #fff !important; border-radius: 12px !important; box-shadow: 0 16px 40px rgba(0, 0, 0, .35) !important; }",
            "[role=\"listbox\"]::-webkit-scrollbar, .fi-select-panel::-webkit-scrollbar, .fi-dropdown-panel::-webkit-scrollbar { width: 10px !important; }",
            "[role=\"listbox\"]::-webkit-scrollbar-thumb, .fi-select-panel::-webkit-scrollbar-thumb, .fi-dropdown-panel::-webkit-scrollbar-thumb { background: #9ca3af !important; border-radius: 999px !important; }",
            ".capturist-scroll-track { display: none; position: absolute !important; top: 8px !important; right: 8px !important; bottom: 8px !important; width: 6px !important; border-radius: 999px !important; background: #e5e7eb !important; pointer-events: none !important; z-index: 4 !important; }",
            ".capturist-scroll-thumb { position: absolute !important; left: 0 !important; width: 100% !important; border-radius: 999px !important; background: #6b7280 !important; }",
        ].join("\n");
        document.head.appendChild(style);
        const addScrollCue = (panel) => {
            if (panel.querySelector(":scope > .capturist-scroll-track"))
                return;
            const track = document.createElement("div");
            track.className = "capturist-scroll-track";
            const thumb = document.createElement("div");
            thumb.className = "capturist-scroll-thumb";
            track.appendChild(thumb);
            panel.appendChild(track);
            const update = () => {
                const element = panel;
                const overflow = element.scrollHeight - element.clientHeight;
                track.style.display = overflow > 2 ? "block" : "none";
                if (overflow > 2) {
                    const ratio = element.clientHeight / element.scrollHeight;
                    thumb.style.height = `${Math.max(24, ratio * 100)}%`;
                    thumb.style.top = `${(element.scrollTop / overflow) * (100 - Math.max(24, ratio * 100))}%`;
                }
            };
            panel.addEventListener("scroll", update, { passive: true });
            new MutationObserver(update).observe(panel, { childList: true, subtree: true });
            if (typeof ResizeObserver !== "undefined")
                new ResizeObserver(update).observe(panel);
            update();
        };
        const attachScrollCues = () => {
            document.querySelectorAll('[role="listbox"], .fi-select-panel, .fi-dropdown-panel').forEach(addScrollCue);
        };
        attachScrollCues();
        new MutationObserver(attachScrollCues).observe(document.body, { childList: true, subtree: true });
    }, { sel: selector });
    await page.waitForTimeout(250);
}
function resolveStepOutput(output, outputDir) {
    if (path.isAbsolute(output)) {
        return output;
    }
    return path.resolve(outputDir || process.cwd(), output);
}
//# sourceMappingURL=steps.js.map