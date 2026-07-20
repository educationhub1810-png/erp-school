import nodemailer, { type Transporter } from "nodemailer";
import { randomUUID } from "node:crypto";

// Lazily-built singleton Gmail SMTP transport. Built from GMAIL_USER and
// GMAIL_APP_PASSWORD (a Google "App password", not the account password — needs
// 2-Step Verification enabled on the Google account to mint one).
//
// Rate-limited (1 msg/sec, 1 connection) because bursts of near-identical
// automated mail from a personal Gmail account are what Gmail's spam
// classifier treats as bulk/abuse — this is the biggest lever available
// without moving to a dedicated sending domain.
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
      pool: true,
      maxConnections: 1,
      rateLimit: 1,
      rateDelta: 1000,
    });
  }
  return transporter;
}

// Escape user-supplied text before interpolating into the HTML email body.
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export interface MailboxReplyDetails {
  to: string;
  name: string;
  body: string;
}

// Outbound reply to a mailbox message (demo request / contact submission),
// sent from a Super Admin via the in-app mailbox. Throws on misconfiguration
// or delivery failure so the caller can surface the problem instead of
// silently dropping the reply.
export async function sendMailboxReplyEmail({ to, name, body }: MailboxReplyDetails): Promise<void> {
  const from = process.env.GMAIL_USER!;
  await getTransport().sendMail({
    from: `"iSMS" <${from}>`,
    to,
    headers: { "X-Entity-Ref-ID": randomUUID() },
    subject: "Re: your inquiry to iSMS",
    text: `Hi ${name},\n\n${body}`,
    html: `
      <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:480px;margin:0 auto">
        <p style="color:#374151;margin:0 0 12px">Hi ${escapeHtml(name)},</p>
        <p style="color:#374151;margin:0;white-space:pre-wrap">${escapeHtml(body)}</p>
      </div>
    `,
  });
}

// Send a login one-time code. Throws on misconfiguration or delivery failure so
// the caller can surface the problem instead of silently issuing a code the
// user never receives.
export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const from = process.env.GMAIL_USER!;
  await getTransport().sendMail({
    from: `"iSMS" <${from}>`,
    to,
    headers: { "X-Entity-Ref-ID": randomUUID() },
    subject: "Your iSMS login code",
    text: `Your iSMS login code is ${code}. It expires in 10 minutes.\n\nIf you did not try to sign in, you can ignore this email.`,
    html: `
      <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#0066cc;margin:0 0 8px">iSMS login code</h2>
        <p style="color:#374151;margin:0 0 16px">Use this code to finish signing in:</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:6px;color:#111827;margin:0 0 16px">${code}</p>
        <p style="color:#6b7280;font-size:13px;margin:0">It expires in 10 minutes. If you did not try to sign in, you can ignore this email.</p>
      </div>
    `,
  });
}
