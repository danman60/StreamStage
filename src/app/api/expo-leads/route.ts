import { NextResponse } from "next/server";
import { sesTransport, escapeHtml } from "@/lib/mailer";

const LEAD_TO = process.env.LEAD_TO_EMAIL || "daniel@streamstageproductions.com";
const LEAD_FROM = process.env.LEAD_FROM_EMAIL || "StreamStage Leads <leads@streamstage.live>";

interface LeadBody {
  name?: string;
  studio?: string;
  email?: string;
  phone?: string;
  interests?: string[] | string;
  source?: string;
}

function row(label: string, value: string) {
  if (!value) return "";
  return `
  <tr><td style="font-size:11px;font-weight:600;color:#1976d2;text-transform:uppercase;letter-spacing:1.2px;padding:16px 0 4px;">${escapeHtml(
    label
  )}</td></tr>
  <tr><td style="font-size:16px;color:#10243a;line-height:1.5;">${value}</td></tr>`;
}

function buildHtml(l: {
  name: string;
  studio: string;
  email: string;
  phone: string;
  interests: string;
  source: string;
}) {
  return `<!doctype html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;background:#eaf5ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#eaf5ff;padding:36px 16px;"><tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 18px 60px rgba(23,75,126,.14);">
      <tr><td style="background:linear-gradient(135deg,#1976d2,#10243a);padding:28px 36px;">
        <h1 style="margin:0;font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.4px;">New Dance Teacher Expo lead</h1>
        <p style="margin:6px 0 0;font-size:13px;color:#cfe6ff;">${escapeHtml(l.source)}</p>
      </td></tr>
      <tr><td style="padding:12px 36px 30px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${row("Name", escapeHtml(l.name))}
          ${row("Studio", escapeHtml(l.studio))}
          ${row("Email", `<a href="mailto:${escapeHtml(l.email)}" style="color:#1976d2;text-decoration:none;">${escapeHtml(l.email)}</a>`)}
          ${row("Phone", l.phone ? `<a href="tel:${escapeHtml(l.phone)}" style="color:#1976d2;text-decoration:none;">${escapeHtml(l.phone)}</a>` : "")}
          ${row("Interested in", escapeHtml(l.interests) || "—")}
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;"><tr><td>
          <a href="mailto:${escapeHtml(l.email)}?subject=Re: Your StreamStage Dance Studio Video Plan" style="display:inline-block;padding:12px 26px;background:#1976d2;color:#fff;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;">Reply to ${escapeHtml(l.name)}</a>
        </td></tr></table>
      </td></tr>
      <tr><td style="padding:18px 36px;border-top:1px solid #eef4fa;">
        <p style="margin:0;font-size:12px;color:#8aa;">Captured at the Dance Teacher Expo kiosk · streamstage.live</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LeadBody;
    const name = (body.name || "").trim();
    const studio = (body.studio || "").trim();
    const email = (body.email || "").trim();
    const phone = (body.phone || "").trim();
    const interests = Array.isArray(body.interests)
      ? body.interests.join(" · ")
      : (body.interests || "").toString();
    const source = (body.source || "Dance Teacher Expo kiosk").toString();

    if (!name || !studio || !email) {
      return NextResponse.json(
        { error: "Name, studio, and email are required." },
        { status: 400 }
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    await sesTransport.sendMail({
      from: LEAD_FROM,
      to: LEAD_TO,
      // NOTE: SES SMTP account rejects unverified replyTo → do NOT put the lead's
      // email here or delivery bounces. Reply to the lead via the in-body mailto button.
      replyTo: LEAD_FROM,
      subject: `New expo lead — ${name}${studio ? ` (${studio})` : ""}`,
      html: buildHtml({ name, studio, email, phone, interests, source }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("expo-leads error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Failed to submit. Please try again." },
      { status: 500 }
    );
  }
}
