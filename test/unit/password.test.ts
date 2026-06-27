import { describe, it, expect } from "vitest";
import { generatePassword } from "@/lib/password";

describe("generatePassword", () => {
  it("defaults to 14 characters and honours a requested length", () => {
    expect(generatePassword()).toHaveLength(14);
    expect(generatePassword(20)).toHaveLength(20);
  });

  it("never returns fewer than 8 characters even when asked for less", () => {
    expect(generatePassword(4).length).toBeGreaterThanOrEqual(8);
  });

  it("includes at least one lowercase, uppercase, digit, and symbol", () => {
    for (let i = 0; i < 50; i++) {
      const pw = generatePassword();
      expect(pw).toMatch(/[a-z]/);
      expect(pw).toMatch(/[A-Z]/);
      expect(pw).toMatch(/[0-9]/);
      expect(pw).toMatch(/[!@#$%&*?]/);
    }
  });

  it("omits ambiguous characters (0, O, 1, l, I)", () => {
    for (let i = 0; i < 50; i++) {
      expect(generatePassword()).not.toMatch(/[0O1lI]/);
    }
  });

  it("produces distinct values across calls", () => {
    const seen = new Set(Array.from({ length: 100 }, () => generatePassword()));
    expect(seen.size).toBe(100);
  });
});
