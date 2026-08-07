import { test, describe } from "node:test";
import * as assert from "node:assert/strict";
import { joinUrl, formatBytes, isHttpUrl } from "../dist/utils/paths.js";

describe("Path and URL Utilities", () => {
  test("joins base URL and routes correctly", () => {
    assert.equal(joinUrl("http://localhost:3000", "/"), "http://localhost:3000/");
    assert.equal(joinUrl("http://localhost:3000", "/projects"), "http://localhost:3000/projects");
    assert.equal(joinUrl("http://localhost:3000/", "projects"), "http://localhost:3000/projects");
    assert.equal(joinUrl("http://localhost:3000/app/", "/talks"), "http://localhost:3000/app/talks");
  });

  test("passes through absolute HTTP URLs untouched", () => {
    assert.equal(
      joinUrl("http://localhost:3000", "https://example.com/page"),
      "https://example.com/page"
    );
  });

  test("detects HTTP URLs", () => {
    assert.equal(isHttpUrl("https://example.com"), true);
    assert.equal(isHttpUrl("http://127.0.0.1:8080"), true);
    assert.equal(isHttpUrl("/projects"), false);
  });

  test("formats byte sizes accurately", () => {
    assert.equal(formatBytes(0), "0 B");
    assert.equal(formatBytes(1024), "1.0 KB");
    assert.equal(formatBytes(1048576), "1.0 MB");
  });
});
