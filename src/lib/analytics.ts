"use client";

/* Funnel instrumentation. Every conversion action fires GA4 + Meta Pixel with a SHARED
   event_id, and the server mirrors the same event_id through the Conversions API so Meta
   dedupes instead of double counting. Attribution (utm_*, fbclid, gclid) is captured on
   first landing and replayed with every later event in the session. */

const ATTR_KEY = "ss_attr";

export interface Attribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  gclid?: string;
  landing_path?: string;
  first_seen?: string;
}

/** Capture click IDs and UTMs once per session, on the first page that loads. */
export function captureAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  try {
    const existing = sessionStorage.getItem(ATTR_KEY);
    if (existing) return JSON.parse(existing) as Attribution;

    const p = new URLSearchParams(window.location.search);
    const attr: Attribution = { landing_path: window.location.pathname, first_seen: new Date().toISOString() };
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid"] as const) {
      const v = p.get(k);
      if (v) attr[k] = v;
    }
    sessionStorage.setItem(ATTR_KEY, JSON.stringify(attr));
    return attr;
  } catch {
    return {};
  }
}

export function getAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(sessionStorage.getItem(ATTR_KEY) || "{}") as Attribution;
  } catch {
    return {};
  }
}

function newEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `e-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Events that must never fire twice in one session (Lead above all). */
const onceFired = new Set<string>();

interface TrackOptions {
  /** Meta standard or custom event name. Omit to send GA4 only. */
  meta?: string;
  /** Extra params for both destinations. */
  params?: Record<string, unknown>;
  /** Mirror to the Conversions API with the same event_id. */
  server?: boolean;
  /** Customer data for CAPI matching. Hashed server side, never logged raw. */
  user?: { email?: string; phone?: string; city?: string };
  /** Fire at most once per session under this key. */
  once?: string;
}

/**
 * Fire one funnel event to GA4 and (when `meta` is given) the Meta Pixel, sharing an
 * event_id so a CAPI mirror of the same action is deduplicated by Meta.
 */
export function track(gaEvent: string, opts: TrackOptions = {}): string | null {
  if (typeof window === "undefined") return null;

  if (opts.once) {
    if (onceFired.has(opts.once)) return null;
    onceFired.add(opts.once);
  }

  const eventId = newEventId();
  const attr = getAttribution();
  const params = { ...opts.params, ...attr, event_id: eventId };

  try {
    const w = window as unknown as { gtag?: (...a: unknown[]) => void };
    w.gtag?.("event", gaEvent, params);
  } catch { /* analytics must never break the page */ }

  if (opts.meta) {
    try {
      const w = window as unknown as { fbq?: (...a: unknown[]) => void };
      // Standard events go through 'track'; anything non-standard through 'trackCustom'.
      const standard = ["ViewContent", "Lead", "Schedule", "Contact", "CompleteRegistration", "Purchase"];
      const verb = standard.includes(opts.meta) ? "track" : "trackCustom";
      w.fbq?.(verb, opts.meta, opts.params ?? {}, { eventID: eventId });
    } catch { /* no-op */ }
  }

  if (opts.server && opts.meta) {
    // Fire and forget. A failed CAPI mirror must never affect the user's flow.
    void fetch("/api/capi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: opts.meta,
        eventId,
        eventSourceUrl: window.location.href,
        user: opts.user ?? {},
        custom: { ...opts.params, ...attr },
      }),
      keepalive: true,
    }).catch(() => {});
  }

  return eventId;
}

/* ── The funnel, named once so page code cannot drift ── */

export const funnel = {
  viewRecitalPage: () => track("view_recital_page", { meta: "ViewContent", params: { content_name: "recitals_landing" }, once: "view_recital_page" }),

  calculatorStart: () => track("calculator_start", { meta: "CalculatorStart", once: "calculator_start" }),

  calculatorComplete: (p: { dancer_count: number; tier: string; total: number; services: string }) =>
    track("calculator_complete", { meta: "CalculatorComplete", params: p, once: "calculator_complete" }),

  /** ONLY after the server confirms the submission was accepted. */
  lead: (p: { value: number; dancer_count: number; tier: string }, user: { email?: string; phone?: string; city?: string }) =>
    track("generate_lead", {
      meta: "Lead",
      params: { ...p, currency: "CAD" },
      user,
      server: true,
      once: "generate_lead",
    }),

  appointmentBooked: (user: { email?: string } = {}) =>
    track("appointment_booked", { meta: "Schedule", user, server: true, once: "appointment_booked" }),
};
