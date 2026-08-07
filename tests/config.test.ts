import { test, describe } from "node:test";
import * as assert from "node:assert/strict";
import { validateConfig, validateViewport } from "../dist/config/validate.js";
import { defineConfig } from "../dist/config/define.js";

describe("Config Validation & Normalization", () => {
  test("applies sensible defaults to minimal config", () => {
    const raw = {
      pages: [
        { route: "/", output: "master.png" },
        { route: "/projects", output: "projects.png" },
      ],
    };

    const config = validateConfig(raw);
    assert.equal(config.outputDir, "public");
    assert.equal(config.browser, "chromium");
    assert.equal(config.colorScheme, "light");
    assert.equal(config.disableAnimations, true);
    assert.equal(config.pages.length, 2);
    assert.equal(config.pages[0].route, "/");
    assert.equal(config.pages[0].output, "master.png");
    assert.equal(config.pages[0].type, "png");
    assert.equal(config.viewport?.width, 1200);
    assert.equal(config.viewport?.height, 630);
  });

  test("infers image format from output file extensions", () => {
    const raw = {
      pages: [
        { route: "/card", output: "card.jpg" },
        { route: "/hero", output: "hero.webp" },
        { route: "/thumb", output: "thumb.png" },
      ],
    };

    const config = validateConfig(raw);
    assert.equal(config.pages[0].type, "jpeg");
    assert.equal(config.pages[1].type, "webp");
    assert.equal(config.pages[2].type, "png");
  });

  test("throws on missing pages array", () => {
    assert.throws(() => {
      validateConfig({});
    }, /missing "pages" array/);
  });

  test("throws on empty pages array", () => {
    assert.throws(() => {
      validateConfig({ pages: [] });
    }, /"pages" array is empty/);
  });

  test("throws on missing route/output in page", () => {
    assert.throws(() => {
      validateConfig({ pages: [{ route: "/" }] });
    }, /missing required "output" filename/);

    assert.throws(() => {
      validateConfig({ pages: [{ output: "test.png" }] });
    }, /missing required "route" or "url"/);
  });

  test("validates custom viewport dimensions", () => {
    const vp = validateViewport({ width: 2400, height: 1260, deviceScaleFactor: 2 });
    assert.equal(vp.width, 2400);
    assert.equal(vp.height, 1260);
    assert.equal(vp.deviceScaleFactor, 2);

    assert.throws(() => {
      validateViewport({ width: -10, height: 100 });
    }, /positive number/);
  });

  test("defineConfig passes through object correctly", () => {
    const conf = {
      pages: [{ route: "/", output: "og.png" }],
    };
    assert.equal(defineConfig(conf), conf);
  });
});
