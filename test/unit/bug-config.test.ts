import { describe, it, expect } from "vitest";
import {
  BUG_STATUSES,
  BUG_PRIORITIES,
  BUG_STATUS_LABELS,
  BUG_STATUS_ACCENT,
  BUG_PRIORITY_LABELS,
  BUG_PRIORITY_BADGE,
} from "@/lib/bug-config";

describe("bug-config", () => {
  it("has a label + accent for every status", () => {
    for (const s of BUG_STATUSES) {
      expect(BUG_STATUS_LABELS[s]).toBeTruthy();
      expect(BUG_STATUS_ACCENT[s]).toBeTruthy();
    }
  });

  it("has a label + badge for every priority", () => {
    for (const p of BUG_PRIORITIES) {
      expect(BUG_PRIORITY_LABELS[p]).toBeTruthy();
      expect(BUG_PRIORITY_BADGE[p]).toBeTruthy();
    }
  });

  it("covers the four board columns and three priorities", () => {
    expect(BUG_STATUSES).toEqual(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]);
    expect(BUG_PRIORITIES).toEqual(["LOW", "MEDIUM", "HIGH"]);
  });
});
