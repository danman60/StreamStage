import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";

/**
 * The six booth films, on a page.
 *
 * These are the films that play on the TV at the dance teacher expos, one per
 * product. They were already published — the Fire Stick streams them from this
 * exact bucket over the public URL, with range requests, which is what makes
 * them seekable here too. This page just puts them somewhere a visitor can be
 * sent, so the "six booth films" request stops being a promise that Daniel
 * will email the links by hand.
 *
 * Copy is lifted from CONFIG.products in expo-assets/kiosk/kiosk.js so the page
 * and the booth screens say the same thing about each product.
 */

const R2 = "https://pub-626d1637ca4c4f34a7916019aaa3efce.r2.dev/booth";

const FILMS = [
  {
    id: "studiosage",
    name: "StudioSage",
    tagline:
      "The AI front desk. Parents text it — it answers from your own emails.",
    url: "https://studiosage.ai",
  },
  {
    id: "compsync",
    name: "CompSync",
    tagline:
      "Competition management, from entries through to the livestream.",
    url: "https://compsync.net",
  },
  {
    id: "callboard",
    name: "Callboard",
    tagline:
      "Recital running orders that already know your rules — siblings, quick changes, and the gaps in between.",
    url: "https://callboard-scheduler.vercel.app",
  },
  {
    id: "costumecraft",
    name: "CostumeCraft",
    tagline: "Design, measurements and per-class quantities in one place.",
    url: "https://costume-craft.vercel.app",
  },
  {
    id: "studiobeat",
    name: "StudioBeat",
    tagline:
      "Classes, families, payments and the season calendar — one platform instead of five.",
    url: "https://www.studiobeat.io/",
  },
  {
    id: "reflect",
    name: "Reflect",
    tagline: "The system that runs your studio's day — and remembers it.",
    url: "https://reflect-vert.vercel.app/demo/login",
  },
] as const;

export const metadata: Metadata = {
  title: "The six booth films | StreamStage",
  description:
    "The six short films we play at the dance teacher expos — StudioSage, CompSync, Callboard, CostumeCraft, StudioBeat and Reflect.",
};

export default function FilmsPage() {
  return (
    <>
      <main className="min-h-screen bg-slate-950 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <header className="mb-12 text-center">
            <h1 className="text-4xl font-bold text-white md:text-5xl">
              The six booth films
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
              These are the films playing on the screen at the booth — one for each
              piece of software we build for studios. Watch whichever is relevant to
              you; ignore the rest.
            </p>
          </header>

          <div className="space-y-12">
            {FILMS.map((f) => (
              <section key={f.id}>
                {/* No poster attribute: there are no poster images in the
                    bucket (checked — they 404), and a broken poster is worse
                    than the black first frame the browser shows anyway.
                    preload="none" keeps six films off the wire until asked. */}
                <video
                  controls
                  preload="none"
                  playsInline
                  className="w-full rounded-2xl border border-slate-800 bg-black"
                >
                  <source src={`${R2}/${f.id}.mp4`} type="video/mp4" />
                  Your browser cannot play this film.{" "}
                  <a href={`${R2}/${f.id}.mp4`}>Download it instead.</a>
                </video>

                <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{f.name}</h2>
                    <p className="mt-1 max-w-2xl text-slate-400">{f.tagline}</p>
                  </div>
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-cyan-500/40 px-4 py-2 font-semibold text-cyan-400 transition hover:bg-cyan-500/10"
                  >
                    Try {f.name}
                  </a>
                </div>
              </section>
            ))}
          </div>

          <div className="mt-16 rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center">
            <h2 className="text-2xl font-bold text-white">
              We also film your recital
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-400">
              Multi-camera recital video, livestreaming and photography — every family
              gets their own dancer&rsquo;s routines delivered to them, and none of the
              admin lands back on your desk.
            </p>
            <Link
              href="/dancerecital"
              className="mt-6 inline-block rounded-lg bg-cyan-500 px-6 py-3 font-bold text-slate-950 transition hover:bg-cyan-400"
            >
              See how recital filming works
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
