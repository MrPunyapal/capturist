import type { Page } from "playwright-core";
import type { RecordStep } from "../types/index.js";
/**
 * Validates an untrusted value (e.g. parsed from a JSON steps file) as a
 * RecordStep array. Returns a human-readable problem instead of throwing.
 */
export declare function validateSteps(value: unknown): {
    steps: RecordStep[];
    error?: string;
};
/**
 * Executes declarative interaction steps against the page, in order.
 *
 * When `options.pace` is set, that many milliseconds are inserted after every
 * step except the last so recordings stay followable.
 *
 * @returns The number of executed steps.
 */
export declare function executeSteps(page: Page, steps: RecordStep[], options?: {
    outputDir?: string;
    baseUrl?: string;
    pace?: number;
    padding?: number;
}): Promise<number>;
export declare const DEFAULT_WIDGET_PADDING = 32;
/**
 * Frames a widget for video: opaque card, centered, with `padding` pixels of
 * solid backdrop around it so the rest of the page is not in the shot.
 */
export declare function focusElement(page: Page, selector: string, padding?: number): Promise<void>;
//# sourceMappingURL=steps.d.ts.map