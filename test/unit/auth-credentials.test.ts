import { describe, it, expect, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { prismaMock } from "../mocks/prisma";
import {
  resolveCredentials,
  verifyAndConsumeOtp,
  dobToPassword,
} from "@/lib/auth-credentials";
import { hashOtp, OTP_MAX_ATTEMPTS } from "@/lib/otp";

beforeEach(() => {
  // Every lookup defaults to "not found" unless a test overrides it.
  prismaMock.student.findFirst.mockResolvedValue(null as never);
  prismaMock.staff.findFirst.mockResolvedValue(null as never);
  prismaMock.teacher.findFirst.mockResolvedValue(null as never);
  prismaMock.parentProfile.findFirst.mockResolvedValue(null as never);
  prismaMock.user.findFirst.mockResolvedValue(null as never);
});

describe("resolveCredentials", () => {
  it("returns null when a field is missing", async () => {
    expect(await resolveCredentials({ role: "STUDENT", username: "x" })).toBeNull();
    expect(await resolveCredentials({ username: "x", password: "y" })).toBeNull();
  });

  it("matches the student path on studentCode + DOB password", async () => {
    const dob = new Date("2005-08-15");
    prismaMock.student.findFirst.mockResolvedValue({
      schoolId: "school-1",
      dob,
      user: { id: "u1", name: "Rahul", email: null, role: "STUDENT", isActive: true },
    } as never);

    const c = await resolveCredentials({
      role: "STUDENT",
      username: "D-STD00001",
      password: dobToPassword(dob),
    });
    expect(c).toMatchObject({ id: "u1", role: "STUDENT", schoolId: "school-1" });
  });

  it("matches the email/password path for admins", async () => {
    const hash = await bcrypt.hash("Admin@123", 12);
    prismaMock.user.findFirst.mockResolvedValue({
      id: "u9",
      name: "Boss",
      email: "admin@sch001.com",
      role: "SCHOOL_ADMIN",
      schoolId: "school-1",
      passwordHash: hash,
    } as never);

    const c = await resolveCredentials({
      role: "SCHOOL_ADMIN",
      username: "admin@sch001.com",
      password: "Admin@123",
    });
    expect(c).toMatchObject({ id: "u9", role: "SCHOOL_ADMIN" });
  });

  it("rejects a wrong password on the email path", async () => {
    const hash = await bcrypt.hash("Admin@123", 12);
    prismaMock.user.findFirst.mockResolvedValue({
      id: "u9", name: "Boss", email: "admin@sch001.com", role: "SCHOOL_ADMIN",
      schoolId: "school-1", passwordHash: hash,
    } as never);

    expect(
      await resolveCredentials({ role: "SCHOOL_ADMIN", username: "admin@sch001.com", password: "nope" }),
    ).toBeNull();
  });

  it("fails when the selected role does not match the account role", async () => {
    const hash = await bcrypt.hash("Admin@123", 12);
    prismaMock.user.findFirst.mockResolvedValue({
      id: "u9", name: "Boss", email: "admin@sch001.com", role: "SCHOOL_ADMIN",
      schoolId: "school-1", passwordHash: hash,
    } as never);

    expect(
      await resolveCredentials({ role: "SUPER_ADMIN", username: "admin@sch001.com", password: "Admin@123" }),
    ).toBeNull();
  });
});

describe("verifyAndConsumeOtp", () => {
  const future = () => new Date(Date.now() + 5 * 60 * 1000);
  const past = () => new Date(Date.now() - 60 * 1000);

  it("returns false when there is no live code", async () => {
    prismaMock.loginOtp.findFirst.mockResolvedValue(null as never);
    expect(await verifyAndConsumeOtp("u1", "123456")).toBe(false);
  });

  it("rejects an expired code without consuming it", async () => {
    prismaMock.loginOtp.findFirst.mockResolvedValue({
      id: "o1", codeHash: await hashOtp("123456"), expiresAt: past(), attempts: 0,
    } as never);
    expect(await verifyAndConsumeOtp("u1", "123456")).toBe(false);
    expect(prismaMock.loginOtp.update).not.toHaveBeenCalled();
  });

  it("rejects once the attempt cap is reached", async () => {
    prismaMock.loginOtp.findFirst.mockResolvedValue({
      id: "o1", codeHash: await hashOtp("123456"), expiresAt: future(), attempts: OTP_MAX_ATTEMPTS,
    } as never);
    expect(await verifyAndConsumeOtp("u1", "123456")).toBe(false);
    expect(prismaMock.loginOtp.update).not.toHaveBeenCalled();
  });

  it("burns an attempt and fails on a wrong code", async () => {
    prismaMock.loginOtp.findFirst.mockResolvedValue({
      id: "o1", codeHash: await hashOtp("123456"), expiresAt: future(), attempts: 0,
    } as never);
    prismaMock.loginOtp.update.mockResolvedValue({} as never);

    expect(await verifyAndConsumeOtp("u1", "000000")).toBe(false);
    // one update for the attempt increment, none for consumption
    expect(prismaMock.loginOtp.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.loginOtp.update.mock.calls[0][0]!.data).toMatchObject({
      attempts: { increment: 1 },
    });
  });

  it("accepts and consumes a valid code", async () => {
    prismaMock.loginOtp.findFirst.mockResolvedValue({
      id: "o1", codeHash: await hashOtp("123456"), expiresAt: future(), attempts: 0,
    } as never);
    prismaMock.loginOtp.update.mockResolvedValue({} as never);

    expect(await verifyAndConsumeOtp("u1", "123456")).toBe(true);
    // increment + consume
    expect(prismaMock.loginOtp.update).toHaveBeenCalledTimes(2);
    const consumeCall = prismaMock.loginOtp.update.mock.calls[1][0]!;
    expect((consumeCall.data as { consumedAt: Date }).consumedAt).toBeInstanceOf(Date);
  });
});
