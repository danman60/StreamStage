"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Mail, ArrowRight } from "lucide-react";
import RecitalNav from "@/components/RecitalNav";
import Footer from "@/components/Footer";
import { funnel } from "@/lib/analytics";

/* Unique success URL. The proposal page stashes a summary here after the SERVER confirmed
   the submission, so Lead fires exactly once, on a real accepted lead, never on a click. */

interface Submitted {
  studio?: string;
  email?: string;
  city?: string;
  dancerCount?: number;
  tier?: string;
  total?: number;
  services?: string;
  date?: string;
}

const KEY = "ss_proposal_submitted";

export default function ReceivedPage() {
  const [data, setData] = useState<Submitted | null>(null);

  useEffect(() => {
    let parsed: Submitted = {};
    try {
      parsed = JSON.parse(sessionStorage.getItem(KEY) || "{}") as Submitted;
    } catch { /* fall through to the generic confirmation */ }
    setData(parsed);

    funnel.lead(
      {
        value: parsed.total ?? 0,
        dancer_count: parsed.dancerCount ?? 0,
        tier: parsed.tier ?? "",
      },
      { email: parsed.email, city: parsed.city }
    );
  }, []);

  const money = (n?: number) =>
    typeof n === "number" ? "$" + n.toLocaleString("en-CA") : null;

  return (
    <>
      <RecitalNav ctaHref="/recitals" ctaLabel="Recital video" />

      <main className="min-h-screen pt-28 pb-16 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <div className="rounded-2xl border border-cyan-brand/25 bg-charcoal-dark/60 p-8 sm:p-10 text-center">
            <CheckCircle2 size={56} className="text-cyan-brand mx-auto mb-5" />
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-3">
              We&rsquo;ve got your recital details
            </h1>
            <p className="text-lg text-gray-300">
              Daniel will confirm availability for your date and answer any questions by
              email within one business day.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 text-sm text-gray-400">
              <Clock size={15} className="text-cyan-brand" />
              Sent {new Date().toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>

          {data && (data.studio || data.dancerCount) && (
            <div className="mt-6 rounded-xl border border-white/5 bg-charcoal-dark/60 p-6">
              <h2 className="font-heading text-lg font-semibold text-white mb-4">
                What you sent
              </h2>
              <dl className="space-y-3 text-base">
                {[
                  ["Studio", data.studio],
                  ["Recital date", data.date],
                  ["Dancers", data.dancerCount ? `${data.dancerCount}${data.tier ? ` (${data.tier})` : ""}` : null],
                  ["Services", data.services],
                  ["Estimated investment", money(data.total)],
                ]
                  .filter(([, v]) => v)
                  .map(([label, value]) => (
                    <div key={String(label)} className="flex items-center justify-between gap-4">
                      <dt className="text-gray-400">{label}</dt>
                      <dd className="text-white font-medium text-right">{value}</dd>
                    </div>
                  ))}
              </dl>
            </div>
          )}

          <div className="mt-6 rounded-xl border border-white/5 bg-charcoal-dark/60 p-6">
            <h2 className="font-heading text-lg font-semibold text-white mb-3">
              Handy to have ready
            </h2>
            <ul className="space-y-2 text-base text-gray-400">
              {[
                "Your venue, and whether you have used it before",
                "Show times, if you run more than one show",
                "Roughly how many routines are in the program",
                "Whether you want the livestream for out of town family",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-cyan-brand">&bull;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:daniel@streamstage.live?subject=Recital%20date%20question"
              className="inline-flex items-center gap-2 text-base text-cyan-brand hover:underline"
            >
              <Mail size={17} /> Urgent about a date? Email Daniel
            </a>
            <Link
              href="/recitals"
              className="inline-flex items-center gap-2 text-base text-gray-400 hover:text-white transition-colors"
            >
              Back to recital video <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
