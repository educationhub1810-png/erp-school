import { describe, it, expect, vi } from "vitest";
import { writeAuditLog, clientIp } from "@/lib/audit";
import { prismaMock } from "../mocks/prisma";

describe("clientIp", () => {
  it("takes the first IP from x-forwarded-for", () => {
    const req = new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } });
    expect(clientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip", () => {
    const req = new Request("http://x", { headers: { "x-real-ip": "9.9.9.9" } });
    expect(clientIp(req)).toBe("9.9.9.9");
  });

  it("returns null when no IP headers are present", () => {
    expect(clientIp(new Request("http://x"))).toBeNull();
  });
});

describe("writeAuditLog", () => {
  it("persists an entry, JSON-stringifying metadata", async () => {
    prismaMock.auditLog.create.mockResolvedValue({} as never);
    await writeAuditLog({
      action: "LOGIN_SUCCESS",
      actorId: "u1",
      actorRole: "TEACHER",
      metadata: { foo: "bar" },
    });
    expect(prismaMock.auditLog.create).toHaveBeenCalledOnce();
    const arg = prismaMock.auditLog.create.mock.calls[0][0];
    expect(arg.data.action).toBe("LOGIN_SUCCESS");
    expect(arg.data.metadata).toBe(JSON.stringify({ foo: "bar" }));
  });

  it("never throws when the DB write fails (best-effort logging)", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    prismaMock.auditLog.create.mockRejectedValue(new Error("db down"));
    await expect(writeAuditLog({ action: "BUG_DELETE" })).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
