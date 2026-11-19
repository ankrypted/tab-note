import test from "node:test";
import assert from "node:assert/strict";
import { normalizeUrl, displayUrl, isNotable } from "../src/lib/url.js";

test("drops hash and tracking params", () => {
  assert.equal(
    normalizeUrl("https://example.com/a?utm_source=x&id=2#top"),
    "https://example.com/a?id=2",
  );
});

test("same page, different param order, same key", () => {
  assert.equal(
    normalizeUrl("https://example.com/a?b=1&a=2"),
    normalizeUrl("https://example.com/a?a=2&b=1"),
  );
});

test("trailing slash is ignored except at the root", () => {
  assert.equal(normalizeUrl("https://example.com/a/"), "https://example.com/a");
  assert.equal(normalizeUrl("https://example.com/"), "https://example.com/");
});

test("non-web pages are not notable", () => {
  assert.equal(isNotable("chrome://extensions"), false);
  assert.equal(normalizeUrl("about:blank"), null);
  assert.equal(normalizeUrl("not a url"), null);
});

test("displayUrl is short and readable", () => {
  assert.equal(displayUrl("https://www.example.com/docs/x?y=1"), "example.com/docs/x");
});
