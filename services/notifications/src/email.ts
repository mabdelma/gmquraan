import nodemailer from "nodemailer";

/** SMTP transport to the self-hosted Mailu/Postfix mailer (Maildev locally). */
const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "mailer",
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  ...(process.env.SMTP_USER
    ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }
    : {}),
  tls: { rejectUnauthorized: false },
});

const FROM = process.env.EMAIL_FROM || "Unskinned <noreply@example.com>";

/** Extract the bare address from a "Name <addr@x>" string (or return as-is). */
function fromAddress(): string {
  const m = FROM.match(/<([^>]+)>/);
  return m ? m[1] : FROM;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  fromName?: string,
  replyTo?: string
) {
  // Keep the configured sending mailbox; only the display name is overridable.
  const from = fromName ? `${fromName} <${fromAddress()}>` : FROM;
  await transport.sendMail({ from, to, subject, html, ...(replyTo ? { replyTo } : {}) });
}
