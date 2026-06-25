import { describe, it, expect } from "vitest";
import { daysBetweenInclusive, LEAVE_TYPE_LABELS, LEAVE_TYPES } from "@/lib/leave";

describe("daysBetweenInclusive", () => {
  it("counts a single-day leave as 1 day", () => {
    expect(daysBetweenInclusive(new Date("2026-06-22"), new Date("2026-06-22"))).toBe(1);
  });

  it("counts a multi-day range inclusively", () => {
    expect(daysBetweenInclusive(new Date("2026-06-22"), new Date("2026-06-24"))).toBe(3);
  });
});

describe("LEAVE_TYPE_LABELS / LEAVE_TYPES", () => {
  it("has a human label for every leave type key", () => {
    for (const type of LEAVE_TYPES) {
      expect(LEAVE_TYPE_LABELS[type]).toBeTruthy();
    }
  });

  it("matches the Prisma LeaveType enum values", () => {
    expect(LEAVE_TYPES.sort()).toEqual(["CASUAL", "EARNED", "MATERNITY", "OTHER", "PATERNITY", "SICK", "UNPAID"].sort());
  });
});
