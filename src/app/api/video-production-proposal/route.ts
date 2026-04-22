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

function money(n: number) {
  return "$" + Math.round(n).toLocaleString("en-CA");
}

function row(label: string, value: string, highlight = false) {
  const color = highlight ? "#4EC5D4" : "#e5e5e5";
  const weight = highlight ? "700" : "400";
  return `<tr>
    <td style="padding:8px 0;font-size:14px;color:#999;border-bottom:1px solid #1A1A1A;">${label}</td>
    <td style="padding:8px 0;font-size:14px;color:${color};font-weight:${weight};text-align:right;border-bottom:1px solid #1A1A1A;">${value}</td>
  </tr>`;
}

interface VideoOption {
  id: string;
  label: string;
  description: string;
  countLabel: string;
  price: number;
}

interface ProposalData {
  organization: string;
  contactName: string;
  email: string;
  phone: string;
  preferredDate: string;
  location: string;
  campaignName: string;
  creativeInput: string;
  basePackagePrice: number;
  additionalVideos: VideoOption;
  socialPostsPerWeek: number;
  newslettersPerMonth: number;
  campaignWeeks: number;
  campaignMonths: number;
  socialPostsTotal: number;
  newslettersTotal: number;
  marketingSupportTotal: number;
  subtotal: number;
  discountLabel: string;
  discountAmount: number;
  total: number;
}

function buildHtml(d: ProposalData) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0A0A;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#111111;border-radius:16px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#4EC5D4 0%,#3BA3B0 100%);padding:32px 40px;">
          <h1 style="margin:0;font-size:24px;font-weight:700;color:#0A0A0A;">New Video Production Proposal</h1>
          <p style="margin:8px 0 0;font-size:14px;color:#0A0A0A;opacity:0.7;">${esc(d.organization)}</p>
        </td></tr>

        <tr><td style="padding:28px 40px 0;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#4EC5D4;text-transform:uppercase;letter-spacing:1.5px;">Contact</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
            ${row("Organization", esc(d.organization))}
            ${row("Contact", esc(d.contactName))}
            ${row("Email", `<a href="mailto:${esc(d.email)}" style="color:#4EC5D4;text-decoration:none;">${esc(d.email)}</a>`)}
            ${d.phone ? row("Phone", esc(d.phone)) : ""}
            ${d.preferredDate ? row("Preferred Date", esc(d.preferredDate)) : ""}
            ${d.location ? row("Location", esc(d.location)) : ""}
            ${d.campaignName ? row("Campaign", esc(d.campaignName)) : ""}
          </table>
        </td></tr>

        <tr><td style="padding:28px 40px 0;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#4EC5D4;text-transform:uppercase;letter-spacing:1.5px;">Package Details</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
            ${row("Base Campaign Package", money(d.basePackagePrice))}
            ${row("Additional Videos", `${esc(d.additionalVideos.label)} (${money(d.additionalVideos.price)})`)}
            ${row("Social Posts / Week", `${d.socialPostsPerWeek} (${d.campaignWeeks} week campaign)`)}
            ${row("Newsletters / Month", `${d.newslettersPerMonth} (${d.campaignMonths} month campaign)`)}
          </table>
        </td></tr>

        <tr><td style="padding:28px 40px 0;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#4EC5D4;text-transform:uppercase;letter-spacing:1.5px;">Investment</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
            ${row("Base Package", money(d.basePackagePrice))}
            ${row("Additional Videos", money(d.additionalVideos.price))}
            ${row("Social Posts Total", money(d.socialPostsTotal))}
            ${row("Newsletters Total", money(d.newslettersTotal))}
            ${row("Marketing Support Total", money(d.marketingSupportTotal))}
            ${row("Subtotal", money(d.subtotal))}
            ${d.discountAmount > 0 ? row(`Volume Discount (${d.discountLabel})`, `-${money(d.discountAmount)}`) : ""}
            ${row("Total Investment", `${money(d.total)} +HST`, true)}
          </table>
        </td></tr>

        ${d.creativeInput ? `<tr><td style="padding:28px 40px 0;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:600;color:#4EC5D4;text-transform:uppercase;letter-spacing:1.5px;">Creative Input</p>
          <p style="margin:0;font-size:14px;color:#d4d4d4;line-height:1.7;white-space:pre-wrap;">${esc(d.creativeInput)}</p>
        </td></tr>` : ""}

        <tr><td style="padding:32px 40px;">
          <a href="mailto:${esc(d.email)}?subject=Re: Video Production Proposal — ${esc(d.organization)}" style="display:inline-block;padding:12px 28px;background-color:#4EC5D4;color:#0A0A0A;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
            Reply to ${esc(d.contactName)}
          </a>
        </td></tr>

        <tr><td style="padding:16px 40px 20px;border-top:1px solid #1A1A1A;">
          <p style="margin:0;font-size:12px;color:#555;">Submitted from streamstage.live/videoproduction</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function POST(request: Request) {
  try {
    const body: ProposalData = await request.json();

    if (!body.organization || !body.contactName || !body.email) {
      return NextResponse.json(
        { error: "Organization, contact name, and email are required." },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json(
        { error: "Invalid email address." },
        { status: 400 }
      );
    }

    await transporter.sendMail({
      from: `"StreamStage" <bot@compsync.net>`,
      to: "danieljohnabrahamson@gmail.com",
      replyTo: body.email,
      subject: `Video Production Proposal — ${body.organization} (${money(body.total)} +HST)`,
      html: buildHtml(body),
    });

    try {
      const ccUrl = process.env.CC_WEBHOOK_URL;
      const ccSecret = process.env.CC_WEBHOOK_SECRET;
      if (ccUrl && ccSecret) {
        await fetch(`${ccUrl}/api/webhook/lead-intake`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Secret": ccSecret,
          },
          body: JSON.stringify({
            organization: body.organization,
            contactName: body.contactName,
            email: body.email,
            phone: body.phone,
            source: "streamstage-proposal",
            sourceDetails: JSON.stringify({
              type: "video-production",
              preferredDate: body.preferredDate,
              location: body.location,
              campaignName: body.campaignName,
              additionalVideos: body.additionalVideos,
              socialPostsPerWeek: body.socialPostsPerWeek,
              newslettersPerMonth: body.newslettersPerMonth,
              total: body.total,
            }),
          }),
        });
      }
    } catch (e) {
      console.error("CC webhook failed (non-blocking):", e);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      "Video production proposal error:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: "Failed to submit proposal. Please try again." },
      { status: 500 }
    );
  }
}
