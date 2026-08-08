import { NextResponse } from "next/server";
import { sesTransport, escapeHtml } from "@/lib/mailer";
import { LEAD_ASSETS, resolveAsset, buildAssetEmail, type AssetKey } from "@/lib/lead-assets";

const LEAD_TO = process.env.LEAD_TO_EMAIL || "daniel@streamstageproductions.com";
const LEAD_FROM = process.env.LEAD_FROM_EMAIL || "StreamStage Leads <leads@streamstage.live>";

/**
 * The lead taxonomy — where a person entered from. Anything else (including the
 * free-text labels the older forms send, e.g. "Dance Teacher Expo kiosk") is kept
 * verbatim in `raw`/`notes` for Daniel but forwarded as `expo_form`, exactly as
 * this route behaved before attribution existed.
 *
 * Kept in sync with VALID_SOURCES in StudioSage src/app/api/leads/route.ts.
 */
const VALID_SOURCES = new Set([
  // added for the gated-entry work
  "booth_tablet", "booth_tv", "checklist", "handout",
  // already declared on the StudioSage side
  "expo_form", "moves", "sms_demo", "booth", "signup",
  "tv1", "tv2", "talk1", "talk2", "facelift",
]);

interface LeadBody {
  name?: string;
  studio?: string;
  email?: string;
  phone?: string;
  interests?: string[] | string;
  source?: string;
  notes?: string;
  // Attribution, all optional. Nothing that posted here before sends any of these.
  src?: string;       // which surface the QR was printed on
  p?: string;         // placement (which poster / which slide / which page)
  s?: string;         // slot (which of several codes on that placement)
  asset?: string;     // what they asked to be sent — see LEAD_ASSETS
  path?: string;      // the page path they submitted from
  referrer?: string;
}

