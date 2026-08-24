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
 * @returns The number of executed steps.
 */
export declare function executeSteps(page: Page, steps: RecordStep[], options?: {
    outputDir?: string;
    baseUrl?: string;
}): Promise<number>;
//# sourceMappingURL=steps.d.ts.map