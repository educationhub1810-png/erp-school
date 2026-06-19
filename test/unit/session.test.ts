import { describe, it, expect } from "vitest";
import { getUser } from "@/lib/session";

describe("getUser", () => {
  it("returns the typed user object from a session", () => {
    const session = { user: { id: "u1", name: "A", role: "TEACHER", schoolId: "s1" } };
    const user = getUser(session);
    expect(user.id).toBe("u1");
    expect(user.role).toBe("TEACHER");
    expect(user.schoolId).toBe("s1");
  });
});
