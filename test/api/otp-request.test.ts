import { describe, it, expect, beforeEach, vi } from "vitest";
import bcrypt from "bcryptjs";
import { prismaMock } from "../mocks/prisma";
import { buildRequest, callRoute } from "../helpers/request";

// Don't hit real SMTP — assert the route asks to send a code.
const sendOtpEmailMock = vi.fn();
vi.mock("@/lib/mailer", () => ({ sendOtpEmail: (...a: unknown[]) => sendOtpEmailMock(...a) }));

import { POST } from "@/app/api/auth/otp/request/route";

const path = "/api/auth/otp/request";

function req(body: unknown) {
  return buildRequest(path, { method: "POST", body });
}

async function mockAdmin() {
  const passwordHash = await bcrypt.hash("Admin@123", 12);
  prismaMock.user.findFirst.mockResolvedValue({
    id: "admin1",
    name: "Boss",
    email: "admin@sch001.com",
    role: "SCHOOL_ADMIN",
    schoolId: "school-1",
    passwordHash,
  } as never);
}

beforeEach(() => {
  sendOtpEmailMock.mockReset();
  prismaMock.loginOtp.findFirst.mockResolvedValue(null as never);
  prismaMock.loginOtp.deleteMany.mockResolvedValue({ count: 0 } as never);
  prismaMock.loginOtp.create.mockResolvedValue({} as never);
  prismaMock.auditLog.create.mockResolvedValue({} as never);
});

describe("POST /api/auth/otp/request", () => {
  it("400s on an invalid body", async () => {
    const res = await callRoute(POST, req({ role: "SUPER_ADMIN" })); // missing username/password
    expect(res.status).toBe(400);
    expect(prismaMock.loginOtp.create).not.toHaveBeenCalled();
  });

  it("issues and emails a code for a valid admin login", async () => {
    await mockAdmin();
    const res = await callRoute(POST, req({
      role: "SCHOOL_ADMIN",
      username: "admin@sch001.com",
      password: "Admin@123",
    }));

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ requires2fa: true });

    // A hashed (never plaintext) code is stored against the user with an expiry.
    expect(prismaMock.loginOtp.create).toHaveBeenCalledOnce();
    const data = prismaMock.loginOtp.create.mock.calls[0][0]!.data as {
      userId: string; codeHash: string; expiresAt: Date;
    };
    expect(data.userId).toBe("admin1");
    expect(data.codeHash).not.toMatch(/^\d{6}$/);
    expect(data.expiresAt.getTime()).toBeGreaterThan(Date.now());

    // The plaintext code is emailed to the admin's address.
    expect(sendOtpEmailMock).toHaveBeenCalledOnce();
    expect(sendOtpEmailMock.mock.calls[0][0]).toBe("admin@sch001.com");
    expect(String(sendOtpEmailMock.mock.calls[0][1])).toMatch(/^\d{6}$/);
  });

  it("does not require 2FA (no code) for a non-admin role", async () => {
    const res = await callRoute(POST, req({
      role: "TEACHER",
      username: "EMP001",
      password: "01012000",
    }));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ requires2fa: false });
    expect(prismaMock.loginOtp.create).not.toHaveBeenCalled();
    expect(sendOtpEmailMock).not.toHaveBeenCalled();
  });

  it("hides a wrong admin password as requires2fa:false (no enumeration, no email)", async () => {
    await mockAdmin();
    const res = await callRoute(POST, req({
      role: "SCHOOL_ADMIN",
      username: "admin@sch001.com",
      password: "wrong-password",
    }));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ requires2fa: false });
    expect(sendOtpEmailMock).not.toHaveBeenCalled();
  });

  it("429s (and does not resend) when a code was just issued", async () => {
    await mockAdmin();
    prismaMock.loginOtp.findFirst.mockResolvedValue({
      id: "o1",
      userId: "admin1",
      createdAt: new Date(), // just now → within cooldown
      consumedAt: null,
    } as never);

    const res = await callRoute(POST, req({
      role: "SCHOOL_ADMIN",
      username: "admin@sch001.com",
      password: "Admin@123",
    }));
    expect(res.status).toBe(429);
    expect(prismaMock.loginOtp.create).not.toHaveBeenCalled();
    expect(sendOtpEmailMock).not.toHaveBeenCalled();
  });
});
