import test from "node:test";
import assert from "node:assert/strict";
import { displayUrl } from "../src/lib/url.js";

test("displayUrl is short and readable", () => {
  assert.equal(displayUrl("https://www.example.com/docs/x?y=1"), "example.com/docs/x");
  assert.equal(displayUrl("https://example.com/"), "example.com");
});

test("displayUrl leaves non-web and bad input alone", () => {
  assert.equal(displayUrl("brave://settings"), "brave://settings");
  assert.equal(displayUrl(undefined), "");
});
