import Link from "next/link";
import Image from "next/image";
import { Film, Mic, Sparkles, Repeat, Layers, ArrowRight, Check, Quote } from "lucide-react";
import RecitalNav from "@/components/RecitalNav";
import ScrollReveal from "@/components/ScrollReveal";
import Footer from "@/components/Footer";

/* Compact landing page. Pricing mirrors /dancepromo, which stays the source of truth. */
const CAMERA_BASE = 865;
const CAMERA_ADDITIONAL = 175;

const deliverables = [
  { label: "60 second promo film", price: 405 },
  { label: "30 second cut", price: 200 },
  { label: "10 second cut", price: 115 },
  { label: "All raw footage", price: 290 },
];

/* Every clip here is StreamStage's own work, verified by frame 2026-08-16, and each title
   describes what is actually on screen. The five example-*.mp4 clips that used to sit here
   were other accounts' posts (@joffreyballet, @ikindance, @theballeteducator,
   @imaginedancechallenge, @moveitshakeit), shown credited in the expo talk as a public audit.
   They were never StreamStage footage and must not return to this page. */
const formats = [
  { src: "fmt-owner-oncamera", icon: Mic, title: "Owner on camera" },
  { src: "fmt-class-in-motion", icon: Sparkles, title: "Class in motion" },
  { src: "fmt-studio-culture", icon: Layers, title: "Studio culture" },
  { src: "fmt-studio-tour", icon: Film, title: "Studio tour and team" },
  { src: "fmt-cinematic", icon: Repeat, title: "Cinematic studio shoot" },
];

const logos = [
  "footprints-dance-centre", "artistic-movement", "bravo-academy", "elite-dance",
  "impact-dance-complex", "all-thats-dance", "canadian-dance-awards", "cbc-sports",
];

const testimonials = [
  {
    quote:
      "I look at that raw footage probably once a week just to say, what can I pull out today and post. It was very, very valuable.",
    name: "Tiffany Adoranti",
    title: "Caledonia School of Dance",
  },
  {
    quote:
      "The content created showcased our brand and studio values incredibly well. Dan and Kayla are knowledgeable about the dance world and easy to work with.",
    name: "Lainy Zimmer",
    title: "Footprints Dance Centre",
  },
  {
    quote: "Take the leap, you won't be disappointed, and you'll be a repeat customer for sure.",
    name: "Nicole",
    title: "Stagecoach",
  },
];

const faq = [
  { q: "How long does it take?", a: "One morning at your studio. Everyone in costume, hair and makeup done, lights up. We shoot it all at once." },
  { q: "Do we still post our own phone videos?", a: "Yes, and you should. Pro footage is the well you draw from; it makes everything you shoot yourself look better." },
  { q: "What do we walk away with?", a: "A promo film, short social cuts, background video for your site, and the raw footage. Studios say the raw is what they keep going back to." },
  { q: "When should we book it?", a: "Early enough that you post from it all season instead of scrambling. Autumn dates fill first." },
];

