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

// One-time (or re-run to re-enroll) setup of SUPER_ADMIN accounts with TOTP.
// For each account it ensures the user exists, generates a fresh authenticator
// secret + recovery codes, and prints a QR to scan in Google Authenticator.
//
//   SA_PW_NAGAL='…' SA_PW_YAGYA='…' npm run totp:setup
//
// Passwords are taken from env (kept out of git); if omitted, a strong one is
// generated and printed. Targets whatever DATABASE_URL points at.

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const ACCOUNTS = [
  { email: "nagalvinit@gmail.com", name: "Nagal (Super Admin)", pwEnv: "SA_PW_NAGAL" },
  { email: "yagyanm@gmail.com", name: "Yagya (Super Admin)", pwEnv: "SA_PW_YAGYA" },
];

const genPassword = () => crypto.randomBytes(12).toString("base64").replace(/[+/=]/g, "").slice(0, 16) + "!7";

async function main() {
  if (!process.env.TOTP_ENC_KEY) throw new Error("TOTP_ENC_KEY is not set");

  for (const acc of ACCOUNTS) {
    const provided = process.env[acc.pwEnv];
    const password = provided || genPassword();
    const passwordHash = await bcrypt.hash(password, 12);

    const secret = generateTotpSecret();
    const recovery = generateRecoveryCodes();
    const data = {
      name: acc.name,
      role: "SUPER_ADMIN" as const,
      isActive: true,
      totpSecret: encryptSecret(secret),
      totpEnabled: true,
      totpRecoveryCodes: JSON.stringify(await hashRecoveryCodes(recovery)),
    };

    const existing = await prisma.user.findUnique({ where: { email: acc.email } });
    if (existing) {
      await prisma.user.update({ where: { email: acc.email }, data: { ...data, ...(provided ? { passwordHash } : {}) } });
    } else {
      await prisma.user.create({ data: { ...data, email: acc.email, passwordHash } });
    }

    const qr = await QRCode.toString(totpKeyUri(acc.email, secret), { type: "terminal", small: true });
    console.log("\n========================================================");
    console.log(`  Super Admin: ${acc.email}`);
    if (!provided) console.log(`  Password (generated, save it): ${password}`);
    console.log("\n  Scan in Google Authenticator:\n");
    console.log(qr);
    console.log(`  Manual key (if you can't scan): ${secret}`);
    console.log("\n  Recovery codes (save — shown ONCE, each usable once):");
    recovery.forEach((c) => console.log("    " + c));
    console.log("========================================================\n");
  }

  console.log("✅ TOTP enrolled. In production, login = email + password + 6-digit code.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ TOTP setup failed:", e);
  process.exit(1);
});
