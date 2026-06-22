import { describe, it, expect } from "vitest";
import { AUDIT_ACTION_META, AUDIT_FILTERABLE_ACTIONS, actionMeta } from "@/lib/audit-actions";

describe("audit-actions", () => {
  it("returns metadata for a known action", () => {
    const meta = actionMeta("LOGIN_SUCCESS");
    expect(meta.label).toBe("Login");
    expect(meta.category).toBe("AUTH");
    expect(meta.badge).toContain("green");
  });

  it("humanizes unknown actions with a sensible fallback", () => {
    const meta = actionMeta("SOME_NEW_ACTION");
    expect(meta.label).toBe("some new action");
    expect(meta.category).toBe("SECURITY");
    expect(meta.badge).toBeTruthy();
  });

  it("has metadata for every filterable action (no missing chips)", () => {
    for (const action of AUDIT_FILTERABLE_ACTIONS) {
      expect(AUDIT_ACTION_META[action], `missing meta for ${action}`).toBeDefined();
    }
  });
});
