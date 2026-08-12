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
    }, /provide one of "route"\/"url", "html", or "htmlFile"/);
  });

  test("accepts html and htmlFile pages without route", () => {
    const withHtml = validateConfig({
      pages: [
        {
          html: "<!DOCTYPE html><html><body>hi</body></html>",
          output: "card.png",
          label: "card",
        },
      ],
    });
    assert.equal(withHtml.pages[0].html?.includes("hi"), true);
    assert.equal(withHtml.pages[0].output, "card.png");
    assert.equal(withHtml.pages[0].label, "card");
    assert.ok(!withHtml.baseUrl);

    const withFile = validateConfig({
      pages: [{ htmlFile: "./cards/cover.html", output: "cover.png" }],
    });
    assert.equal(withFile.pages[0].htmlFile, "./cards/cover.html");
  });

  test("rejects mixing route with html", () => {
    assert.throws(() => {
      validateConfig({
        pages: [{ route: "/", html: "<html></html>", output: "x.png" }],
      });
    }, /either "route"\/"url" or "html"\/"htmlFile"/);
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

  test("resolves retina: true and scale: 2 to deviceScaleFactor: 2", () => {
    const configRetina = validateConfig({
      retina: true,
      pages: [{ route: "/", output: "og.png" }],
    });
    assert.equal(configRetina.viewport?.deviceScaleFactor, 2);
    assert.equal(configRetina.pages[0].viewport?.deviceScaleFactor, 2);

    const configScale = validateConfig({
      scale: 3,
      pages: [{ route: "/", output: "og.png" }],
    });
    assert.equal(configScale.viewport?.deviceScaleFactor, 3);
    assert.equal(configScale.pages[0].viewport?.deviceScaleFactor, 3);

    const configPageOverride = validateConfig({
      scale: 1,
      pages: [
        { route: "/", output: "1x.png" },
        { route: "/retina", output: "2x.png", retina: true },
        { route: "/ultra", output: "3x.png", scale: 3 },
      ],
    });
    assert.equal(configPageOverride.pages[0].viewport?.deviceScaleFactor, 1);
    assert.equal(configPageOverride.pages[1].viewport?.deviceScaleFactor, 2);
    assert.equal(configPageOverride.pages[2].viewport?.deviceScaleFactor, 3);
  });

  test("defineConfig passes through object correctly", () => {
    const conf = {
      pages: [{ route: "/", output: "og.png" }],
    };
    assert.equal(defineConfig(conf), conf);
  });
});
