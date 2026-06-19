import { describe, it, expect } from "vitest";
import { secureEquals } from "@/lib/secure-compare";

describe("secureEquals", () => {
  it("returns true for identical strings", () => {
    expect(secureEquals("s3cr3t-token", "s3cr3t-token")).toBe(true);
  });

  it("returns false for different strings", () => {
    expect(secureEquals("s3cr3t-token", "s3cr3t-tokeX")).toBe(false);
  });

  it("returns false when lengths differ (no throw despite length mismatch)", () => {
    expect(secureEquals("short", "a-much-longer-secret-value")).toBe(false);
  });

  it.each([
    [undefined, "x"],
    ["x", undefined],
    [null, "x"],
    ["x", null],
    ["", "x"],
    ["x", ""],
  ])("returns false when an input is missing (%s, %s)", (a, b) => {
    expect(secureEquals(a as string, b as string)).toBe(false);
  });
});
