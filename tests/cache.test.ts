import { test, describe, before, after } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { generateScreenshots } from "../dist/core/runner.js";
import { validateConfig } from "../dist/config/validate.js";
import {
  fingerprintPage,
  routeToStaticFile,
  partitionCachedPages,
  resolveCacheConfig,
  readCacheManifest,
} from "../dist/core/cache.js";
import { parseCliArgs } from "../dist/cli/args.js";

describe("Cache fingerprinting", () => {
  test("routeToStaticFile maps / to index.html", () => {
    const mapped = routeToStaticFile(path.join(os.tmpdir(), "site"), "/");
    assert.ok(mapped);
    assert.ok(mapped!.endsWith(`${path.sep}index.html`));
  });

  test("fingerprint changes when html content changes", () => {
    const base = validateConfig({
      outputDir: "public",
      pages: [{ html: "<html>one</html>", output: "a.png" }],
    });
    const h1 = fingerprintPage(base.pages[0], base, process.cwd());
    const changed = validateConfig({
      outputDir: "public",
      pages: [{ html: "<html>two</html>", output: "a.png" }],
    });
    const h2 = fingerprintPage(changed.pages[0], changed, process.cwd());
    assert.ok(h1);
    assert.ok(h2);
    assert.notEqual(h1, h2);
  });

  test("fingerprint is stable for identical html + settings", () => {
    const a = validateConfig({
      outputDir: "public",
      retina: true,
      pages: [{ html: "<html>stable</html>", output: "a.png", label: "x" }],
    });
    const b = validateConfig({
      outputDir: "public",
      retina: true,
      pages: [{ html: "<html>stable</html>", output: "a.png", label: "x" }],
    });
    assert.equal(
      fingerprintPage(a.pages[0], a, process.cwd()),
      fingerprintPage(b.pages[0], b, process.cwd())
    );
  });

  test("resolveCacheConfig respects force and --cache", () => {
    const config = validateConfig({
      outputDir: "out",
      cache: true,
      pages: [{ html: "<html></html>", output: "a.png" }],
    });
    const off = resolveCacheConfig(config, process.cwd(), { force: true });
    assert.equal(off.enabled, false);

    const noConfig = validateConfig({
      outputDir: "out",
      pages: [{ html: "<html></html>", output: "a.png" }],
    });
    const viaCli = resolveCacheConfig(noConfig, process.cwd(), { cache: true });
    assert.equal(viaCli.enabled, true);
    assert.ok(viaCli.path.includes(".capturist-cache.json"));
  });
});

describe("CLI cache flags", () => {
  test("parses --cache, --no-cache, --force", () => {
    assert.equal(parseCliArgs(["--cache"]).cache, true);
    assert.equal(parseCliArgs(["--no-cache"]).noCache, true);
    assert.equal(parseCliArgs(["--force"]).force, true);
    assert.equal(parseCliArgs(["-f"]).force, true);
  });
});

describe("Incremental capture with cache", () => {
  let tmpDir: string;

  before(async () => {
    tmpDir = path.join(os.tmpdir(), `capturist-cache-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });
  });

  after(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  test("second run skips Playwright when content is unchanged", async () => {
    const html = `<!DOCTYPE html><html><body style="margin:0;width:400px;height:200px;background:#123;color:#fff;font:24px sans-serif;display:flex;align-items:center;justify-content:center">cache-me</body></html>`;

    const config = validateConfig({
      outputDir: tmpDir,
      cache: true,
      viewport: { width: 400, height: 200 },
      pages: [{ html, output: "card.png", label: "card" }],
    });

    const first = await generateScreenshots(config, { cwd: tmpDir, quiet: true });
    assert.equal(first.succeeded, 1);
    assert.equal(first.captured, 1);
    assert.equal(first.cached, 0);
    assert.equal(first.results[0].cached, undefined);

    const out = path.join(tmpDir, "card.png");
    const stat1 = await fs.stat(out);
    assert.ok(stat1.size > 100);

    const second = await generateScreenshots(config, { cwd: tmpDir, quiet: true });
    assert.equal(second.succeeded, 1);
    assert.equal(second.captured, 0);
    assert.equal(second.cached, 1);
    assert.equal(second.results[0].cached, true);

    const manifest = readCacheManifest(path.join(tmpDir, ".capturist-cache.json"));
    assert.ok(manifest.entries["card.png"]?.hash);

    // Force recaptures
    const forced = await generateScreenshots(config, { cwd: tmpDir, quiet: true, force: true });
    assert.equal(forced.captured, 1);
    assert.equal(forced.cached, 0);
  });

  test("content change invalidates cache", async () => {
    const outDir = path.join(tmpDir, "bust");
    await fs.mkdir(outDir, { recursive: true });

    const mk = (body: string) =>
      validateConfig({
        outputDir: outDir,
        cache: true,
        viewport: { width: 300, height: 150 },
        pages: [
          {
            html: `<!DOCTYPE html><html><body style="margin:0;width:300px;height:150px;background:#000;color:#fff">${body}</body></html>`,
            output: "bust.png",
          },
        ],
      });

    await generateScreenshots(mk("v1"), { cwd: outDir, quiet: true });
    const hit = await generateScreenshots(mk("v1"), { cwd: outDir, quiet: true });
    assert.equal(hit.cached, 1);

    const miss = await generateScreenshots(mk("v2"), { cwd: outDir, quiet: true });
    assert.equal(miss.captured, 1);
    assert.equal(miss.cached, 0);
  });

  test("adopts existing PNG without recapture on first cache enable", async () => {
    const outDir = path.join(tmpDir, "adopt");
    await fs.mkdir(outDir, { recursive: true });
    const png = path.join(outDir, "existing.png");
    // minimal valid-ish binary stub — cache only checks existence + size later
    await fs.writeFile(png, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]));

    const config = validateConfig({
      outputDir: outDir,
      cache: { enabled: true, adopt: true },
      pages: [
        {
          html: `<!DOCTYPE html><html><body>existing</body></html>`,
          output: "existing.png",
        },
      ],
    });

    const summary = await generateScreenshots(config, { cwd: outDir, quiet: true });
    assert.equal(summary.captured, 0);
    assert.equal(summary.cached, 1);
    assert.equal(summary.results[0].cached, true);

    const manifest = readCacheManifest(path.join(outDir, ".capturist-cache.json"));
    assert.ok(manifest.entries["existing.png"]?.hash);
  });

  test("partition marks page.cache false as dirty", () => {
    const config = validateConfig({
      outputDir: tmpDir,
      cache: true,
      pages: [
        { html: "<html>a</html>", output: "a.png" },
        { html: "<html>b</html>", output: "b.png", cache: false },
      ],
    });
    const cache = resolveCacheConfig(config, tmpDir);
    // Pretend a.png is cached via partition without files — both dirty (no PNG)
    const part = partitionCachedPages(config, tmpDir, cache, tmpDir);
    assert.equal(part.dirty.length, 2);
    assert.ok(part.dirty.some((d) => d.page.output === "b.png"));
  });
});
