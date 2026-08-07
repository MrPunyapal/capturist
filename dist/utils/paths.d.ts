/**
 * Checks if a string is a fully qualified URL (starts with http:// or https://).
 */
export declare function isHttpUrl(target: string): boolean;
/**
 * Joins a baseUrl and a route safely, ensuring proper slash handling.
 *
 * @example
 * joinUrl("http://localhost:3000", "/projects") -> "http://localhost:3000/projects"
 * joinUrl("http://localhost:3000/app/", "talks") -> "http://localhost:3000/app/talks"
 */
export declare function joinUrl(baseUrl: string, route: string): string;
/**
 * Ensures an output directory exists recursively.
 */
export declare function ensureDirectory(dirPath: string): Promise<void>;
/**
 * Ensures directory for a specific file path exists recursively.
 */
export declare function ensureFileDirectory(filePath: string): Promise<void>;
/**
 * Resolves an output file path relative to a base directory or working directory.
 */
export declare function resolveOutputPath(baseDir: string, relativeOrAbsolute: string): string;
/**
 * Formats byte counts into human-readable strings (e.g. "124.5 KB", "1.2 MB").
 */
export declare function formatBytes(bytes: number): string;
/**
 * Checks if a file exists on disk synchronously.
 */
export declare function fileExistsSync(filePath: string): boolean;
//# sourceMappingURL=paths.d.ts.map