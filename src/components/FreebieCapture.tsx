"use client";

/**
 * The free guides, on the website, behind one email box.
 *
 * One field and tick boxes, not a form per guide: somebody who wants the
 * checklist usually wants the planner too, and asking them to fill the same
 * box twice is how you lose the second one. Whatever they tick arrives as a
 * single email.
 *
 * Nothing here hosts the guides. It posts the same lead the booth posts, and
 * /api/expo-leads does what it already does for every gated QR: records the
 * lead and emails what was asked for. The three destinations are real pages —
 * the checklist, its content-day section, and /films — so no request creates a
 * job for Daniel.
 *
 * Only an email is asked for. The route accepts an email-only capture when the
 * request names assets, and the email opens "Hi there" rather than inventing a
 * name out of the address — which is a mistake this codebase has made before.
 */

import { useState } from "react";
import { Check, Loader2, Mail } from "lucide-react";

// The booth films are NOT on this list and must not be added. They are what
// plays on the screen at the booth — they are not a giveaway and we do not
// send them to anyone. What we give away is the written material.
type AssetKey = "checklist" | "planner" | "interviews" | "videographer";

const GUIDES: { asset: AssetKey; title: string; blurb: string }[] = [
  {
    asset: "checklist",
    title: "The recital video checklist",
    blurb:
      "What to shoot, what to ask, and the one-page brief to hand whoever films it.",
  },
  {
    asset: "planner",
    title: "The content day planner",
    blurb:
      "How one booked morning feeds a season of posts — what to prep, the four stations, what you walk out with.",
  },
  {
    asset: "interviews",
    title: "The interview questions",
    blurb:
      "The prompts that get dancers, parents and staff to say something worth keeping — not a hostage video.",
  },
  {
    asset: "videographer",
    title: "The videographer brief",
    blurb:
      "One page to hand whoever films your recital: what to require, and the five questions to ask before you sign.",
  },
];

export default function FreebieCapture() {
  const [picked, setPicked] = useState<AssetKey[]>(["checklist"]);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  function toggle(a: AssetKey) {
    setPicked((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!picked.length) {
      setError("Tick at least one, and it is on its way.");
      return;
    }
    if (!email.trim()) {
      setError("An email address, and that is the whole form.");
      return;
    }
    setState("sending");

    try {
      const res = await fetch("/api/expo-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          assets: picked,
          source: "checklist",
          path: typeof window !== "undefined" ? window.location.pathname : undefined,
          referrer:
            typeof document !== "undefined" ? document.referrer || undefined : undefined,
          notes: `Asked for ${picked
            .map((p) => GUIDES.find((g) => g.asset === p)?.title ?? p)
            .join(", ")} from ${
            typeof window !== "undefined" ? window.location.pathname : "the website"
          }.`,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setState("sent");
    } catch {
      // Honest failure — nothing is queued. A fake success means waiting for an
      // email that is never coming.
      setState("idle");
      setError("That did not send. Try again, or email daniel@streamstage.live.");
    }
  }

  return (
    <section className="w-full bg-slate-950 px-4 py-20">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-white md:text-4xl">
            Free, no strings
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-400">
            The same things we hand out at the dance teacher expos. Tick what you
            want, tell us where to send it, and it arrives straight away.
          </p>
        </div>

        {state === "sent" ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center">
            <div className="flex items-center justify-center gap-3 text-emerald-400">
              <Check className="h-6 w-6" />
              <h3 className="text-xl font-bold">On its way</h3>
            </div>
            <p className="mt-3 text-slate-300">
              Heading to <span className="text-white">{email}</span> now
              {picked.length > 1 ? ", all in one email" : ""}. If it has not landed
              in a couple of minutes, check your junk folder — then tell me and I
              will send it myself.
            </p>
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 md:p-8"
          >
            <div className="space-y-3">
              {GUIDES.map((g) => {
                const on = picked.includes(g.asset);
                return (
                  <label
                    key={g.asset}
                    className={`flex cursor-pointer gap-4 rounded-xl border p-4 transition ${
                      on
                        ? "border-cyan-500/60 bg-cyan-500/5"
                        : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(g.asset)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition ${
                        on
                          ? "border-cyan-400 bg-cyan-500 text-slate-950"
                          : "border-slate-600 bg-transparent"
                      }`}
                    >
                      {on && <Check className="h-4 w-4" strokeWidth={3} />}
                    </span>
                    <span>
                      <span className="block font-bold text-white">{g.title}</span>
                      <span className="mt-1 block text-sm text-slate-400">
                        {g.blurb}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@yourstudio.com"
                className="w-full flex-1 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={state === "sending"}
                className="flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-cyan-500 px-6 py-3 font-bold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
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
            </div>

            {error && <p className="mt-3 text-sm text-amber-400">{error}</p>}

            <p className="mt-3 text-xs text-slate-500">
              One email with what you ticked. Unsubscribe any time.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
