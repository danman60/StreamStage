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

interface DeliverableLineItem {
  id: string;
  title: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface ProposalData {
  organization: string;
  contactName: string;
  email: string;
  phone: string;
  preferredDate: string;
  location: string;
  notes: string;
  shootDays: number;
  secondOperatorDays: number;
  droneIncluded: boolean;
  primaryFirstDayRate: number;
  primaryAdditionalDayRate: number;
  secondOperatorDayRate: number;
  dronePrice: number;
  deliverables: DeliverableLineItem[];
  primaryOperatorCost: number;
  secondOperatorCost: number;
  droneCost: number;
  deliverablesCost: number;
  subtotal: number;
  discountRate: number;
  discountThreshold: number;
  discountAmount: number;
  total: number;
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
  return (
    "$" +
    n.toLocaleString("en-CA", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  );
}

function buildHtml(d: ProposalData) {
  const deliverablesList =
    d.deliverables.length > 0
      ? d.deliverables
          .map((item) => `${item.title}${item.quantity > 1 ? ` x${item.quantity}` : ""}`)
          .join(", ")
      : "None selected";

  const primaryBreakdown =
    d.shootDays <= 1
      ? `${money(d.primaryFirstDayRate)} x 1 = ${money(d.primaryOperatorCost)}`
      : `${money(d.primaryFirstDayRate)} + ${d.shootDays - 1} x ${money(d.primaryAdditionalDayRate)} = ${money(d.primaryOperatorCost)}`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0A0A;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#111111;border-radius:16px;overflow:hidden;">

        <tr><td style="background:linear-gradient(135deg,#4EC5D4 0%,#3BA3B0 100%);padding:32px 40px;">
          <h1 style="margin:0;font-size:24px;font-weight:700;color:#0A0A0A;letter-spacing:-0.5px;">New Video Production Proposal</h1>
          <p style="margin:8px 0 0;font-size:14px;color:#0A0A0A;opacity:0.7;">${esc(d.organization)}</p>
        </td></tr>

        <tr><td style="padding:28px 40px 0;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#4EC5D4;text-transform:uppercase;letter-spacing:1.5px;">Contact Details</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
            ${row("Organization", esc(d.organization))}
            ${row("Contact Person", esc(d.contactName))}
            ${row("Email", `<a href="mailto:${esc(d.email)}" style="color:#4EC5D4;text-decoration:none;">${esc(d.email)}</a>`)}
            ${row("Phone", esc(d.phone))}
          </table>
        </td></tr>

        <tr><td style="padding:28px 40px 0;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#4EC5D4;text-transform:uppercase;letter-spacing:1.5px;">Event Details</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
            ${row("Preferred Date", esc(d.preferredDate))}
            ${row("Location / Venue", esc(d.location))}
            ${row("Shoot Days", String(d.shootDays))}
            ${row("2nd Operator Days", String(d.secondOperatorDays))}
          </table>
        </td></tr>

        <tr><td style="padding:28px 40px 0;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#4EC5D4;text-transform:uppercase;letter-spacing:1.5px;">Proposal Summary</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
            ${row("Deliverables", esc(deliverablesList))}
            ${row("Primary Operator", primaryBreakdown)}
            ${row("2nd Operator", `${money(d.secondOperatorDayRate)} x ${d.secondOperatorDays} = ${money(d.secondOperatorCost)}`)}
            ${row("Drone Video", d.droneIncluded ? `${money(d.dronePrice)} flat` : "Not included")}
            ${row("Deliverables Total", money(d.deliverablesCost))}
            ${row("Subtotal", money(d.subtotal))}
            ${
              d.discountRate > 0
                ? row(
                    `Volume Discount (${Math.round(d.discountRate * 100)}% at ${money(d.discountThreshold)}+)`,
                    `-${money(d.discountAmount)}`
                  )
                : ""
            }
            ${row("Total Investment", `${money(d.total)} +HST`, true)}
          </table>
        </td></tr>

        ${d.notes ? `
        <tr><td style="padding:28px 40px 0;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:600;color:#4EC5D4;text-transform:uppercase;letter-spacing:1.5px;">Notes</p>
          <p style="margin:0;font-size:14px;color:#d4d4d4;line-height:1.7;white-space:pre-wrap;">${esc(d.notes)}</p>
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
</body>
</html>`;
}

export async function POST(request: Request) {
  try {
    const body: ProposalData = await request.json();

    if (
      !body.organization ||
      !body.email ||
      !body.contactName ||
      !body.phone ||
      !body.preferredDate ||
      !body.location
    ) {
      return NextResponse.json(
        { error: "All required fields must be filled." },
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
      subject: `Video Production Proposal — ${body.organization} (${money(body.total)})`,
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
              shootDays: body.shootDays,
              secondOperatorDays: body.secondOperatorDays,
              droneIncluded: body.droneIncluded,
              total: body.total,
              deliverables: body.deliverables,
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
