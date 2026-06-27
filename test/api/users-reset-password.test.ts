import { describe, it, expect, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { POST } from "@/app/api/v1/users/[id]/reset-password/route";
import { prismaMock } from "../mocks/prisma";
import { setSession, sessionFor } from "../mocks/auth";
import { buildRequest, callRoute, paramsCtx } from "../helpers/request";
import { expectRbac } from "../helpers/rbac";
import { makeUser } from "../helpers/factories";

const path = "/api/v1/users/u1/reset-password";

function reqBody(body: unknown) {
  return buildRequest(path, { method: "POST", body });
}

beforeEach(() => {
  prismaMock.user.findUnique.mockResolvedValue(makeUser({ id: "u1", role: "TEACHER" }) as never);
  prismaMock.user.update.mockResolvedValue(makeUser({ id: "u1" }) as never);
});

describe("POST /api/v1/users/[id]/reset-password", () => {
  it("enforces RBAC (Super Admin only)", async () => {
    await expectRbac(
      POST,
      ["SUPER_ADMIN"],
      () => reqBody({ mode: "generate" }),
      paramsCtx({ id: "u1" }),
    );
  });

  it("400s when set mode is given a password shorter than 6 chars", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    const res = await callRoute(POST, reqBody({ mode: "set", password: "abc" }), paramsCtx({ id: "u1" }));
    expect(res.status).toBe(400);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("404s when the target user does not exist", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    prismaMock.user.findUnique.mockResolvedValue(null as never);
    const res = await callRoute(POST, reqBody({ mode: "generate" }), paramsCtx({ id: "missing" }));
    expect(res.status).toBe(404);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("sets the supplied password, hashing it before storing", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    const res = await callRoute(POST, reqBody({ mode: "set", password: "s3cret-pass" }), paramsCtx({ id: "u1" }));
    expect(res.status).toBe(200);

    const args = prismaMock.user.update.mock.calls[0][0]!;
    expect((args.where as { id: string }).id).toBe("u1");
    const hash = (args.data as { passwordHash: string }).passwordHash;
    expect(hash).not.toBe("s3cret-pass"); // never stored in plaintext
    expect(await bcrypt.compare("s3cret-pass", hash)).toBe(true);
    // The plaintext is returned once so the admin can share it.
    expect(res.body.data).toMatchObject({ id: "u1", password: "s3cret-pass" });
  });

  it("generates a strong random password when mode is generate", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    const res = await callRoute(POST, reqBody({ mode: "generate" }), paramsCtx({ id: "u1" }));
    expect(res.status).toBe(200);

    const generated = (res.body.data as { password: string }).password;
    expect(generated.length).toBeGreaterThanOrEqual(8);

    const hash = (prismaMock.user.update.mock.calls[0][0]!.data as { passwordHash: string }).passwordHash;
    expect(await bcrypt.compare(generated, hash)).toBe(true);
  });

  it("can reset another Super Admin's password", async () => {
    setSession(sessionFor("SUPER_ADMIN"));
    prismaMock.user.findUnique.mockResolvedValue(makeUser({ id: "u1", role: "SUPER_ADMIN", schoolId: null }) as never);
    const res = await callRoute(POST, reqBody({ mode: "generate" }), paramsCtx({ id: "u1" }));
    expect(res.status).toBe(200);
    expect(prismaMock.user.update).toHaveBeenCalled();
  });
});
