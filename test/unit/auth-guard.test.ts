import { describe, it, expect } from "vitest";
import { requireAuth } from "@/lib/auth-guard";
import { setSession, sessionFor } from "../mocks/auth";

describe("requireAuth", () => {
  it("returns an 'unauthorized' error when signed out", async () => {
    setSession(null);
    const { session, error } = await requireAuth(["TEACHER"]);
    expect(error).toBe("unauthorized");
    expect(session).toBeNull();
  });

  it("returns a 'forbidden' error when the role is not allowed", async () => {
    setSession(sessionFor("STUDENT"));
    const { session, error } = await requireAuth(["TEACHER", "PRINCIPAL"]);
    expect(error).toBe("forbidden");
    expect(session).toBeNull();
  });

  it("passes through when the role is allowed", async () => {
    setSession(sessionFor("TEACHER"));
    const { session, error } = await requireAuth(["TEACHER", "PRINCIPAL"]);
    expect(error).toBeNull();
    expect(session?.user.role).toBe("TEACHER");
  });

  it("allows any authenticated role when no allow-list is given", async () => {
    setSession(sessionFor("MESS_MANAGER"));
    const { error } = await requireAuth();
    expect(error).toBeNull();
  });

  it("still rejects a signed-out request when no allow-list is given", async () => {
    setSession(null);
    const { error } = await requireAuth();
    expect(error).toBe("unauthorized");
  });
});
