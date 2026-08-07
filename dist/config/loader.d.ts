import type { SiteSnapConfig } from "../types/index.js";
export declare const CONFIG_CANDIDATES: string[];
/**
 * Finds the config file in the target directory or checks the specified custom path.
 */
export declare function resolveConfigFile(cwd: string, customPath?: string): string | null;
/**
 * Loads and executes a TypeScript or JavaScript config file.
 */
export declare function loadConfigFile(configPath: string): Promise<SiteSnapConfig>;
/**
 * Automatically locates, loads, and validates configuration.
 */
export declare function loadConfig(cwd?: string, customPath?: string): Promise<{
    config: SiteSnapConfig;
    configPath: string;
}>;
//# sourceMappingURL=loader.d.ts.map