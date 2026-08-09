"use client";

/**
 * The two free guides, on the website, behind an email.
 *
 * Both already exist as real pages — the recital video checklist, and the
 * content day planner which is Part one and a half of it. This component does
 * not host them; it takes the visitor's details, posts the same lead the booth
 * posts, and lets `/api/expo-leads` do what it already does: record the lead
 * and email the person the thing they asked for.
 *
 * Why the fields are what they are: the route requires an email, and requires
 * a name and studio for anything that is not a booth capture. It refuses to
 * invent a name from an email address — that was a real defect once — so this
 * asks for the three it needs and nothing more.
 *
 * `source` is "checklist", which is existing taxonomy on both this route and
 * StudioSage's. The page it came from is carried in `path`, so a website
 * download is still tellable from a booth scan without inventing a new source
 * that the other side would reject.
 */

import { useState } from "react";
import { Check, Loader2, Mail } from "lucide-react";

type AssetKey = "checklist" | "planner";

const GUIDES: {
  asset: AssetKey;
  title: string;
  blurb: string;
  bullets: string[];
}[] = [
  {
    asset: "checklist",
    title: "The recital video checklist",
    blurb:
      "What to shoot, what to ask, and what to hand your videographer before recital day.",
    bullets: [
      "Coverage on the night, and what to confirm before it",
      "The interview questions that get real answers",
      "The one-page brief to hand whoever shoots it",
    ],
  },
  {
    asset: "planner",
    title: "The content day planner",
    blurb:
      "How one booked morning feeds a season of posts — the deliberate version of recital night.",
    bullets: [
      "What to prep before the day — the half only you can do",
      "The four stations, run as one four-hour shoot",
      "What you walk out with, and how one clip becomes nine posts",
    ],
  },
];

export default function FreebieCapture() {
  return (
    <section className="w-full bg-slate-950 py-20 px-4">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Two guides, free, no strings
          </h2>
          <p className="mt-3 text-slate-400 max-w-2xl mx-auto">
            The same two we hand out at the dance teacher expos. Tell us where to
            send it and it arrives in your inbox straight away.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {GUIDES.map((g) => (
            <GuideCard key={g.asset} {...g} />
          ))}
        </div>
      </div>
    </section>
  );
}

function GuideCard({
  asset,
  title,
  blurb,
  bullets,
}: {
  asset: AssetKey;
  title: string;
  blurb: string;
  bullets: string[];
}) {
  const [name, setName] = useState("");
  const [studio, setStudio] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim() || !studio.trim() || !email.trim()) {
      setError("Name, studio and email, and it is on its way.");
      return;
    }
    setState("sending");

    try {
      const res = await fetch("/api/expo-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          studio: studio.trim(),
          email: email.trim(),
          asset,
          source: "checklist",
          path: typeof window !== "undefined" ? window.location.pathname : undefined,
          referrer:
            typeof document !== "undefined" ? document.referrer || undefined : undefined,
          notes: `Requested "${title}" from ${
            typeof window !== "undefined" ? window.location.pathname : "the website"
          }.`,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setState("sent");
    } catch {
      // Honest failure. Nothing is queued here — unlike the booth, a visitor on
      // the website can simply try again, and a fake success would mean waiting
      // for an email that is never coming.
      setState("idle");
      setError("That did not send. Try again, or email daniel@streamstage.live.");
    }
  }

  if (state === "sent") {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8">
        <div className="flex items-center gap-3 text-emerald-400">
          <Check className="h-6 w-6" />
          <h3 className="text-xl font-bold">On its way</h3>
        </div>
        <p className="mt-3 text-slate-300">
          {title} is heading to <span className="text-white">{email}</span> now. If it
          does not land in a couple of minutes, check your junk folder — then tell me
          and I will send it myself.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
      <h3 className="text-xl font-bold text-white">{title}</h3>
      <p className="mt-2 text-slate-400">{blurb}</p>

      <ul className="mt-4 space-y-2">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2 text-sm text-slate-300">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <form onSubmit={submit} className="mt-6 space-y-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          autoComplete="name"
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
        />
        <input
          value={studio}
          onChange={(e) => setStudio(e.target.value)}
          placeholder="Studio name"
          autoComplete="organization"
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          inputMode="email"
          placeholder="Email"
          autoComplete="email"
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
        />

        {error && <p className="text-sm text-amber-400">{error}</p>}

        <button
          type="submit"
          disabled={state === "sending"}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-3 font-bold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
        >
          {state === "sending" ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> Sending
            </>
          ) : (
            <>
              <Mail className="h-5 w-5" /> Send it to me
            </>
          )}
        </button>
        <p className="text-xs text-slate-500">
          One email with the guide. Unsubscribe any time.
        </p>
      </form>
    </div>
  );
}
