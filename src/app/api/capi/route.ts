import { NextResponse } from "next/server";
import crypto from "crypto";

/* Meta Conversions API relay. The browser sends the same event_id it gave the Pixel, so
   Meta deduplicates the pair instead of counting the conversion twice. Customer data is
   SHA-256 hashed here and never logged. Dormant (204) until META_PIXEL_ID and
   META_CAPI_TOKEN are set, so this ships safely before the ad account exists. */

const PIXEL_ID = process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID;
const TOKEN = process.env.META_CAPI_TOKEN;
const TEST_CODE = process.env.META_CAPI_TEST_CODE;

function hash(v?: string): string | undefined {
  if (!v) return undefined;
  const norm = v.trim().toLowerCase();
  if (!norm) return undefined;
  return crypto.createHash("sha256").update(norm).digest("hex");
}

interface CapiBody {
  eventName: string;
  eventId: string;
  eventSourceUrl?: string;
  user?: { email?: string; phone?: string; city?: string };
  custom?: Record<string, unknown>;
}

export async function POST(request: Request) {
  if (!PIXEL_ID || !TOKEN) {
    // Not configured yet. Say so quietly; the client ignores the response either way.
    return new NextResponse(null, { status: 204 });
  }

  try {
    const body: CapiBody = await request.json();
    if (!body?.eventName || !body?.eventId) {
      return NextResponse.json({ error: "eventName and eventId are required" }, { status: 400 });
    }

    const h = request.headers;
    const ip = (h.get("x-forwarded-for") || "").split(",")[0].trim() || undefined;
    const ua = h.get("user-agent") || undefined;
    const fbc = body.custom?.fbclid
      ? `fb.1.${Date.now()}.${String(body.custom.fbclid)}`
      : undefined;

    const user_data: Record<string, unknown> = {
      em: hash(body.user?.email),
      ph: hash(body.user?.phone?.replace(/\D/g, "")),
      ct: hash(body.user?.city),
      country: hash("ca"),
      client_ip_address: ip,
      client_user_agent: ua,
      fbc,
    };
    for (const k of Object.keys(user_data)) if (user_data[k] === undefined) delete user_data[k];

    const payload: Record<string, unknown> = {
      data: [
        {
          event_name: body.eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: body.eventId, // must match the Pixel's eventID for dedup
          event_source_url: body.eventSourceUrl,
          action_source: "website",
          user_data,
          custom_data: body.custom ?? {},
        },
      ],
    };
    if (TEST_CODE) payload.test_event_code = TEST_CODE;

    const res = await fetch(
      `https://graph.facebook.com/v21.0/${PIXEL_ID}/events?access_token=${encodeURIComponent(TOKEN)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      const detail = await res.text();
      console.error("CAPI rejected event", body.eventName, res.status, detail.slice(0, 300));
      return NextResponse.json({ ok: false }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("CAPI relay error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
