import "dotenv/config";
import { sendOtpEmail } from "../lib/mailer";

// Send a one-off test email to verify the Gmail SMTP config in the CURRENT
// environment, surfacing the real underlying error if it fails. Run with the
// same env you use in prod, e.g.:
//
//   GMAIL_USER="educationhub1810@gmail.com" \
//   GMAIL_APP_PASSWORD="abcdefghijklmnop" \
//   npx tsx scripts/test-email.ts yagyanm@gmail.com
async function main() {
  const to = process.argv[2];
  if (!to) {
    console.error("Usage: tsx scripts/test-email.ts <recipient-email>");
    process.exit(1);
  }

  const pw = process.env.GMAIL_APP_PASSWORD ?? "";
  console.log("GMAIL_USER:", process.env.GMAIL_USER || "(MISSING)");
  console.log(
    "GMAIL_APP_PASSWORD:",
    pw ? `set, length ${pw.length} (expected 16; ${/\s/.test(pw) ? "CONTAINS SPACES — remove them" : "no spaces"})` : "(MISSING)",
  );

  try {
    await sendOtpEmail(to, "123456");
    console.log(`\n✓ Test email sent to ${to}. Check the inbox.`);
  } catch (e) {
    console.error("\n✗ Send FAILED. Real error below:\n", e);
  }
  process.exit(0);
}

main();
