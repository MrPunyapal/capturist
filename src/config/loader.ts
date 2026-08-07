import * as path from "node:path";
import * as fs from "node:fs/promises";
import * as fsSync from "node:fs";
import { pathToFileURL } from "node:url";
import type { SiteSnapConfig } from "../types/index.js";
import { validateConfig } from "./validate.js";

export const CONFIG_CANDIDATES = [
  "sitesnap.config.ts",
  "sitesnap.config.js",
  "sitesnap.config.mjs",
  "sitesnap.config.cjs",
  "sitesnap.config.json",
];

/**
 * Finds the config file in the target directory or checks the specified custom path.
 */
export function resolveConfigFile(cwd: string, customPath?: string): string | null {
  if (customPath) {
    const resolved = path.isAbsolute(customPath) ? customPath : path.resolve(cwd, customPath);
    if (fsSync.existsSync(resolved)) {
      return resolved;
    }
    throw new Error(`Specified config file not found: "${customPath}" (resolved to "${resolved}")`);
  }

  for (const candidate of CONFIG_CANDIDATES) {
    const candidatePath = path.resolve(cwd, candidate);
    if (fsSync.existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  return null;
}

/**
 * Loads and executes a TypeScript or JavaScript config file.
 */
export async function loadConfigFile(configPath: string): Promise<SiteSnapConfig> {
  const ext = path.extname(configPath).toLowerCase();

  let rawConfig: any;

  if (ext === ".json") {
    const content = await fs.readFile(configPath, "utf-8");
    rawConfig = JSON.parse(content);
  } else if (ext === ".ts") {
    // For TypeScript config files, try dynamic import first (supported in Node 22+ with type stripping or tsx/tsx-like loaders)
    try {
      const fileUrl = `${pathToFileURL(configPath).href}?t=${Date.now()}`;
      const imported = await import(fileUrl);
      rawConfig = imported.default || imported.config || imported;
    } catch {
      // Fallback: transpile TypeScript on the fly using simple regex/eval or ts-node/tsx if available, or try reading standard JS syntax
      const code = await fs.readFile(configPath, "utf-8");
      // Remove type imports and simple TS type annotations if running in standard Node
      const stripped = code
        .replace(/import\s+type\s+.*?from\s+['"].*?['"];?/g, "")
        .replace(/:\s*SiteSnapConfig/g, "")
        .replace(/:\s*PageConfig\[\]/g, "")
        .replace(/:\s*Viewport/g, "");

      const tmpFile = path.resolve(
        path.dirname(configPath),
        `.sitesnap.tmp.${Date.now()}.mjs`
      );
      try {
        await fs.writeFile(tmpFile, stripped, "utf-8");
        const imported = await import(`${pathToFileURL(tmpFile).href}`);
        rawConfig = imported.default || imported.config || imported;
      } finally {
        await fs.unlink(tmpFile).catch(() => {});
      }
    }
  } else {
    // .js, .mjs, .cjs
    const fileUrl = `${pathToFileURL(configPath).href}?t=${Date.now()}`;
    const imported = await import(fileUrl);
    rawConfig = imported.default || imported.config || imported;
  }

  // Handle function config export: export default defineConfig(() => ({ ... }))
  if (typeof rawConfig === "function") {
    rawConfig = await rawConfig();
  }

  return validateConfig(rawConfig);
}

/**
 * Automatically locates, loads, and validates configuration.
 */
export async function loadConfig(
  cwd: string = process.cwd(),
  customPath?: string
): Promise<{ config: SiteSnapConfig; configPath: string }> {
  const resolvedPath = resolveConfigFile(cwd, customPath);
  if (!resolvedPath) {
    throw new Error(
      `No sitesnap configuration file found in "${cwd}". Create a "sitesnap.config.ts" or "sitesnap.config.js" or use "sitesnap init".`
    );
  }

  const config = await loadConfigFile(resolvedPath);
  return { config, configPath: resolvedPath };
}
