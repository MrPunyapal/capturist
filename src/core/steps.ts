import * as path from "node:path";
import * as fs from "node:fs/promises";
import type { Page } from "playwright-core";
import type { RecordStep } from "../types/index.js";
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
export function validateSteps(value: unknown): { steps: RecordStep[]; error?: string } {
  if (value === null || typeof value !== "object") {
    return { steps: [], error: "Steps must be a JSON array or an object with a \"steps\" array." };
  }

  const raw = Array.isArray(value) ? value : (value as Record<string, unknown>).steps;

  if (!Array.isArray(raw)) {
    return { steps: [], error: "Steps must be a JSON array or an object with a \"steps\" array." };
  }

  const steps: RecordStep[] = [];

  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    const where = `steps[${i}]`;

    if (item === null || typeof item !== "object") {
      return { steps: [], error: `${where} must be an object.` };
    }

    const step = item as Record<string, unknown>;

    if (typeof step.action !== "string" || !KNOWN_ACTIONS.has(step.action)) {
      return {
        steps: [],
        error: `${where}.action "${String(step.action)}" is not a known action. Known actions: ${[...KNOWN_ACTIONS].join(", ")}.`,
      };
    }

    const action = step.action;
    const requireSelector = (field = "selector"): string | null =>
      typeof step[field] === "string" && (step[field] as string).length > 0
        ? null
        : `${where} requires a non-empty "${field}" string.`;

    let problem: string | null = null;

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
        const hasMs = typeof step.ms === "number" && Number.isFinite(step.ms) && (step.ms as number) >= 0;
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
    steps.push(step as unknown as RecordStep);
  }

  return { steps };
}

/**
 * Executes declarative interaction steps against the page, in order.
 *
 * @returns The number of executed steps.
 */
export async function executeSteps(
  page: Page,
  steps: RecordStep[],
  options: { outputDir?: string; baseUrl?: string } = {}
): Promise<number> {
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    try {
      await executeStep(page, step, options);
    } catch (err) {
      throw new Error(`Step ${i + 1}/${steps.length} (${step.action}) failed: ${(err as Error)?.message || err}`);
    }
  }

  return steps.length;
}

async function executeStep(
  page: Page,
  step: RecordStep,
  options: { outputDir?: string; baseUrl?: string }
): Promise<void> {
  switch (step.action) {
    case "goto": {
      const target = joinUrl(options.baseUrl || "", step.url);
      await page.goto(target, { waitUntil: "load", timeout: 30000 });
      break;
    }
    case "click":
      await page.click(step.selector);
      break;
    case "dblclick":
      await page.dblclick(step.selector);
      break;
    case "hover":
      await page.hover(step.selector);
      break;
    case "fill":
      await page.fill(step.selector, step.value);
      break;
    case "type":
      await page.type(step.selector, step.text, { delay: step.delay ?? 25 });
      break;
    case "press":
      if (step.selector) {
        await page.press(step.selector, step.key);
      } else {
        await page.keyboard.press(step.key);
      }
      break;
    case "scroll":
      if (step.selector) {
        await page.locator(step.selector).first().scrollIntoViewIfNeeded();
      } else {
        await page.mouse.wheel(step.x ?? 0, step.y ?? 0);
      }
      break;
    case "wait":
      if (step.selector) {
        await page.waitForSelector(step.selector, { state: "visible" });
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
      await focusElement(page, step.selector);
      break;
  }
}

/**
 * Pins an element to fill the viewport so the recording frames just that
 * widget: position fixed over everything else, page scroll locked. Applied
 * mid-recording via the `focus` step (e.g. after opening a dropdown).
 */
async function focusElement(page: Page, selector: string): Promise<void> {
  await page.evaluate((sel: string) => {
    const element = document.querySelector(sel);

    if (!element) {
      throw new Error(`focus target "${sel}" not found in the DOM.`);
    }

    const previous = document.getElementById("capturist-focus-style");
    previous?.remove();

    const style = document.createElement("style");
    style.id = "capturist-focus-style";
    style.textContent = [
      "html, body { overflow: hidden !important; }",
      `${sel} {`,
      "  position: fixed !important;",
      "  inset: 0 !important;",
      "  width: 100vw !important;",
      "  max-height: 100vh !important;",
      "  z-index: 2147483647 !important;",
      "  background: #fff !important;",
      "  overflow: auto !important;",
      "  margin: 0 !important;",
      "}",
    ].join("\n");
    document.head.appendChild(style);

    element.scrollIntoView({ block: "start", inline: "start" });
  }, selector);

  await page.waitForTimeout(150);
}

function resolveStepOutput(output: string, outputDir?: string): string {
  if (path.isAbsolute(output)) {
    return output;
  }
  return path.resolve(outputDir || process.cwd(), output);
}
