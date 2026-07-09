import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

// Reset a user's login password by email. Runs against whatever DATABASE_URL is
// set, so point it at the right environment:
//
//   npx tsx scripts/reset-password.ts <email> <newPassword>
//   DATABASE_URL="<prod url>" npx tsx scripts/reset-password.ts you@example.com admin123
async function main() {
  const [email, newPassword] = process.argv.slice(2);
  if (!email || !newPassword) {
    console.error("Usage: tsx scripts/reset-password.ts <email> <newPassword>");
    process.exit(1);
  }

  const hash = await bcrypt.hash(newPassword, 12);
  const user = await prisma.user.update({
    where: { email },
    data: { passwordHash: hash },
    select: { name: true, email: true, role: true },
  });

  const ok = await bcrypt.compare(newPassword, hash);
  console.log(`Reset password for ${user.name} <${user.email}> (${user.role}) — verify: ${ok}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
