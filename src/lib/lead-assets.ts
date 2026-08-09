import { escapeHtml } from "@/lib/mailer";

/**
 * The things a gated QR can promise, and what we actually send back.
 *
 * Rule for this file: every `url` here must be a page that really resolves today.
 *
 * As of 2026-08-09 every asset delivers itself and NONE of them create a job for
 * Daniel. The content day planner used to: it only existed as a print handout,
 * so its email promised Daniel would send it. It is now Part one and a half of
 * the checklist.
 *
 * There is deliberately NO asset for the booth films, and one must not be added.
 * They are what plays on the screen at the booth — not a giveaway. We give away
 * the written material. The tablet's post-film offer, the film's own baked-in QR
 * and flush-leads.py all point at the recital video checklist for this reason.
 *
 * Verified 2026-08-09:
 *   https://streamstage.live/checklist.html              200
 *   https://streamstage.live/checklist.html#interviews   200 (anchor present in live HTML)
 *   https://streamstage.live/checklist.html#videographer 200 (anchor present in live HTML)
 *   https://streamstage.live/checklist.html#planner      200 (anchor added 2026-08-09)
 *   https://www.studiosage.ai/moves                      200
 *   https://streamstage.live/dancerecital                200
 *
 * The sentences here are mirrored verbatim in `public/g.html` (a static file
 * with no build step). Change one, change the other — the landing page and the
 * email have to promise the same thing.
 */

const CHECKLIST = "https://streamstage.live/checklist.html";

export interface LeadAsset {
  /** What the visitor asked for, in Daniel's notification. */
  label: string;
  /** A URL that resolves. Never a guess. */
  url: string;
  /** Text on the button. */
  cta: string;
  /** One plain sentence: what they are getting. No marketing throat-clearing. */
  sentence: string;
  /**
   * Extra line when an asset cannot fully deliver itself — honesty, not a dead
   * link. Nothing uses it as of 2026-08-09: every asset resolves to a real page.
   * Kept because the next half-ready giveaway will need it; if you set it, mirror
   * the text into public/g.html, which has its own copy of this table.
   */
  caveat?: string;
  /** Appended to `interests[]` on the lead so the table records what was wanted. */
  interests: string[];
}

export const LEAD_ASSETS = {
  checklist: {
    label: "Recital video checklist",
    url: CHECKLIST,
    cta: "Open the checklist",
    sentence:
      "The full recital video checklist — what to shoot, what to ask, and what to hand your videographer before recital day.",
    interests: ["video", "recital video checklist"],
  },
  interviews: {
    label: "Interview questions",
    url: `${CHECKLIST}#interviews`,
    cta: "Open the interview questions",
    sentence:
      "The interview questions that get dancers, parents and staff to say something worth keeping — part two of the recital video checklist.",
    interests: ["video", "interview questions"],
  },
  videographer: {
    label: "Videographer brief",
    url: `${CHECKLIST}#videographer`,
    cta: "Open the videographer brief",
    sentence:
      "The one-page brief to hand your videographer before recital day — part four of the recital video checklist.",
    interests: ["video", "videographer brief"],
  },
  // The planner used to promise that Daniel would send it by hand, because it
  // only existed as a print handout. It is now Part one and a half of the
  // checklist, so this delivers itself and creates no task for anybody.
  planner: {
    label: "Content day planner",
    url: `${CHECKLIST}#planner`,
    cta: "Open the content day planner",
    sentence:
      "The content day planner — how to plan one shoot day that feeds a season of posts: what to prep, the four stations, and what you walk out with.",
    interests: ["video", "content day planner"],
  },
  // StreamStage's own video service, not a download. The wording is taken from
  // the close of the checklist ("cameras, audio, interviews, titles and parent
  // delivery handled end to end") — no new claims are made here.
  recital: {
    label: "Recital filming + livestream",
    url: "https://streamstage.live/dancerecital",
    cta: "See how recital filming works",
    sentence:
      "Recital filming and livestream by StreamStage — cameras, audio, interviews, titles and the parent delivery link, handled end to end.",
    interests: ["video", "recital filming"],
  },
  moves: {
    label: "5 free AI moves",
    url: "https://www.studiosage.ai/moves",
    cta: "Open the 5 AI moves",
    sentence:
      "Five things you can do with AI in your studio this week — no new software, no setup.",
    interests: ["software", "ai moves"],
  },
} as const satisfies Record<string, LeadAsset>;

