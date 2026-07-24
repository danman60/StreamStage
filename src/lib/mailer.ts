import nodemailer from "nodemailer";

/**
 * Shared AWS SES SMTP transport.
 * Creds come from env (set in Vercel + local .env):
 *   SES_SMTP_HOST  e.g. email-smtp.us-east-1.amazonaws.com
 *   SES_SMTP_PORT  587 (STARTTLS)
 *   SES_SMTP_USER  SES SMTP username
 *   SES_SMTP_PASS  SES SMTP password
 * Verified sending domains: streamstage.live, studiosage.ai, compsync.net.
 */
export const sesTransport = nodemailer.createTransport({
  host: process.env.SES_SMTP_HOST || "email-smtp.us-east-1.amazonaws.com",
  port: Number(process.env.SES_SMTP_PORT || 587),
  secure: false, // STARTTLS on 587
  auth: {
    user: process.env.SES_SMTP_USER,
    pass: process.env.SES_SMTP_PASS,
  },
});

export function escapeHtml(str: string): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
