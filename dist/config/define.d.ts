import type { CapturistConfig } from "../types/index.js";
/**
 * Type-safe configuration helper function for `capturist.config.ts` or `capturist.config.js`.
 *
 * @example
 * ```ts
 * import { defineConfig } from "capturist";
 *
 * export default defineConfig({
 *   viewport: { width: 1200, height: 630 },
 *   pages: [
 *     { route: "/", output: "master-og-image.png" },
 *     { route: "/projects", output: "og/projects.png" },
 *   ]
 * });
 * ```
 */
export declare function defineConfig(config: CapturistConfig | (() => CapturistConfig | Promise<CapturistConfig>)): CapturistConfig | (() => CapturistConfig | Promise<CapturistConfig>);
//# sourceMappingURL=define.d.ts.map