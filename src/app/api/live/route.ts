import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Where the deck tells the room's phones what slide it is on.
 *
 * This exists so the whole path is on the internet: the deck posts here, Vercel signs the write
 * to R2, and the phones read R2 off the CDN. Nothing in the chain is a laptop that can go to
 * sleep. The deck can't write to R2 itself because that needs a secret key, and the deck is a
 * web page — this route is the piece that is allowed to hold the key.
 *
 * The deck posts with `mode:'no-cors'` and a text/plain body, which makes it a "simple request":
 * no preflight, and it cannot read the response. So the token travels in the BODY (a no-cors
 * request may not set custom headers), and the reply is deliberately uninformative.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  token?: string;
  deck?: string;
  idx?: number;
  total?: number;
  title?: string;
  frag?: number;
  frags?: number;
  src?: string;
};

const int = (v: unknown, max: number) => {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) && n >= 0 && n <= max ? n : 0;
};

export async function POST(req: NextRequest) {
  const expected = process.env.LIVE_PUSH_TOKEN;
  if (!expected) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  let body: Body;
  try {
    body = JSON.parse(await req.text());
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Wrong token gets the same shape of answer as a right one, minus the work.
  if (body.token !== expected) {
    return NextResponse.json({ ok: true });
  }

  const deck = String(body.deck || "talk1").replace(/[^a-z0-9-]/gi, "").slice(0, 24) || "talk1";
  const payload = {
    deck,
    idx: int(body.idx, 200),
    total: int(body.total, 200),
    title: String(body.title || "").slice(0, 120),
    frag: int(body.frag, 40),
    frags: int(body.frags, 40),
    // a filename, never a path
    src: String(body.src || "").split("/").pop()!.replace(/[^a-z0-9._-]/gi, "").slice(0, 60),
    ts: Math.floor(Date.now() / 1000),
  };

  const {
    CLOUDFLARE_R2_ACCOUNT_ID: acct,
    CLOUDFLARE_R2_ACCESS_KEY: key,
    CLOUDFLARE_R2_SECRET_KEY: secret,
    CLOUDFLARE_R2_BUCKET: bucket,
  } = process.env;
  if (!acct || !key || !secret || !bucket) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${acct}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: key, secretAccessKey: secret },
  });

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: `live/${deck}/state.json`,
      Body: JSON.stringify(payload),
      ContentType: "application/json",
      // the entire point of this file is freshness; the CDN must never hold it
      CacheControl: "no-store, max-age=0, must-revalidate",
    }),
  );

  return NextResponse.json({ ok: true });
}

export async function GET() {
  // handy for a quick "is this route alive" check without revealing anything
  return NextResponse.json({ ok: true, route: "live" });
}
