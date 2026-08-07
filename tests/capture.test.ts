import { test, describe, before, after } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { generateScreenshots } from "../dist/core/runner.js";
import { validateConfig } from "../dist/config/validate.js";

describe("End-to-End Screenshot Capture Engine", () => {
  let tmpSiteDir: string;
  let tmpOutputDir: string;

  before(async () => {
    tmpSiteDir = path.join(os.tmpdir(), `snapsite-site-${Date.now()}`);
    tmpOutputDir = path.join(os.tmpdir(), `snapsite-out-${Date.now()}`);

    await fs.mkdir(tmpSiteDir, { recursive: true });
    await fs.mkdir(tmpOutputDir, { recursive: true });

    // Create a mock website with multiple pages
    await fs.writeFile(
      path.join(tmpSiteDir, "index.html"),
      `<!DOCTYPE html>
<html>
  <head>
    <title>Home</title>
    <style>
      body { margin: 0; padding: 40px; font-family: sans-serif; background: #0f172a; color: white; }
      h1 { font-size: 48px; color: #38bdf8; }
      .badge { background: #1e293b; padding: 8px 16px; border-radius: 8px; border: 1px solid #334155; }
    </style>
  </head>
  <body>
    <h1>Punyapal Manvi</h1>
    <div class="badge" id="hero-badge">Full-Stack Engineer & Open Source Builder</div>
  </body>
</html>`
    );

    await fs.writeFile(
      path.join(tmpSiteDir, "projects.html"),
      `<!DOCTYPE html>
<html>
  <head>
    <title>Projects</title>
    <style>
      body { margin: 0; padding: 40px; font-family: sans-serif; background: #18181b; color: white; }
      h1 { font-size: 48px; color: #a855f7; }
    </style>
  </head>
  <body>
    <h1>Open Source Projects</h1>
  </body>
</html>`
    );
  });

  after(async () => {
    await fs.rm(tmpSiteDir, { recursive: true, force: true }).catch(() => {});
    await fs.rm(tmpOutputDir, { recursive: true, force: true }).catch(() => {});
  });

  test("generates static screenshots deterministically with built-in server", async () => {
    const config = validateConfig({
      server: {
        dir: tmpSiteDir,
      },
      outputDir: tmpOutputDir,
      viewport: {
        width: 1200,
        height: 630,
      },
      pages: [
        {
          route: "/",
          output: "master-og-image.png",
        },
        {
          route: "/projects",
          output: "og/projects.png",
        },
        {
          route: "/",
          output: "hero-badge.png",
          selector: "#hero-badge",
        },
      ],
    });

    const summary = await generateScreenshots(config, { cwd: tmpSiteDir });

    assert.equal(summary.total, 3);
    assert.equal(summary.succeeded, 3);
    assert.equal(summary.failed, 0);

    // Verify output files exist and are not empty
    const masterPath = path.join(tmpOutputDir, "master-og-image.png");
    const projectsPath = path.join(tmpOutputDir, "og", "projects.png");
    const badgePath = path.join(tmpOutputDir, "hero-badge.png");

    const masterStat = await fs.stat(masterPath);
    const projectsStat = await fs.stat(projectsPath);
    const badgeStat = await fs.stat(badgePath);

    assert.ok(masterStat.size > 1000, "master-og-image.png should be > 1KB");
    assert.ok(projectsStat.size > 1000, "projects.png should be > 1KB");
    assert.ok(badgeStat.size > 100, "hero-badge.png should be > 100 bytes");
  });
});
