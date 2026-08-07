import type { PageShotConfig } from "../types/index.js";
/**
 * Type-safe configuration helper function for `page-shot.config.ts` or `page-shot.config.js`.
 *
 * @example
 * ```ts
 * import { defineConfig } from "page-shot";
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
export declare function defineConfig(config: PageShotConfig | (() => PageShotConfig | Promise<PageShotConfig>)): PageShotConfig | (() => PageShotConfig | Promise<PageShotConfig>);
//# sourceMappingURL=define.d.ts.map