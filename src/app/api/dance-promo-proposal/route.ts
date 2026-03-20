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
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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

const CAMERA_LABELS: Record<string, string> = {
  gimbal: "Gimbal-Operated Movement Camera",
  interview: "Interview Camera",
  selfie: "Selfie Studio",
};

interface PromoData {
  email: string;
  studio: string;
  date: string;
  startTime: string;
  shootLength: number;
  cameras: string[];
  deliverables: { "30s": number; "1min": number; "10s": number; raw: boolean };
  elementsCost: number;
  deliverablesCost: number;
  subtotal: number;
  discountLabel: string;
  discountAmount: number;
  total: number;
}

function buildHtml(d: PromoData) {
  const cameraList = d.cameras.map((c) => CAMERA_LABELS[c] || c).join(", ") || "None";

  const deliverableLines = [];
  if (d.deliverables["30s"] > 0) deliverableLines.push(`${d.deliverables["30s"]}x 30-Second Vertical ($${d.deliverables["30s"] * 175})`);
  if (d.deliverables["1min"] > 0) deliverableLines.push(`${d.deliverables["1min"]}x 1-Minute Brand Story ($${d.deliverables["1min"] * 350})`);
  if (d.deliverables["10s"] > 0) deliverableLines.push(`${d.deliverables["10s"]}x 10-Second Vertical ($${d.deliverables["10s"] * 100})`);
  if (d.deliverables.raw) deliverableLines.push("Raw Footage Package ($250)");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0A0A;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#111111;border-radius:16px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#4EC5D4 0%,#3BA3B0 100%);padding:32px 40px;">
          <h1 style="margin:0;font-size:24px;font-weight:700;color:#0A0A0A;">New Dance Promo Proposal</h1>
          <p style="margin:8px 0 0;font-size:14px;color:#0A0A0A;opacity:0.7;">${esc(d.studio)}</p>
        </td></tr>

        <tr><td style="padding:28px 40px 0;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#4EC5D4;text-transform:uppercase;letter-spacing:1.5px;">Contact</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
            ${row("Studio", esc(d.studio))}
            ${row("Email", `<a href="mailto:${esc(d.email)}" style="color:#4EC5D4;text-decoration:none;">${esc(d.email)}</a>`)}
            ${d.date ? row("Preferred Date", esc(d.date)) : ""}
            ${d.startTime ? row("Start Time", esc(d.startTime)) : ""}
          </table>
        </td></tr>

        <tr><td style="padding:28px 40px 0;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#4EC5D4;text-transform:uppercase;letter-spacing:1.5px;">Package Details</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
            ${row("Shoot Length", `${d.shootLength} hours`)}
            ${row("Cameras", esc(cameraList))}
            ${row("Deliverables", deliverableLines.length > 0 ? deliverableLines.join("<br/>") : "None")}
          </table>
        </td></tr>

        <tr><td style="padding:28px 40px 0;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#4EC5D4;text-transform:uppercase;letter-spacing:1.5px;">Investment</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
            ${row("Production Elements", money(d.elementsCost))}
            ${row("Video Deliverables", money(d.deliverablesCost))}
            ${row("Subtotal", money(d.subtotal))}
            ${d.discountAmount > 0 ? row(`Volume Discount (${d.discountLabel})`, `-${money(d.discountAmount)}`) : ""}
            ${row("Total Investment", `${money(d.total)} +HST`, true)}
          </table>
        </td></tr>

        <tr><td style="padding:32px 40px;">
          <a href="mailto:${esc(d.email)}?subject=Re: Dance Promo Proposal — ${esc(d.studio)}" style="display:inline-block;padding:12px 28px;background-color:#4EC5D4;color:#0A0A0A;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
            Reply to ${esc(d.studio)}
          </a>
        </td></tr>

        <tr><td style="padding:16px 40px 20px;border-top:1px solid #1A1A1A;">
          <p style="margin:0;font-size:12px;color:#555;">Submitted from streamstage.live/dancepromo</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function POST(request: Request) {
  try {
    const body: PromoData = await request.json();

    if (!body.email || !body.studio) {
      return NextResponse.json({ error: "Email and studio name are required." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    await transporter.sendMail({
      from: `"StreamStage" <bot@compsync.net>`,
      to: "danieljohnabrahamson@gmail.com",
      replyTo: body.email,
      subject: `Dance Promo Proposal — ${body.studio} (${money(body.total)} +HST)`,
      html: buildHtml(body),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Dance promo proposal error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to submit. Please try again." }, { status: 500 });
  }
}
