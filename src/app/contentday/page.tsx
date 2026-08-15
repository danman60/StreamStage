import Link from "next/link";
import {
  Film,
  Share2,
  Mic,
  Sparkles,
  Repeat,
  Layers,
  ArrowRight,
  Check,
  Quote,
} from "lucide-react";
import RecitalNav from "@/components/RecitalNav";
import ScrollReveal from "@/components/ScrollReveal";
import Footer from "@/components/Footer";

/* Pricing mirrors src/app/dancepromo/page.tsx. The builder there stays the source of truth. */
const CAMERA_BASE = 865;
const CAMERA_ADDITIONAL = 175;

const deliverables = [
  { label: "60 second promo film", price: 405, note: "The one you put on your homepage" },
  { label: "30 second cut", price: 200, note: "Ads and reels" },
  { label: "10 second cut", price: 115, note: "Stories and stingers" },
  { label: "All raw footage", price: 290, note: "Yours to keep pulling from" },
];

/* Format demos live in /public/campaign. Each is a real clip from a real content day. */
const formats = [
  { src: "example-dayinlife", icon: Sparkles, title: "Day in the life", body: "The studio as it actually feels on a busy evening." },
  { src: "example-interview", icon: Mic, title: "Interview", body: "You, a teacher or a parent, saying the thing you cannot say in a caption." },
  { src: "example-micd-up", icon: Mic, title: "Mic'd up", body: "A teacher wired for sound while they teach. People watch these to the end." },
  { src: "example-pov", icon: Film, title: "POV", body: "Shot from inside the room, the way a dancer sees it." },
  { src: "example-correction", icon: Repeat, title: "The correction", body: "A small coaching moment. This is the one parents share." },
];

const testimonials = [
  {
    quote:
      "Working with the team at StreamStage has been a dream. Both Dan and Kayla are knowledgeable about the dance world and were easy to work with when creating our vision. The content created showcased our brand and studio values incredibly well. I would highly recommend.",
    name: "Lainy Zimmer",
    title: "Owner, Footprints Dance Centre",
  },
  {
    quote:
      "I look at that raw footage probably once a week just to say, what can I pull out today and post. It was very, very valuable.",
    name: "Tiffany Adoranti",
    title: "Caledonia School of Dance",
  },
  {
    quote:
      "Take the leap, you won't be disappointed, and you'll be a repeat customer for sure.",
    name: "Nicole",
    title: "Stagecoach",
  },
];

const faq = [
  {
    q: "How long does a content day take?",
    a: "One morning at your studio, typically. Everyone in costume, hair and makeup done, lights up. We shoot it all at once and then spill the edits out over the following months.",
  },
  {
    q: "Do we still need to post our own phone videos?",
    a: "Yes, and you should. Phone content on its own is fine but thin. The point is the mix: the professional footage becomes the well you draw from all year, and it lifts everything you shoot yourself.",
  },
  {
    q: "What do we actually walk away with?",
    a: "A promo film, shorter cuts for social, background video that makes your website feel alive, and the raw footage. Studios tell us the raw footage is the part they keep going back to.",
  },
  {
    q: "When should we do it?",
    a: "Early enough that you are posting from it all season rather than scrambling for something to put up. Autumn dates fill first because everyone wants content before the season is underway.",
  },
];

