import "dotenv/config";
import path from "path";
import QRCode from "qrcode";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { decryptSecret, totpKeyUri } from "../lib/totp";

// Renders scannable PNG QR codes for the *existing* TOTP secrets already stored
// in the DB — it does NOT regenerate anything, so recovery codes stay valid.
// Requires TOTP_ENC_KEY in .env to match the key the secrets were encrypted with.
//
//   npm run totp:qr                       # default: vinit + yagya
//   TOTP_QR_EMAILS='a@x.com,b@y.com' npm run totp:qr   # custom set
//
// PNGs are written to ./totp-qr/<email>.png

const EMAILS = (process.env.TOTP_QR_EMAILS || "nagalvinit@gmail.com,yagyanm@gmail.com")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

async function main() {
  if (!process.env.TOTP_ENC_KEY) throw new Error("TOTP_ENC_KEY is not set");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

  const outDir = path.join(process.cwd(), "totp-qr");
  const fs = await import("fs/promises");
  await fs.mkdir(outDir, { recursive: true });

  for (const email of EMAILS) {
    const u = await prisma.user.findUnique({ where: { email }, select: { name: true, totpSecret: true, totpEnabled: true } });
    if (!u) { console.log(`!! no user "${email}" — skipped`); continue; }
    if (!u.totpSecret) { console.log(`!! "${email}" has no TOTP secret (not enrolled) — skipped`); continue; }

    let secret: string;
    try {
      secret = decryptSecret(u.totpSecret);
    } catch {
      console.log(`!! "${email}" — DECRYPT FAILED (TOTP_ENC_KEY mismatch) — skipped`);
      continue;
    }

    const uri = totpKeyUri(email, secret);
    const file = path.join(outDir, `${email.replace(/[^a-z0-9]+/gi, "_")}.png`);
    await QRCode.toFile(file, uri, { width: 400, margin: 2 });
    console.log(`✅ ${u.name} <${email}>  enabled=${u.totpEnabled}`);
    console.log(`   QR : ${file}`);
    console.log(`   key: ${secret}`);
  }

  await prisma.$disconnect();
  console.log(`\nDone. Open the PNGs in ./totp-qr and scan them.`);
}

main().catch((e) => { console.error("❌ failed:", e); process.exit(1); });
