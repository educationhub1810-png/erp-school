import "dotenv/config";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  generateTotpSecret,
  totpKeyUri,
  encryptSecret,
  generateRecoveryCodes,
  hashRecoveryCodes,
} from "../lib/totp";

// Create (or re-enroll) a SCHOOL_ADMIN account with Google Authenticator 2FA,
// the same TOTP scheme used for super admins. Unlike super admins, school-admin
// 2FA is opt-in per account (see lib/super-admin-2fa.ts → passesEnrolledTotpGate):
// once enrolled here, this admin MUST present a 6-digit code at every login.
//
//   SA_EMAIL=admin@dps.edu.in SA_SCHOOL=SCH001 SA_PASSWORD='…' npm run totp:school-admin
//
// Env (all optional — sensible defaults shown):
//   SA_EMAIL    login username (email)        default: schooladmin.sch001@eduerp.app
//   SA_NAME     display name                  default: "School Admin (DPS)"
//   SA_MOBILE   mobile (alt login username)   default: none
//   SA_SCHOOL   school CODE to attach to      default: SCH001
//   SA_PASSWORD password (kept out of git)    default: a strong one is generated & printed
//
// Requires DATABASE_URL and TOTP_ENC_KEY (32-byte hex). Targets whatever
// DATABASE_URL points at, so double-check the env before running in prod.

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const EMAIL = process.env.SA_EMAIL || "schooladmin.sch001@eduerp.app";
const NAME = process.env.SA_NAME || "School Admin (DPS)";
const MOBILE = process.env.SA_MOBILE || null;
const SCHOOL_CODE = process.env.SA_SCHOOL || "SCH001";

const genPassword = () => crypto.randomBytes(12).toString("base64").replace(/[+/=]/g, "").slice(0, 16) + "!7";

async function main() {
  if (!process.env.TOTP_ENC_KEY) throw new Error("TOTP_ENC_KEY is not set");

  const school = await prisma.school.findUnique({ where: { code: SCHOOL_CODE } });
  if (!school) throw new Error(`No school with code "${SCHOOL_CODE}" — set SA_SCHOOL to a valid code.`);

  const provided = process.env.SA_PASSWORD;
  const password = provided || genPassword();
  const passwordHash = await bcrypt.hash(password, 12);

  const secret = generateTotpSecret();
  const recovery = generateRecoveryCodes();
  const data = {
    name: NAME,
    mobile: MOBILE,
    schoolId: school.id,
    role: "SCHOOL_ADMIN" as const,
    isActive: true,
    totpSecret: encryptSecret(secret),
    totpEnabled: true,
    totpRecoveryCodes: JSON.stringify(await hashRecoveryCodes(recovery)),
  };

  const existing = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (existing) {
    await prisma.user.update({
      where: { email: EMAIL },
      data: { ...data, ...(provided ? { passwordHash } : {}) },
    });
  } else {
    await prisma.user.create({ data: { ...data, email: EMAIL, passwordHash } });
  }

  const qr = await QRCode.toString(totpKeyUri(EMAIL, secret), { type: "terminal", small: true });
  console.log("\n========================================================");
  console.log(`  School Admin: ${EMAIL}`);
  console.log(`  School:       ${school.name} (${school.code})`);
  if (!provided) console.log(`  Password (generated, save it): ${password}`);
  console.log("\n  Scan in Google Authenticator:\n");
  console.log(qr);
  console.log(`  Manual key (if you can't scan): ${secret}`);
  console.log("\n  Recovery codes (save — shown ONCE, each usable once):");
  recovery.forEach((c) => console.log("    " + c));
  console.log("========================================================\n");

  console.log("✅ School-admin 2FA enrolled. Login = role 'School Admin' + email + password + 6-digit code.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ School-admin TOTP setup failed:", e);
  process.exit(1);
});