export default function ContentDayPage() {
  return (
    <main className="bg-charcoal-deep min-h-screen">
      <RecitalNav ctaLabel="Build Your Content Day" ctaHref="/dancepromo" />

      {/* ── 1. Hero + inline how-it-works ─────────────────────── */}
      <section className="relative overflow-hidden px-4 sm:px-6 pt-28 pb-12 sm:pt-32 sm:pb-16">
        <video
          className="absolute inset-0 h-full w-full object-cover opacity-30"
          src="/campaign/contentday-hero.mp4"
          poster="/campaign/contentday-hero.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-charcoal-deep/85 via-charcoal-deep/75 to-charcoal-deep" />

        <div className="relative mx-auto w-full max-w-5xl">
          <div className="text-center">
            <p className="font-heading text-xs sm:text-sm uppercase tracking-[0.2em] text-cyan-brand mb-4">
              The content day
            </p>
            <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 leading-[1.05]">
              One morning in.
              <br />
              <span className="text-cyan-brand">Twelve months of posts out.</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-gray-300 mb-7">
              Most studios make content the exhausting way: shoot it, edit it, post it, then do it
              again tomorrow. Do the hard thing once instead, and spend the year posting from it.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Link
                href="/dancepromo"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-brand px-8 py-4 font-heading text-base font-semibold text-charcoal-deep transition-transform duration-200 hover:scale-[1.02]"
              >
                Build your content day <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="mailto:daniel@streamstage.live?subject=Content%20day"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-6 py-4 text-base font-medium text-gray-200 transition-colors hover:border-cyan-brand hover:text-cyan-brand"
              >
                Ask a question
              </a>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              Published pricing. No account, no sales call, nobody chases you.
            </p>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {[
              { n: "1", t: "One shoot day", d: "Costumes, lights, everyone in." },
              { n: "2", t: "We cut it up", d: "Promo film plus short social cuts." },
              { n: "3", t: "You post all year", d: "Raw footage stays yours to mine." },
            ].map((s) => (
              <div key={s.n} className="rounded-xl border border-white/10 bg-charcoal-mid/70 px-5 py-4 backdrop-blur-sm">
                <p className="font-heading text-sm font-bold text-cyan-brand">{s.n}</p>
                <p className="font-heading text-base font-semibold text-white mt-1">{s.t}</p>
                <p className="text-sm text-gray-400 mt-0.5">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 2. Social proof bar ───────────────────────────────── */}
      <section className="border-y border-white/5 py-7 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-center font-heading text-xs uppercase tracking-[0.18em] text-gray-500 mb-5">
            Trusted by studios, theatres and broadcasters
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-9 gap-y-5 opacity-80">
            {logos.map((l) => (
              <Image
                key={l}
                src={`/logos-white/${l}.png`}
                alt=""
                width={110}
                height={34}
                className="h-8 w-auto object-contain sm:h-10"
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. What one morning produces ──────────────────────── */}
      <section className="py-14 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white">
              What one morning produces
            </h2>
            <p className="text-sm text-gray-400">Five formats, five real studios. Every one of these is our own work.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {formats.map((f) => (
              <figure key={f.src} className="overflow-hidden rounded-xl border border-white/10 bg-charcoal-dark">
                <video
                  className="aspect-[4/5] w-full object-cover"
                  src={`/campaign/${f.src}.mp4`}
                  poster={`/campaign/${f.src}.jpg`}
                  muted
                  loop
                  playsInline
                  preload="none"
                  controls
                />
                <figcaption className="flex items-center gap-1.5 px-3 py-2">
                  <f.icon className="h-3.5 w-3.5 text-cyan-brand shrink-0" />
                  <span className="font-heading text-xs font-semibold text-white">{f.title}</span>
                </figcaption>
              </figure>
            ))}
            <div className="flex flex-col justify-center rounded-xl border border-cyan-brand/30 bg-cyan-brand/5 p-4">
              <Layers className="h-5 w-5 text-cyan-brand" />
              <p className="font-heading text-lg font-bold text-white mt-2 leading-tight">
                One clip. Nine posts.
              </p>
              <p className="text-xs text-gray-300 mt-1">
                That is the whole economics of a content day.
              </p>
            </div>
          </div>

          <p className="mt-6 max-w-3xl text-sm leading-relaxed text-gray-400">
            Keep posting your own phone videos. We would never tell you to stop. The value is the
            mix: pro footage becomes the well you draw from, and it makes everything you shoot
            yourself look intentional.
          </p>
        </div>
      </section>

      {/* ── 4. Testimonials ───────────────────────────────────── */}
      <section className="py-14 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto grid gap-5 lg:grid-cols-3">
          {testimonials.map((t) => (
            <blockquote key={t.name} className="rounded-xl border border-white/10 bg-charcoal-dark p-6">
              <Quote className="h-5 w-5 text-cyan-brand mb-3" />
              <p className="text-base leading-relaxed text-gray-200">{t.quote}</p>
              <footer className="mt-4">
                <p className="font-heading text-sm font-semibold text-white">{t.name}</p>
                <p className="text-sm text-cyan-brand">{t.title}</p>
              </footer>
            </blockquote>
          ))}
        </div>
      </section>

      {/* ── 5. Price + close ──────────────────────────────────── */}
      <section className="py-14 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] items-center">
            <div>
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white mb-2">
                A shoot day, then whatever you want cut
              </h2>
              <p className="text-base text-gray-400 mb-5">
                Every camera captures the whole day, so more angles means more usable cuts from the
                same morning.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-charcoal-dark p-5">
                  <p className="font-heading text-3xl font-bold text-cyan-brand">${CAMERA_BASE}</p>
                  <p className="text-sm text-gray-400">first camera</p>
                  <p className="text-sm text-gray-500 mt-2">
                    +${CAMERA_ADDITIONAL} each additional
                  </p>
                </div>
                <ul className="rounded-xl border border-white/10 bg-charcoal-dark p-5 space-y-1.5">
                  {deliverables.map((d) => (
                    <li key={d.label} className="flex items-baseline justify-between gap-3">
                      <span className="text-sm text-gray-300">{d.label}</span>
                      <span className="font-heading text-sm font-semibold text-cyan-brand shrink-0">
                        ${d.price}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-3 text-xs text-gray-500">All prices CAD, plus HST.</p>
            </div>

            <div className="rounded-2xl border border-cyan-brand/30 bg-cyan-brand/5 p-7 text-center">
              <h3 className="font-heading text-xl font-bold text-white mb-2">
                Build it in about a minute
              </h3>
              <p className="text-sm text-gray-300 mb-5">
                Pick your cameras, pick your cuts, see the number. Then stop wondering what to post
                for the rest of the season.
              </p>
              <Link
                href="/dancepromo"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-brand px-6 py-4 font-heading text-base font-semibold text-charcoal-deep transition-transform duration-200 hover:scale-[1.02]"
              >
                Build your content day <ArrowRight className="h-5 w-5" />
              </Link>
              <p className="mt-3 text-xs text-gray-400">
                Nothing to book. No account. Nobody calls you.
              </p>
            </div>
          </div>

          <dl className="mt-12 grid gap-x-10 gap-y-5 sm:grid-cols-2">
            {faq.map((f) => (
              <div key={f.q}>
                <dt className="font-heading text-sm font-semibold text-white">{f.q}</dt>
                <dd className="text-sm leading-relaxed text-gray-400 mt-1">{f.a}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-xs text-gray-500">
            {["One shoot day", "A year of posts", "Raw footage included", "Ontario based"].map((b) => (
              <span key={b} className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-cyan-brand" /> {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