function str(v: unknown, max = 300): string {
  return String(v ?? "").toString().trim().slice(0, max);
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
  notes: string;
  taxonomySource: string;
  asset: string;
  attribution: string;
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
          ${row("Came in from", escapeHtml(l.taxonomySource))}
          ${row("Asked for", escapeHtml(l.asset))}
          ${row("Interested in", escapeHtml(l.interests) || "—")}
          ${row("Notes", escapeHtml(l.notes).replace(/\n/g, "<br>"))}
          ${row("Attribution", escapeHtml(l.attribution))}
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;"><tr><td>
          <a href="mailto:${escapeHtml(l.email)}?subject=Re: Your StreamStage Dance Studio Video Plan" style="display:inline-block;padding:12px 26px;background:#1976d2;color:#fff;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;">Reply to ${escapeHtml(l.name || l.studio || l.email)}</a>
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
    const submittedInterests = Array.isArray(body.interests)
      ? body.interests.map((i) => String(i).slice(0, 80))
      : [];
    const interestsLabel = Array.isArray(body.interests)
      ? body.interests.join(" · ")
      : (body.interests || "").toString();
    // Free-text label the older forms send ("Dance Teacher Expo kiosk",
    // "Checklist QR — talk handout"). Human-readable, not taxonomy.
    const source = (body.source || "Dance Teacher Expo kiosk").toString();
    // Free-text context Daniel types at the booth ("also wants a website", "call
    // after Labour Day"). Stored on the lead; never shown to or sent to the lead.
    const notes = (body.notes || "").toString().slice(0, 2000).trim();

    // ---- attribution -----------------------------------------------------
    // Which surface did this person come in from? `source` if it is taxonomy,
    // else `src` (what the QR carries), else the pre-existing default. Free-text
    // labels fall through to expo_form, i.e. exactly the old behaviour.
    const srcParam = str(body.src, 40);
    const sourceCandidate = str(body.source, 40);
    const taxonomySource = VALID_SOURCES.has(sourceCandidate)
      ? sourceCandidate
      : VALID_SOURCES.has(srcParam)
        ? srcParam
        : "expo_form";

    const assetKey: AssetKey | null = resolveAsset(body.asset);

    // The whole blob, verbatim, into `leads.raw` (jsonb, nothing populated it for
    // expo_form rows before this). utm_* is passed through if a caller sends it.
    const utm: Record<string, string> = {};
    for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
      if (k.startsWith("utm_") && typeof v === "string") utm[k] = v.slice(0, 200);
    }
    const attribution = {
      src: srcParam || null,
      p: str(body.p, 60) || null,
      s: str(body.s, 60) || null,
      a: assetKey,
      asset_raw: str(body.asset, 60) || null,
      path: str(body.path, 200) || null,
      referrer: str(body.referrer, 300) || null,
      source_label: source,
      ts: new Date().toISOString(),
      ...utm,
    };

    // The booth gate asks for a STUDIO and an EMAIL — two boxes, deliberately. It never asks
    // for a person's name, so requiring one here forced the kiosk's flush to INVENT one from
    // the email's local part. Nobody asked for that field, and an invented name is worse than
    // an absent one: it arrives looking like something the visitor actually typed.
    //
    // So a booth capture is identified by its email (plus the studio, when the visitor gave
    // one) and is never required to carry a person's name. Every other caller — the four
    // website forms — still has to send one, which is what they have always done.
    const isBoothCapture =
      srcParam.startsWith("booth") || sourceCandidate.startsWith("booth");
    if (!email || (!isBoothCapture && (!name || !studio))) {
      return NextResponse.json(
        { error: "Name, studio, and email are required." },
        { status: 400 }
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    // What was actually wanted: whatever the form declared, plus what the asset
    // implies (so a gated landing page that only sends `asset` still records intent).
    const interests = Array.from(
      new Set([...submittedInterests, ...(assetKey ? LEAD_ASSETS[assetKey].interests : [])])
    );

    // Mirror into StudioSage's unified `leads` table. StreamStage has no database
    // of its own and is deliberately not being given service-role credentials, so
    // StudioSage owns the table and this is a server-to-server forward.
    //
    // Best-effort ONLY: a failure here must never turn a captured lead into an
    // error for the person standing at the booth.
    let forwarded = false;
    try {
      const ingest = process.env.LEADS_INGEST_URL || "https://www.studiosage.ai/api/leads";
      const token = process.env.LEADS_INGEST_TOKEN || "";
      if (token) {
        const res = await fetch(ingest, {
          method: "POST",
          headers: { "content-type": "application/json", "x-leads-token": token },
          body: JSON.stringify({
            source: taxonomySource,
            name,
            studio,
            email,
            phone,
            interests,
            consent: "form_submitted",
            // Daniel's booth notes take the field; fall back to the source label
            // so a lead with no notes still records where it came from.
            notes: notes || source,
            raw: attribution,
          }),
          signal: AbortSignal.timeout(4000),
        });
        forwarded = res.ok;
        if (!res.ok) console.error("expo-leads: lead forward rejected", res.status);
      }
    } catch (e) {
      console.error("expo-leads: unified lead forward failed", e instanceof Error ? e.message : e);
    }

    // Daniel's copy. Best-effort as well: if SES is down but the row landed in
    // `leads`, the lead is captured and the visitor must not see an error.
    let notified = false;
    try {
      await sesTransport.sendMail({
        from: LEAD_FROM,
        to: LEAD_TO,
        // NOTE: SES SMTP account rejects unverified replyTo → do NOT put the lead's
        // email here or delivery bounces. Reply to the lead via the in-body mailto button.
        replyTo: LEAD_FROM,
        // A booth capture has no name, so lead with whichever identifier exists
        // rather than leaving a blank gap before the bracket.
        subject: `New expo lead — ${name || studio || email}${
          name && studio ? ` (${studio})` : ""
        } — ${taxonomySource}`,
        html: buildHtml({
          name,
          studio,
          email,
          phone,
          interests: interests.join(" · ") || interestsLabel,
          source,
          notes,
          taxonomySource:
            taxonomySource === source ? taxonomySource : `${taxonomySource} — ${source}`,
          asset: assetKey ? LEAD_ASSETS[assetKey].label : "",
          attribution: [
            attribution.src && `src=${attribution.src}`,
            attribution.p && `p=${attribution.p}`,
            attribution.s && `s=${attribution.s}`,
            attribution.path && `path=${attribution.path}`,
            attribution.referrer && `ref=${attribution.referrer}`,
          ]
            .filter(Boolean)
            .join("  ·  "),
        }),
      });
      notified = true;
    } catch (e) {
      console.error("expo-leads: notification email failed", e instanceof Error ? e.message : e);
    }

    // Autoresponder: send the visitor the thing they were promised.
    // Only fires when a caller asks for a named asset, so the four forms that
    // posted here before this existed still email nobody but Daniel — the booth
    // staff form in particular says "Nothing is emailed to them."
    // Failing here must never fail the capture.
    let assetSent = false;
    if (assetKey) {
      try {
        const mail = buildAssetEmail({ asset: assetKey, name, unsubscribe: LEAD_TO });
        await sesTransport.sendMail({
          from: LEAD_FROM,
          to: email,
          // Same SES constraint as above: replyTo stays LEAD_FROM. The lead's own
          // address is only ever a `to`/body value, never replyTo.
          replyTo: LEAD_FROM,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
          headers: { "List-Unsubscribe": `<mailto:${LEAD_TO}?subject=Unsubscribe>` },
        });
        assetSent = true;
      } catch (e) {
        console.error("expo-leads: autoresponder failed", e instanceof Error ? e.message : e);
      }
    }

    // Only a total loss is an error. If either the row or Daniel's copy landed,
    // the lead exists and the person at the booth is done.
    if (!forwarded && !notified) {
      return NextResponse.json(
        { error: "Failed to submit. Please try again." },
        { status: 500 }
      );
    }

    // `sent` = the visitor's asset email actually left the building. A gated page
    // can use it to say "check your inbox" only when that is true.
    return NextResponse.json({ success: true, sent: assetSent });
  } catch (error) {
    console.error("expo-leads error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Failed to submit. Please try again." },
      { status: 500 }
    );
  }
}
