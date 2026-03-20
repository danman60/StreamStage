import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "mail.privateemail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function check(val: boolean) {
  return val ? "&#10003;" : "&#10007;";
}

interface ProposalData {
  studio: string;
  email: string;
  contact: string;
  phone: string;
  date: string;
  showCount: number;
  showTimes: string[];
  venue: string;
  notes: string;
  dancerCount: number;
  tier: string;
  services: { video: boolean; streaming: boolean; photo: boolean; bundle: boolean };
  discounts: { earlyBird: boolean; testimonial: boolean; loyalty: boolean };
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  feePerDancer: number;
  suggestedMediaFee: number;
  mediaFee: number;
  profitToStudio: number;
}

function row(label: string, value: string, highlight = false) {
  const color = highlight ? "#4EC5D4" : "#e5e5e5";
  const weight = highlight ? "700" : "400";
  return `
    <tr>
      <td style="padding:8px 0;font-size:14px;color:#999;border-bottom:1px solid #1A1A1A;">${label}</td>
      <td style="padding:8px 0;font-size:14px;color:${color};font-weight:${weight};text-align:right;border-bottom:1px solid #1A1A1A;">${value}</td>
    </tr>`;
}

function money(n: number, decimals = 0) {
  return "$" + n.toLocaleString("en-CA", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function buildHtml(d: ProposalData) {
  const serviceList = [
    d.services.video ? "Video" : null,
    d.services.streaming ? "Streaming" : null,
    d.services.photo ? "Photo" : null,
  ].filter(Boolean).join(", ") + (d.services.bundle ? " (Bundle)" : "");

  const discountList = [
    d.discounts.earlyBird ? "Early Bird (-5%)" : null,
    d.discounts.testimonial ? "Testimonial (-5%)" : null,
    d.discounts.loyalty ? "3-Year Loyalty (-5%)" : null,
  ].filter(Boolean);

  const showTimesStr = d.showTimes.filter(t => t.trim()).join(", ") || "Not specified";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0A0A;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#111111;border-radius:16px;overflow:hidden;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#4EC5D4 0%,#3BA3B0 100%);padding:32px 40px;">
          <h1 style="margin:0;font-size:24px;font-weight:700;color:#0A0A0A;letter-spacing:-0.5px;">New Recital Proposal</h1>
          <p style="margin:8px 0 0;font-size:14px;color:#0A0A0A;opacity:0.7;">${esc(d.studio)}</p>
        </td></tr>

        <!-- Contact Info -->
        <tr><td style="padding:28px 40px 0;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#4EC5D4;text-transform:uppercase;letter-spacing:1.5px;">Contact Details</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
            ${row("Studio / Org", esc(d.studio))}
            ${row("Contact Person", esc(d.contact))}
            ${row("Email", `<a href="mailto:${esc(d.email)}" style="color:#4EC5D4;text-decoration:none;">${esc(d.email)}</a>`)}
            ${row("Phone", esc(d.phone))}
          </table>
        </td></tr>

        <!-- Event Details -->
        <tr><td style="padding:28px 40px 0;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#4EC5D4;text-transform:uppercase;letter-spacing:1.5px;">Event Details</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
            ${row("Recital Date", esc(d.date))}
            ${row("Shows", `${d.showCount} &mdash; ${esc(showTimesStr)}`)}
            ${row("Venue", esc(d.venue))}
            ${row("Dancers", `${d.dancerCount} (${esc(d.tier)})`)}
          </table>
        </td></tr>

        <!-- Proposal Summary -->
        <tr><td style="padding:28px 40px 0;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#4EC5D4;text-transform:uppercase;letter-spacing:1.5px;">Proposal Summary</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
            ${row("Services", esc(serviceList))}
            ${row("Subtotal", money(d.subtotal))}
            ${d.discountPercent > 0 ? row("Discounts", `${discountList.join(" + ")} &mdash; -${money(d.discountAmount)}`) : ""}
            ${row("Total Investment", money(d.total), true)}
          </table>
        </td></tr>

        <!-- Revenue Breakdown -->
        <tr><td style="padding:28px 40px 0;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#4EC5D4;text-transform:uppercase;letter-spacing:1.5px;">Studio Revenue</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
            ${row("Fee per Dancer", money(d.feePerDancer, 2))}
            ${row("Suggested Media Fee", money(d.suggestedMediaFee, 2))}
            ${row("Studio's Media Fee", money(d.mediaFee, 2))}
            ${row("Profit to Studio", money(d.profitToStudio), true)}
          </table>
        </td></tr>

        ${d.notes ? `
        <!-- Notes -->
        <tr><td style="padding:28px 40px 0;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:600;color:#4EC5D4;text-transform:uppercase;letter-spacing:1.5px;">Notes</p>
          <p style="margin:0;font-size:14px;color:#d4d4d4;line-height:1.7;white-space:pre-wrap;">${esc(d.notes)}</p>
        </td></tr>` : ""}

        <!-- Reply Button -->
        <tr><td style="padding:32px 40px;">
          <a href="mailto:${esc(d.email)}?subject=Re: Recital Proposal — ${esc(d.studio)}" style="display:inline-block;padding:12px 28px;background-color:#4EC5D4;color:#0A0A0A;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
            Reply to ${esc(d.contact)}
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:16px 40px 20px;border-top:1px solid #1A1A1A;">
          <p style="margin:0;font-size:12px;color:#555;">Submitted from streamstage.live/dance/proposal</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(request: Request) {
  try {
    const body: ProposalData = await request.json();

    if (!body.studio || !body.email || !body.contact || !body.phone || !body.date || !body.venue) {
      return NextResponse.json({ error: "All required fields must be filled." }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    await transporter.sendMail({
      from: `"StreamStage" <bot@compsync.net>`,
      to: "danieljohnabrahamson@gmail.com",
      replyTo: body.email,
      subject: `Recital Proposal — ${body.studio} (${body.dancerCount} dancers, ${money(body.total)})`,
      html: buildHtml(body),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Recital proposal error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to submit proposal. Please try again." }, { status: 500 });
  }
}
