import * as path from "node:path";
import * as fs from "node:fs/promises";
import * as fsSync from "node:fs";

/**
 * Checks if a string is a fully qualified URL (starts with http:// or https://).
 */
export function isHttpUrl(target: string): boolean {
  return /^https?:\/\//i.test(target);
}

/**
 * Joins a baseUrl and a route safely, ensuring proper slash handling.
 *
 * @example
 * joinUrl("http://localhost:3000", "/projects") -> "http://localhost:3000/projects"
 * joinUrl("http://localhost:3000/app/", "talks") -> "http://localhost:3000/app/talks"
 */
export function joinUrl(baseUrl: string, route: string): string {
  if (isHttpUrl(route)) {
    return route;
  }
  if (!baseUrl) {
    throw new Error(`Cannot resolve relative route "${route}" without a configured baseUrl or server.`);
  }

  const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const pathPart = route.startsWith("/") ? route : `/${route}`;
  return `${base}${pathPart}`;
}

/**
 * Ensures an output directory exists recursively.
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * Ensures directory for a specific file path exists recursively.
 */
export async function ensureFileDirectory(filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

/**
 * Resolves an output file path relative to a base directory or working directory.
 */
export function resolveOutputPath(baseDir: string, relativeOrAbsolute: string): string {
  if (path.isAbsolute(relativeOrAbsolute)) {
    return relativeOrAbsolute;
  }
  return path.resolve(baseDir, relativeOrAbsolute);
}

/**
 * Formats byte counts into human-readable strings (e.g. "124.5 KB", "1.2 MB").
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = bytes / Math.pow(k, i);
  return `${val.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

/**
 * Checks if a file exists on disk synchronously.
 */
export function fileExistsSync(filePath: string): boolean {
  try {
    return fsSync.existsSync(filePath);
  } catch {
    return false;
  }
}
