import { describe, expect, it } from "vitest";
import { noteDataUrl, noteFileContents, noteFilename } from "../src/lib/export";

const day = new Date("2026-11-19T10:30:00Z");

describe("noteFilename", () => {
  it("is safe for Windows and carries the date", () => {
    expect(noteFilename('Re: "Plan" / v2?', day)).toBe("Re Plan v2 - 2026-11-19.txt");
  });

  it("falls back to 'note' for empty, missing or reserved titles", () => {
    expect(noteFilename("", day)).toBe("note - 2026-11-19.txt");
    expect(noteFilename(undefined, day)).toBe("note - 2026-11-19.txt");
    expect(noteFilename("CON", day)).toBe("note - 2026-11-19.txt");
  });

  it("trims long titles", () => {
    expect(noteFilename("a".repeat(200), day).length).toBeLessThan(80);
  });

  it("uses today's date by default", () => {
    expect(noteFilename("x")).toMatch(/^x - \d{4}-\d{2}-\d{2}\.txt$/);
  });
});

describe("noteFileContents", () => {
  it("includes title, url, date and the note, with Windows line endings", () => {
    const out = noteFileContents({ title: "T", url: "https://e.com", text: "a\nb" }, day);
    expect(out).toMatch(/^T\r\nhttps:\/\/e\.com\r\nSaved: 2026-11-19 10:30 UTC\r\n/);
    expect(out.endsWith("a\r\nb\r\n")).toBe(true);
  });

  it("copes with a missing title and url", () => {
    const out = noteFileContents({ text: "x" }, day);
    expect(out.startsWith("(untitled)\r\n\r\n")).toBe(true);
  });

  it("uses today's date by default", () => {
    expect(noteFileContents({ text: "x" })).toMatch(/Saved: \d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC/);
  });
});

describe("noteDataUrl", () => {
  it("round-trips non-ASCII text", () => {
    const url = noteDataUrl("héllo ✓");
    expect(decodeURIComponent(url.split(",")[1] ?? "")).toBe("héllo ✓");
  });
});
