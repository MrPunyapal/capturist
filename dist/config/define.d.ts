import type { SiteSnapConfig } from "../types/index.js";
/**
 * Type-safe configuration helper function for `sitesnap.config.ts` or `sitesnap.config.js`.
 *
 * @example
 * ```ts
 * import { defineConfig } from "sitesnap";
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
export declare function defineConfig(config: SiteSnapConfig | (() => SiteSnapConfig | Promise<SiteSnapConfig>)): SiteSnapConfig | (() => SiteSnapConfig | Promise<SiteSnapConfig>);
//# sourceMappingURL=define.d.ts.map