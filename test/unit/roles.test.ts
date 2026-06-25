import { describe, it, expect } from "vitest";
import { ROLES, ROLE_DASHBOARDS, ROLE_LABELS, ROLE_ALLOWED_PREFIXES, ROLE_PROFILE_PATHS, type AppRole } from "@/lib/roles";

const ALL_ROLES = Object.values(ROLES) as AppRole[];

describe("roles config", () => {
  it("defines exactly 12 roles", () => {
    expect(ALL_ROLES).toHaveLength(12);
  });

  it.each(ALL_ROLES)("has a dashboard, label, and allowed-prefix entry for %s", (role) => {
    expect(ROLE_DASHBOARDS[role]).toMatch(/^\//);
    expect(ROLE_LABELS[role]).toBeTruthy();
    expect(ROLE_ALLOWED_PREFIXES[role].length).toBeGreaterThan(0);
  });

  it("each role's dashboard lives under one of its allowed prefixes", () => {
    for (const role of ALL_ROLES) {
      const dash = ROLE_DASHBOARDS[role];
      const allowed = ROLE_ALLOWED_PREFIXES[role];
      expect(allowed.some((p) => dash.startsWith(p))).toBe(true);
    }
  });

  it("each role's profile path lives under one of its allowed prefixes", () => {
    for (const role of ALL_ROLES) {
      const profile = ROLE_PROFILE_PATHS[role];
      const allowed = ROLE_ALLOWED_PREFIXES[role];
      expect(profile).toMatch(/^\//);
      expect(allowed.some((p) => profile.startsWith(p))).toBe(true);
    }
  });

  it("allowed prefixes are mutually exclusive across roles (no cross-role access)", () => {
    for (const a of ALL_ROLES) {
      for (const b of ALL_ROLES) {
        if (a === b) continue;
        const overlap = ROLE_ALLOWED_PREFIXES[a].some((pa) =>
          ROLE_ALLOWED_PREFIXES[b].some((pb) => pa === pb),
        );
        expect(overlap, `${a} and ${b} share a prefix`).toBe(false);
      }
    }
  });
});
