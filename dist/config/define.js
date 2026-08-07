/**
 * Type-safe configuration helper function for `snapsite.config.ts` or `snapsite.config.js`.
 *
 * @example
 * ```ts
 * import { defineConfig } from "snapsite";
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
export function defineConfig(config) {
    return config;
}
//# sourceMappingURL=define.js.map