export default function ContentDayPage() {
  return (
    <main className="bg-charcoal-deep min-h-screen">
      <RecitalNav ctaLabel="Build Your Content Day" ctaHref="/dancepromo" />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative flex min-h-[85vh] items-center overflow-hidden px-4 sm:px-6">
        <video
          className="absolute inset-0 h-full w-full object-cover opacity-40"
          src="/campaign/example-dayinlife.mp4"
          poster="/campaign/example-dayinlife.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-charcoal-deep/80 via-charcoal-deep/60 to-charcoal-deep" />

        <div className="relative mx-auto w-full max-w-4xl py-24 text-center">
          <ScrollReveal>
            <p className="font-heading text-sm uppercase tracking-[0.2em] text-cyan-brand mb-6">
              The content day
            </p>
            <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
              One morning in.
              <br />
              <span className="text-cyan-brand">Twelve months of posts out.</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg sm:text-xl text-gray-300 mb-10">
              Do the hard thing once and let it pay you back all year. We shoot your studio for a
              morning, then you spend the next twelve months posting from it instead of wondering
              what to post.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/dancepromo"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-brand px-8 py-4 font-heading text-base font-semibold text-charcoal-deep transition-transform duration-200 hover:scale-[1.02]"
              >
                Build your content day <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="mailto:daniel@streamstage.live?subject=Content%20day%20question"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-8 py-4 text-base font-medium text-gray-200 transition-colors hover:border-cyan-brand hover:text-cyan-brand"
              >
                Ask a question first
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── The problem ──────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-8 text-center">
              Most studios make content the exhausting way
            </h2>
            <div className="space-y-5 text-lg leading-relaxed text-gray-300">
              <p>
                Shoot a thing. Edit the thing. Post the thing. Then get up tomorrow and do it
                again. It is relentless, and it is the reason the posting stops every February.
              </p>
              <p>
                And because it is made piecemeal, it looks piecemeal. One post here, a completely
                different vibe there, until your feed reads like three different studios run by
                three people who have never met.
              </p>
              <p className="font-heading text-xl font-semibold text-white">
                The fix is not posting more often. It is shooting once, properly, and drawing from
                it all year.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── The formats ──────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-3">
                What one morning produces
              </h2>
              <p className="text-lg text-gray-400">
                Five formats, all shot the same day. Every clip below is real work.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {formats.map((f, i) => (
              <ScrollReveal key={f.src} delay={i * 0.05}>
                <figure className="overflow-hidden rounded-2xl border border-white/10 bg-charcoal-dark h-full">
                  <video
                    className="aspect-video w-full object-cover"
                    src={`/campaign/${f.src}.mp4`}
                    poster={`/campaign/${f.src}.jpg`}
                    muted
                    loop
                    playsInline
                    preload="none"
                    controls
                  />
                  <figcaption className="p-6">
                    <f.icon className="h-6 w-6 text-cyan-brand mb-3" />
                    <p className="font-heading text-lg font-semibold text-white">{f.title}</p>
                    <p className="mt-1 text-base text-gray-400">{f.body}</p>
                  </figcaption>
                </figure>
              </ScrollReveal>
            ))}

            <ScrollReveal delay={0.25}>
              <div className="flex h-full flex-col justify-center rounded-2xl border border-cyan-brand/30 bg-cyan-brand/5 p-8">
                <Layers className="h-8 w-8 text-cyan-brand" />
                <p className="font-heading text-2xl font-bold text-white mt-4">
                  One clip. Nine posts.
                </p>
                <p className="mt-2 text-base leading-relaxed text-gray-300">
                  A single piece of footage gets cut, captioned and remixed into a month of
                  content. That is the whole economics of a content day.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Pro feeds UGC ────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <ScrollReveal>
            <p className="font-heading text-sm uppercase tracking-[0.2em] text-cyan-brand mb-5">
              Straight answer
            </p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-6">
              Keep posting your own videos. Just give yourself better material.
            </h2>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-gray-300">
              We would never tell you to drop the phone content because you have professional
              footage, or to skip professional footage because you post from your phone. The value
              is in the mix. Pro feeds everything else: you cut verticals from it, caption it,
              remix it, and it makes the rest of your feed look intentional.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Social proof ─────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-12 text-center">
              What studios do with it afterwards
            </h2>
          </ScrollReveal>
          <div className="grid gap-6 lg:grid-cols-3">
            {testimonials.map((t, i) => (
              <ScrollReveal key={t.quote.slice(0, 24)} delay={i * 0.1}>
                <blockquote className="flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-charcoal-dark p-8">
                  <div>
                    <Quote className="h-6 w-6 text-cyan-brand mb-4" />
                    <p className="text-lg leading-relaxed text-gray-200">{t.quote}</p>
                  </div>
                  <footer className="mt-6">
                    <p className="font-heading text-base font-semibold text-white">{t.name}</p>
                    <p className="text-sm text-cyan-brand">{t.title}</p>
                  </footer>
                </blockquote>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto text-center">
          <ScrollReveal>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-4">
              Priced by the day, then by what you want cut
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-400 mb-12">
              A shoot day plus whichever deliverables you actually need. Build the exact
              combination in the planner.
            </p>
          </ScrollReveal>

          <div className="grid gap-6 sm:grid-cols-2">
            <ScrollReveal>
              <div className="rounded-2xl border border-white/10 bg-charcoal-dark p-8 h-full text-left">
                <h3 className="font-heading text-lg font-semibold text-white">The shoot day</h3>
                <p className="mt-6 font-heading text-4xl font-bold text-cyan-brand">
                  ${CAMERA_BASE}
                </p>
                <p className="mt-1 text-sm text-gray-400">first camera</p>
                <p className="mt-4 text-base text-gray-300">
                  Each additional camera adds ${CAMERA_ADDITIONAL}. Every camera captures the whole
                  day, so more angles means more usable cuts from the same morning.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <div className="rounded-2xl border border-white/10 bg-charcoal-dark p-8 h-full text-left">
                <h3 className="font-heading text-lg font-semibold text-white mb-4">
                  Then pick your cuts
                </h3>
                <ul className="space-y-3">
                  {deliverables.map((d) => (
                    <li key={d.label} className="flex items-baseline justify-between gap-4">
                      <span className="text-base text-gray-300">
                        {d.label}
                        <span className="block text-sm text-gray-500">{d.note}</span>
                      </span>
                      <span className="font-heading text-lg font-semibold text-cyan-brand shrink-0">
                        ${d.price}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>
          </div>

          <ScrollReveal>
            <Link
              href="/dancepromo"
              className="mt-10 inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-brand px-8 py-4 font-heading text-base font-semibold text-charcoal-deep transition-transform duration-200 hover:scale-[1.02]"
            >
              Build your content day <ArrowRight className="h-5 w-5" />
            </Link>
            <p className="mt-3 text-sm text-gray-500">All prices in CAD, plus HST.</p>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Objections ───────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-10 text-center">
              Before you ask
            </h2>
          </ScrollReveal>
          <dl className="space-y-8">
            {faq.map((f, i) => (
              <ScrollReveal key={f.q} delay={i * 0.05}>
                <div className="border-b border-white/5 pb-8">
                  <dt className="font-heading text-lg font-semibold text-white">{f.q}</dt>
                  <dd className="mt-3 text-base leading-relaxed text-gray-400">{f.a}</dd>
                </div>
              </ScrollReveal>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Close ────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-4">
              Stop wondering what to post
            </h2>
            <p className="text-lg text-gray-400 mb-8">
              Pick your cameras, pick your cuts, see the number. Nothing to book, and nobody calls
              you.
            </p>
            <Link
              href="/dancepromo"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-brand px-8 py-4 font-heading text-base font-semibold text-charcoal-deep transition-transform duration-200 hover:scale-[1.02]"
            >
              Build your content day <ArrowRight className="h-5 w-5" />
            </Link>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-gray-500">
              {["One shoot day", "A year of posts", "Raw footage included", "Ontario based"].map((b) => (
                <span key={b} className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4 text-cyan-brand" /> {b}
                </span>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      <Footer />
    </main>
  );
}
