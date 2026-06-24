import { describe, it, expect } from "vitest";
import { formatDobAsPassword } from "@/lib/utils";

describe("formatDobAsPassword", () => {
  it("formats a date as DDMMYYYY with zero-padding and no separators", () => {
    expect(formatDobAsPassword(new Date("2026-06-16T00:00:00.000Z"))).toBe("16062026");
    expect(formatDobAsPassword(new Date("2005-01-05T00:00:00.000Z"))).toBe("05012005");
  });

  it("accepts an ISO date string the same way it accepts a Date", () => {
    expect(formatDobAsPassword("2026-06-16T00:00:00.000Z")).toBe("16062026");
  });

  it("uses UTC fields, matching the login password (dobToPassword in auth.ts)", () => {
    // Stored DOBs are date-only (midnight UTC); this must match what a
    // student actually types in as their password at login.
    const dob = new Date("1999-12-31T00:00:00.000Z");
    expect(formatDobAsPassword(dob)).toBe("31121999");
  });
});
