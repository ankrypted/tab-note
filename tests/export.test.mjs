import test from "node:test";
import assert from "node:assert/strict";
import { noteFilename, noteFileContents, noteDataUrl } from "../src/lib/export.js";

const day = new Date("2026-11-19T10:30:00Z");

test("filename is safe for Windows and carries the date", () => {
  assert.equal(noteFilename('Re: "Plan" / v2?', day), "Re Plan v2 - 2026-11-19.txt");
});

test("empty or reserved titles fall back to 'note'", () => {
  assert.equal(noteFilename("", day), "note - 2026-11-19.txt");
  assert.equal(noteFilename("CON", day), "note - 2026-11-19.txt");
});

test("long titles are trimmed", () => {
  assert.ok(noteFilename("a".repeat(200), day).length < 80);
});

test("file contents include title, url, date and the note with CRLF", () => {
  const out = noteFileContents({ title: "T", url: "https://e.com", text: "a\nb" }, day);
  assert.match(out, /^T\r\nhttps:\/\/e\.com\r\nSaved: 2026-11-19 10:30 UTC\r\n/);
  assert.ok(out.endsWith("a\r\nb\r\n"));
});

test("data url round-trips non-ASCII text", () => {
  const url = noteDataUrl("héllo ✓");
  assert.equal(decodeURIComponent(url.split(",")[1]), "héllo ✓");
});
