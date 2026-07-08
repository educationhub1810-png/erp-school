import nodemailer, { type Transporter } from "nodemailer";

// Lazily-built singleton Gmail SMTP transport. Built from GMAIL_USER and
// GMAIL_APP_PASSWORD (a Google "App password", not the account password — needs
// 2-Step Verification enabled on the Google account to mint one).
let transporter: Transporter | null = null;

function getTransport(): Transporter {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error(
      "Email is not configured: set GMAIL_USER and GMAIL_APP_PASSWORD in the environment.",
    );
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }
  return transporter;
}

// Send a login one-time code. Throws on misconfiguration or delivery failure so
// the caller can surface the problem instead of silently issuing a code the
// user never receives.
export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const from = process.env.GMAIL_USER!;
  await getTransport().sendMail({
    from: `"EduERP" <${from}>`,
    to,
    subject: "Your EduERP login code",
    text: `Your EduERP login code is ${code}. It expires in 10 minutes.\n\nIf you did not try to sign in, you can ignore this email.`,
    html: `
      <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#3b32fa;margin:0 0 8px">EduERP login code</h2>
        <p style="color:#374151;margin:0 0 16px">Use this code to finish signing in:</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:6px;color:#111827;margin:0 0 16px">${code}</p>
        <p style="color:#6b7280;font-size:13px;margin:0">It expires in 10 minutes. If you did not try to sign in, you can ignore this email.</p>
      </div>
    `,
  });
}
