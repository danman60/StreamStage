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

function buildHtml({
  name,
  email,
  projectType,
  message,
}: {
  name: string;
  email: string;
  projectType: string;
  message: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0A0A;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#111111;border-radius:16px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4EC5D4 0%,#3BA3B0 100%);padding:32px 40px;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#0A0A0A;letter-spacing:-0.5px;">
                New Inquiry from StreamStage
              </h1>
              <p style="margin:8px 0 0;font-size:14px;color:#0A0A0A;opacity:0.7;">
                Someone wants to work with you
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <!-- Name -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="font-size:11px;font-weight:600;color:#4EC5D4;text-transform:uppercase;letter-spacing:1.5px;padding-bottom:6px;">
                    Name
                  </td>
                </tr>
                <tr>
                  <td style="font-size:16px;color:#e5e5e5;line-height:1.5;">
                    ${escapeHtml(name)}
                  </td>
                </tr>
              </table>

              <!-- Email -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="font-size:11px;font-weight:600;color:#4EC5D4;text-transform:uppercase;letter-spacing:1.5px;padding-bottom:6px;">
                    Email
                  </td>
                </tr>
                <tr>
                  <td style="font-size:16px;line-height:1.5;">
                    <a href="mailto:${escapeHtml(email)}" style="color:#4EC5D4;text-decoration:none;">
                      ${escapeHtml(email)}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Project Type -->
              ${
                projectType
                  ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="font-size:11px;font-weight:600;color:#4EC5D4;text-transform:uppercase;letter-spacing:1.5px;padding-bottom:6px;">
                    Project Type
                  </td>
                </tr>
                <tr>
                  <td>
                    <span style="display:inline-block;padding:4px 12px;background-color:#1A1A1A;border:1px solid rgba(78,197,212,0.2);border-radius:6px;font-size:14px;color:#e5e5e5;">
                      ${escapeHtml(projectType)}
                    </span>
                  </td>
                </tr>
              </table>`
                  : ""
              }

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="height:1px;background:linear-gradient(90deg,transparent 0%,rgba(78,197,212,0.2) 50%,transparent 100%);" />
                </tr>
              </table>

              <!-- Message -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:11px;font-weight:600;color:#4EC5D4;text-transform:uppercase;letter-spacing:1.5px;padding-bottom:10px;">
                    Message
                  </td>
                </tr>
                <tr>
                  <td style="font-size:15px;color:#d4d4d4;line-height:1.7;white-space:pre-wrap;">
${escapeHtml(message)}
                  </td>
                </tr>
              </table>

              <!-- Reply button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;">
                <tr>
                  <td>
                    <a href="mailto:${escapeHtml(email)}?subject=Re: StreamStage Inquiry" style="display:inline-block;padding:12px 28px;background-color:#4EC5D4;color:#0A0A0A;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
                      Reply to ${escapeHtml(name)}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #1A1A1A;">
              <p style="margin:0;font-size:12px;color:#555;">
                Sent from streamstage.live contact form
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, projectType, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required." },
        { status: 400 }
      );
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address." },
        { status: 400 }
      );
    }

    await transporter.sendMail({
      from: `"StreamStage" <bot@compsync.net>`,
      to: "danieljohnabrahamson@gmail.com",
      replyTo: email,
      subject: `New inquiry from ${name}${projectType ? ` — ${projectType}` : ""}`,
      html: buildHtml({ name, email, projectType, message }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact form error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Failed to send message. Please try again." },
      { status: 500 }
    );
  }
}
