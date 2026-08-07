/**
 * Server-to-server mirror of a captured lead into StudioSage's unified `leads`
 * table.
 *
 * StreamStage has no database of its own and is deliberately not given
 * service-role credentials, so StudioSage owns the table and POST /api/leads
 * (guarded by the shared `x-leads-token` secret) is the only door into it.
 * `src/app/api/expo-leads/route.ts` has done this inline since the gated-entry
 * work; this is the same call, extracted so the four video-business forms
 * (recital / dance promo / video production / contact) can mirror too. Before
 * this they emailed Daniel and reached no database at all — every submission
 * was an unlogged lead.
 *
 * BEST-EFFORT ONLY. Nothing in here throws, nothing here is allowed to change a
 * form's status code, response body, validation or email. A studio submitting a
 * proposal must never see an error because the lead mirror hiccupped, so every
 * failure path returns false and logs. The 4s timeout bounds how long a dead or
 * hanging ingest endpoint can hold the submitter up.
 *
 * No token configured => silent skip (same as expo-leads: an unset
 * LEADS_INGEST_TOKEN means cross-app forwarding is simply off, not broken).
 */

/** Field limits are StudioSage's — see clean() in its src/app/api/leads/route.ts. */
const LIMITS = {
  source: 40,
  name: 200,
  studio: 200,
  email: 200,
  phone: 40,
  consent: 60,
  notes: 1000,
  interest: 80,
  interestCount: 20,
} as const;

export interface LeadForwardInput {
  /** Taxonomy value, e.g. "recital_form". */
  source: string;
  name?: string | null;
  studio?: string | null;
  email?: string | null;
  phone?: string | null;
  interests?: string[];
  consent?: string;
  /** Context Daniel can read at a glance. Copy of what the form collected. */
  notes?: string;
  /** The full submitted payload plus attribution, stored verbatim in leads.raw (jsonb). */
  raw?: Record<string, unknown>;
}

function trim(v: unknown, max: number): string {
  return String(v ?? "").trim().slice(0, max);
}

/**
 * Build the notes string from labelled parts, dropping anything empty.
 * Nothing is inferred here — callers pass only values the form actually collected.
 */
export function noteLines(parts: Array<[string, unknown]>): string {
  return parts
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
    .map(([label, v]) => `${label}: ${String(v).trim()}`)
    .join("\n");
}

/**
 * @param tag  log prefix, so a failure is traceable to the form it came from
 * @returns    true only if the ingest endpoint accepted the row
 */
export async function forwardLead(input: LeadForwardInput, tag: string): Promise<boolean> {
  try {
    const token = process.env.LEADS_INGEST_TOKEN || "";
    if (!token) return false; // forwarding not configured — silent skip

    const email = trim(input.email, LIMITS.email);
    const phone = trim(input.phone, LIMITS.phone);
    // StudioSage requires one or the other and 400s without it. Nothing to
    // mirror, so don't spend the round trip.
    if (!email && !phone) return false;

    const interests = Array.from(new Set(input.interests || []))
      .map((i) => String(i).slice(0, LIMITS.interest))
      .filter(Boolean)
      .slice(0, LIMITS.interestCount);

    const ingest = process.env.LEADS_INGEST_URL || "https://www.studiosage.ai/api/leads";
    const res = await fetch(ingest, {
      method: "POST",
      headers: { "content-type": "application/json", "x-leads-token": token },
      body: JSON.stringify({
        source: trim(input.source, LIMITS.source),
        name: trim(input.name, LIMITS.name) || null,
        studio: trim(input.studio, LIMITS.studio) || null,
        email: email || null,
        phone: phone || null,
        interests,
        consent: trim(input.consent || "form_submitted", LIMITS.consent),
        notes: trim(input.notes, LIMITS.notes) || null,
        raw: input.raw || {},
      }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      console.error(`${tag}: lead forward rejected`, res.status);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`${tag}: lead forward failed`, e instanceof Error ? e.message : e);
    return false;
  }
}
