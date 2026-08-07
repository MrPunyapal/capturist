import type { StaticServerConfig } from "../types/index.js";
export interface RunningServer {
    url: string;
    port: number;
    dir: string;
    close: () => Promise<void>;
}
/**
 * Starts a zero-dependency local static file server for testing static builds and SPA sites.
 */
export declare function startStaticServer(serverConfig: StaticServerConfig, baseDir?: string): Promise<RunningServer>;
//# sourceMappingURL=static-server.d.ts.map