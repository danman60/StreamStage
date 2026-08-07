import { escapeHtml } from "@/lib/mailer";

/**
 * The things a gated QR can promise, and what we actually send back.
 *
 * Rule for this file: every `url` here must be a page that really resolves today.
 * Two of the six assets (the content day planner, the six booth films) are not
 * published on the web at all — they are NOT given a made-up URL. They link to the
 * checklist and say plainly that Daniel will send the real thing, which is true:
 * the lead notification names the asset they asked for.
 *
 * Verified 2026-08-07:
 *   https://streamstage.live/checklist.html              200
 *   https://streamstage.live/checklist.html#interviews   200 (anchor present in live HTML)
 *   https://streamstage.live/checklist.html#videographer 200 (anchor present in live HTML)
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
  /** Extra line when the asset is not on the web yet — honesty, not a dead link. */
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
  planner: {
    label: "Content day planner",
    url: CHECKLIST,
    cta: "Open the recital video checklist",
    sentence:
      "The content day planner — how to plan one shoot day that feeds a season of posts.",
    caveat:
      "The planner is not posted online yet, so Daniel is sending it to you directly — your request is already in his inbox. In the meantime the recital video checklist covers the shots and scenes worth planning.",
    interests: ["video", "content day planner"],
  },
  sixfilms: {
    label: "The six booth films",
    url: CHECKLIST,
    cta: "Open the recital video checklist",
    // The six films are the six PRODUCTS, taken verbatim from CONFIG.products in
    // expo-assets/kiosk/kiosk.js. Do not describe them as video genres.
    sentence:
      "The six short films we were playing at the booth — StudioSage, CompSync, Callboard, CostumeCraft, StudioBeat and Reflect.",
    caveat:
      "They are not posted on the site yet, so Daniel is sending you the links directly — your request is already in his inbox. In the meantime, here is the recital video checklist.",
    interests: ["video", "booth films"],
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
