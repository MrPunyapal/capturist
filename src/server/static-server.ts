import * as http from "node:http";
import * as fs from "node:fs/promises";
import * as fsSync from "node:fs";
import * as path from "node:path";
import type { StaticServerConfig } from "../types/index.js";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".txt": "text/plain; charset=utf-8",
};

export interface RunningServer {
  url: string;
  port: number;
  dir: string;
  close: () => Promise<void>;
}

/**
 * Starts a zero-dependency local static file server for testing static builds and SPA sites.
 */
export async function startStaticServer(
  serverConfig: StaticServerConfig,
  baseDir: string = process.cwd()
): Promise<RunningServer> {
  const rootDir = path.resolve(baseDir, serverConfig.dir);

  if (!fsSync.existsSync(rootDir)) {
    throw new Error(
      `Static server directory does not exist: "${rootDir}". Did you build your website first (e.g. npm run build)?`
    );
  }

  const server = http.createServer(async (req: http.IncomingMessage, res: http.ServerResponse) => {
    try {
      const parsedUrl = new URL(req.url || "/", "http://127.0.0.1");
      let pathname = decodeURIComponent(parsedUrl.pathname);

      if (pathname.endsWith("/")) {
        pathname += "index.html";
      }

      let filePath = path.join(rootDir, pathname);

      // Prevent directory traversal attacks
      if (!filePath.startsWith(rootDir)) {
        res.writeHead(403, { "Content-Type": "text/plain" });
        res.end("403 Forbidden");
        return;
      }

      // Check if file exists directly
      let stat: any;
      try {
        stat = await fs.stat(filePath);
      } catch {
        stat = null;
      }

      // If not found, try appending .html (clean URL routing, e.g. /projects -> /projects.html)
      if (!stat || stat.isDirectory()) {
        const htmlPath = `${filePath}.html`;
        try {
          const htmlStat = await fs.stat(htmlPath);
          if (htmlStat.isFile()) {
            filePath = htmlPath;
            stat = htmlStat;
          }
        } catch {}
      }

      // If still not found, check for index.html inside directory
      if (stat && stat.isDirectory()) {
        const nestedIndex = path.join(filePath, "index.html");
        try {
          const indexStat = await fs.stat(nestedIndex);
          if (indexStat.isFile()) {
            filePath = nestedIndex;
            stat = indexStat;
          }
        } catch {}
      }

      // If still not found, SPA fallback to root index.html
      if (!stat || !stat.isFile()) {
        const rootIndex = path.join(rootDir, "index.html");
        try {
          const rootIndexStat = await fs.stat(rootIndex);
          if (rootIndexStat.isFile()) {
            filePath = rootIndex;
            stat = rootIndexStat;
          }
        } catch {}
      }

      if (!stat || !stat.isFile()) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end(`404 Not Found: ${pathname}`);
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";
      const content = await fs.readFile(filePath);

      res.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": content.length,
        "Cache-Control": "no-cache",
      });
      res.end(content);
    } catch (err: any) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end(`500 Internal Server Error: ${err.message}`);
    }
  });

  const host = serverConfig.host || "127.0.0.1";
  const port = serverConfig.port || 0; // 0 chooses an available ephemeral port

  await new Promise<void>((resolve, reject) => {
    server.listen(port, host, () => resolve());
    server.once("error", reject);
  });

  const address = server.address();
  const actualPort = typeof address === "object" && address !== null ? address.port : port;
  const url = `http://${host}:${actualPort}`;

  return {
    url,
    port: actualPort,
    dir: rootDir,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err?: Error | null) => (err ? reject(err) : resolve()));
      }),
  };
}
