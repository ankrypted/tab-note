import { describe, expect, it } from "vitest";
import { displayUrl } from "../src/lib/url";

describe("displayUrl", () => {
  it("is short and readable", () => {
    expect(displayUrl("https://www.example.com/docs/x?y=1")).toBe("example.com/docs/x");
    expect(displayUrl("https://example.com/")).toBe("example.com");
  });

  it("leaves non-web URLs alone", () => {
    expect(displayUrl("brave://settings")).toBe("brave://settings");
  });

  it("returns an empty string for missing input and passes through unparsable text", () => {
    expect(displayUrl(undefined)).toBe("");
    expect(displayUrl("")).toBe("");
    expect(displayUrl("not a url")).toBe("not a url");
  });
});
