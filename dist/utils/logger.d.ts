import type { ScreenshotResult, RunSummary } from "../types/index.js";
export declare class Logger {
    verbose: boolean;
    constructor(verbose?: boolean);
    banner(version?: string): void;
    info(msg: string): void;
    success(msg: string): void;
    warn(msg: string): void;
    error(msg: string, err?: unknown): void;
    debug(msg: string): void;
    logCapture(result: ScreenshotResult): void;
    summary(summary: RunSummary): void;
}
export declare const logger: Logger;
//# sourceMappingURL=logger.d.ts.map