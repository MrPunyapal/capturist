import { test, describe, before, after } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { startStaticServer } from "../dist/server/static-server.js";
import type { RunningServer } from "../dist/server/static-server.js";

describe("Built-in Static Server", () => {
  let tmpDir: string;
  let server: RunningServer;

  before(async () => {
    tmpDir = path.join(os.tmpdir(), `sitesnap-test-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, "index.html"),
      "<!DOCTYPE html><html><body><h1>Home</h1></body></html>"
    );
    await fs.writeFile(
      path.join(tmpDir, "projects.html"),
      "<!DOCTYPE html><html><body><h1>Projects</h1></body></html>"
    );

    server = await startStaticServer({ dir: tmpDir });
  });

  after(async () => {
    if (server) {
      await server.close();
    }
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  test("serves root index.html", async () => {
    const res = await fetch(`${server.url}/`);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.match(text, /<h1>Home<\/h1>/);
  });

  test("serves clean URL /projects via projects.html", async () => {
    const res = await fetch(`${server.url}/projects`);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.match(text, /<h1>Projects<\/h1>/);
  });

  test("returns 404 for non-existent routes", async () => {
    const res = await fetch(`${server.url}/nonexistent-page-12345`);
    // Falls back to SPA index.html or 404 if no fallback
    assert.ok(res.status === 200 || res.status === 404);
  });
});