export type AssetKey = keyof typeof LEAD_ASSETS;

export function resolveAsset(value: unknown): AssetKey | null {
  const key = String(value ?? "").trim().toLowerCase();
  return key && key in LEAD_ASSETS ? (key as AssetKey) : null;
}

/**
 * The autoresponder body. Plain, short, and honest — it is a delivery email, not
 * a newsletter. `unsubscribe` is a real mailto because the gate copy promises
 * "Unsubscribe any time" and that promise has to be true (CASL).
 */
export function buildAssetEmail(opts: {
  asset: AssetKey;
  name: string;
  unsubscribe: string;
}): { subject: string; html: string; text: string } {
  const a: LeadAsset = LEAD_ASSETS[opts.asset];
  const first = opts.name.trim().split(/\s+/)[0] || "there";
  const unsubHref = `mailto:${opts.unsubscribe}?subject=${encodeURIComponent(
    "Unsubscribe"
  )}`;

  const text = [
    `Hi ${first},`,
    "",
    a.sentence,
    ...(a.caveat ? ["", a.caveat] : []),
    "",
    `${a.cta}: ${a.url}`,
    "",
    "If you want a quote for filming your recital, just reply to this email.",
    "",
    "— Daniel Abrahamson, StreamStage Productions",
    "streamstage.live",
    "",
    `You are getting this because you asked for it at the Dance Teacher Expo. Unsubscribe any time: ${opts.unsubscribe}`,
  ].join("\n");

  const html = `<!doctype html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;background:#eaf5ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#eaf5ff;padding:36px 16px;"><tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 18px 60px rgba(23,75,126,.14);">
      <tr><td style="background:linear-gradient(135deg,#1976d2,#10243a);padding:28px 36px;">
        <h1 style="margin:0;font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.4px;">${escapeHtml(
          a.label
        )}</h1>
        <p style="margin:6px 0 0;font-size:13px;color:#cfe6ff;">As promised — StreamStage</p>
      </td></tr>
      <tr><td style="padding:26px 36px 8px;">
        <p style="margin:0 0 14px;font-size:16px;color:#10243a;line-height:1.6;">Hi ${escapeHtml(
          first
        )},</p>
        <p style="margin:0 0 14px;font-size:16px;color:#10243a;line-height:1.6;">${escapeHtml(
          a.sentence
        )}</p>
        ${
          a.caveat
            ? `<p style="margin:0 0 14px;font-size:15px;color:#3d5a75;line-height:1.6;">${escapeHtml(
                a.caveat
              )}</p>`
            : ""
        }
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 6px;"><tr><td>
          <a href="${escapeHtml(
            a.url
          )}" style="display:inline-block;padding:13px 28px;background:#1976d2;color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;">${escapeHtml(
    a.cta
  )}</a>
        </td></tr></table>
        <p style="margin:14px 0 0;font-size:13px;color:#7a8fa3;line-height:1.6;word-break:break-all;">${escapeHtml(
          a.url
        )}</p>
        <p style="margin:22px 0 0;font-size:16px;color:#10243a;line-height:1.6;">If you want a quote for filming your recital, just reply to this email.</p>
        <p style="margin:14px 0 26px;font-size:16px;color:#10243a;line-height:1.6;">— Daniel Abrahamson<br><span style="color:#7a8fa3;font-size:14px;">StreamStage Productions</span></p>
      </td></tr>
      <tr><td style="padding:18px 36px;border-top:1px solid #eef4fa;">
        <p style="margin:0;font-size:12px;color:#8aa;line-height:1.6;">You are getting this because you asked for it at the Dance Teacher Expo. StreamStage Productions · <a href="https://streamstage.live" style="color:#8aa;">streamstage.live</a> · <a href="${escapeHtml(
          unsubHref
        )}" style="color:#8aa;">Unsubscribe</a></p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  return { subject: `${a.label} — as promised`, html, text };
}

/**
 * One email carrying SEVERAL guides.
 *
 * The website form lets somebody tick more than one box, and three separate
 * emails arriving at once reads as a malfunction rather than generosity. With
 * a single asset this delegates to buildAssetEmail so the long-standing
 * one-thing-at-a-time email is untouched; with more, it lists each one with
 * its own link.
 */
export function buildMultiAssetEmail(opts: {
  assets: AssetKey[];
  name: string;
  unsubscribe: string;
}): { subject: string; html: string; text: string } {
  const keys = Array.from(new Set(opts.assets));
  if (keys.length <= 1) {
    return buildAssetEmail({
      asset: keys[0] ?? "checklist",
      name: opts.name,
      unsubscribe: opts.unsubscribe,
    });
  }

  const items = keys.map((k) => LEAD_ASSETS[k] as LeadAsset);
  const first = opts.name.trim().split(/\s+/)[0] || "there";
  const unsubHref = `mailto:${opts.unsubscribe}?subject=${encodeURIComponent(
    "Unsubscribe"
  )}`;

  const text = [
    `Hi ${first},`,
    "",
    "Here is everything you asked for:",
    "",
    ...items.flatMap((a) => [`${a.label} — ${a.sentence}`, a.url, ""]),
    "If you want a quote for filming your recital, just reply to this email.",
    "",
    "— Daniel Abrahamson, StreamStage Productions",
    "streamstage.live",
    "",
    `You are getting this because you asked for it on streamstage.live. Unsubscribe any time: ${opts.unsubscribe}`,
  ].join("\n");

  const blocks = items
    .map(
      (a) => `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;"><tr><td
        style="padding:18px 20px;background:#f6fafd;border-radius:14px;">
        <p style="margin:0 0 6px;font-size:17px;font-weight:800;color:#10243a;">${escapeHtml(
          a.label
        )}</p>
        <p style="margin:0 0 14px;font-size:15px;color:#3d5a75;line-height:1.6;">${escapeHtml(
          a.sentence
        )}</p>
        <a href="${escapeHtml(
          a.url
        )}" style="display:inline-block;padding:11px 22px;background:#1976d2;color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:9px;">${escapeHtml(
        a.cta
      )}</a>
      </td></tr></table>`
    )
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;background:#eaf5ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#eaf5ff;padding:36px 16px;"><tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 18px 60px rgba(23,75,126,.14);">
      <tr><td style="background:linear-gradient(135deg,#1976d2,#10243a);padding:28px 36px;">
        <h1 style="margin:0;font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.4px;">Everything you asked for</h1>
        <p style="margin:6px 0 0;font-size:13px;color:#cfe6ff;">As promised — StreamStage</p>
      </td></tr>
      <tr><td style="padding:26px 36px 8px;">
        <p style="margin:0 0 18px;font-size:16px;color:#10243a;line-height:1.6;">Hi ${escapeHtml(
          first
        )},</p>
        ${blocks}
        <p style="margin:8px 0 0;font-size:16px;color:#10243a;line-height:1.6;">If you want a quote for filming your recital, just reply to this email.</p>
        <p style="margin:14px 0 26px;font-size:16px;color:#10243a;line-height:1.6;">— Daniel Abrahamson<br><span style="color:#7a8fa3;font-size:14px;">StreamStage Productions</span></p>
      </td></tr>
      <tr><td style="padding:18px 36px;border-top:1px solid #eef4fa;">
        <p style="margin:0;font-size:12px;color:#8aa;line-height:1.6;">You asked for these on streamstage.live. StreamStage Productions · <a href="https://streamstage.live" style="color:#8aa;">streamstage.live</a> · <a href="${escapeHtml(
          unsubHref
        )}" style="color:#8aa;">Unsubscribe</a></p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  return { subject: "Everything you asked for — StreamStage", html, text };
}
