import { test, describe } from "node:test";
import * as assert from "node:assert/strict";
import { parseCliArgs } from "../dist/cli/args.js";

describe("CLI Argument Parsing", () => {
  test("parses custom config path", () => {
    const args1 = parseCliArgs(["--config", "./custom.config.ts"]);
    assert.equal(args1.config, "./custom.config.ts");

    const args2 = parseCliArgs(["-c", "og.config.js"]);
    assert.equal(args2.config, "og.config.js");

    const args3 = parseCliArgs(["--config=foo.config.json"]);
    assert.equal(args3.config, "foo.config.json");
  });

  test("parses baseUrl, outputDir, and concurrency", () => {
    const args = parseCliArgs([
      "--baseUrl",
      "http://localhost:5173",
      "--outputDir",
      "./dist/og",
      "--concurrency",
      "8",
      "--dry-run",
      "--verbose",
    ]);

    assert.equal(args.baseUrl, "http://localhost:5173");
    assert.equal(args.outputDir, "./dist/og");
    assert.equal(args.concurrency, 8);
    assert.equal(args.dryRun, true);
    assert.equal(args.verbose, true);
  });

  test("parses init, help, and version commands", () => {
    assert.equal(parseCliArgs(["init"]).init, true);
    assert.equal(parseCliArgs(["--help"]).help, true);
    assert.equal(parseCliArgs(["-h"]).help, true);
    assert.equal(parseCliArgs(["--version"]).version, true);
    assert.equal(parseCliArgs(["-v"]).version, true);
  });

  test("parses integrator flags: quiet, json, cwd", () => {
    const args = parseCliArgs([
      "--cwd",
      "./docs",
      "--quiet",
      "--json",
      "-c",
      "capturist.config.json",
    ]);
    assert.equal(args.cwd, "./docs");
    assert.equal(args.quiet, true);
    assert.equal(args.json, true);
    assert.equal(args.config, "capturist.config.json");

    assert.equal(parseCliArgs(["-q"]).quiet, true);
    assert.equal(parseCliArgs(["--cwd=./out"]).cwd, "./out");
  });
});
