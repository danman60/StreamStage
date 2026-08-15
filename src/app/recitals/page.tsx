import Link from "next/link";
import {
  Video,
  Radio,
  Camera,
  Users,
  Clock,
  Wallet,
  Check,
  ArrowRight,
  CalendarDays,
  Quote,
} from "lucide-react";
import RecitalNav from "@/components/RecitalNav";
import ScrollReveal from "@/components/ScrollReveal";
import Footer from "@/components/Footer";

/* Tier numbers mirror src/app/dancerecital/page.tsx and src/app/dance/page.tsx.
   The calculator stays the single source of truth for any real quote. */
const tiers = [
  { label: "Small Recital", range: "1–100 dancers", bundle: 35, note: "Standard pricing" },
  { label: "Medium Recital", range: "101–150 dancers", bundle: 30, note: "Volume discount" },
  { label: "Large Recital", range: "151+ dancers", bundle: 22, note: "Best value at scale" },
];

const included = [
  { icon: Video, title: "Multi-camera video", body: "Not one locked-off camera at the back of the room. Full stage, plus the angles that catch faces." },
  { icon: Radio, title: "Livestream", body: "Grandparents, a parent working out of town, family in another country. They watch it live." },
  { icon: Camera, title: "Photography", body: "Stills from the same show, the same night, the same team." },
  { icon: Users, title: "Professional operators", body: "Our crew runs it, so you get your recital day back." },
  { icon: Clock, title: "Up to 4 hrs consultation", body: "Planning time with you before the show, included." },
  { icon: Wallet, title: "All A/V equipment", body: "Cameras, audio, the lot. Nothing for you to rent or borrow." },
];

const testimonials = [
  {
    quote:
      "Working with Kayla and Dan was a dream. Their artistic eyes provide a unique perspective that captures the creative nuances and performance. Hands down the best experience we have ever had with a videographer.",
    name: "Christina Canella",
    title: "Founder, Artistic Movement Dance Studio",
  },
  {
    quote:
      "One of our dance moms messaged me about five minutes later saying this video is awesome. She saw the difference immediately.",
    name: "Studio owner",
    title: "Ontario",
  },
  {
    quote:
      "There is so much going on on recital day, and that was one thing I did not even have to think about.",
    name: "Studio director",
    title: "Ontario",
  },
];

const faq = [
  {
    q: "How does the money actually work?",
    a: "You set a media fee and charge it to your families. We bill you a flat rate per dancer. What is left over is yours. The calculator shows you both numbers before you commit to anything.",
  },
  {
    q: "We are a small studio. Is this worth it for us?",
    a: "The per-dancer rate is highest for small recitals and drops as your dancer count grows. Run your real numbers in the calculator and you will see exactly where you land, no conversation required.",
  },
  {
    q: "What if our recital is already close?",
    a: "Ask anyway. Recital weekends cluster, so some dates fill early and others stay open longer. A December show is usually easier to place than a peak spring Saturday.",
  },
  {
    q: "What do parents actually receive?",
    a: "A link, not a disc. They open it, find their dancer's routine, watch it and download it. No USB keys to lose, and nothing for your office to hand out.",
  },
];

export default function RecitalsPage() {
  return (
    <main className="bg-charcoal-deep min-h-screen">
      <RecitalNav ctaLabel="See Your Pricing" ctaHref="/dancerecital" />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative flex min-h-[85vh] items-center overflow-hidden px-4 sm:px-6">
        <video
          className="absolute inset-0 h-full w-full object-cover opacity-40"
          src="/campaign/recital-hero.mp4"
          poster="/campaign/recital-hero.jpg"
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
              Recital video, livestream &amp; photography
            </p>
            <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
              You charge the media fee.
              <br />
              <span className="text-cyan-brand">You keep the difference.</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg sm:text-xl text-gray-300 mb-10">
              Your dancers deserve better than a tripod in the back row. We shoot your recital
              properly, your families buy the video from you, and recital day stops being one more
              thing you have to manage.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/dancerecital"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-brand px-8 py-4 font-heading text-base font-semibold text-charcoal-deep transition-transform duration-200 hover:scale-[1.02]"
              >
                See your pricing <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="mailto:daniel@streamstage.live?subject=Recital%20video%20question"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-8 py-4 text-base font-medium text-gray-200 transition-colors hover:border-cyan-brand hover:text-cyan-brand"
              >
                Ask a question first
              </a>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              Takes about a minute. No account, and nobody calls you.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ── The proof shot ───────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-3">
                Same recital. Same moment.
              </h2>
              <p className="text-lg text-gray-400">
                This is the whole argument, and it takes about twenty seconds to see it.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid gap-6 sm:grid-cols-2">
            {[
              /* Verified matched pair: same routine, same dancers, same show. Wide vs close. */
              { src: "recital-wide", label: "What the room sees", note: "One angle, from the back, past everyone's heads." },
              { src: "recital-multicam", label: "What we capture", note: "Same routine, same moment, close enough to see her face." },
            ].map((v, i) => (
              <ScrollReveal key={v.src} delay={i * 0.1}>
                <figure className="overflow-hidden rounded-2xl border border-white/10 bg-charcoal-dark h-full">
                  <video
                    className="aspect-video w-full object-cover"
                    src={`/campaign/${v.src}.mp4`}
                    poster={`/campaign/${v.src}.jpg`}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="none"
                  />
                  <figcaption className="p-6">
                    <p className="font-heading text-lg font-semibold text-cyan-brand">{v.label}</p>
                    <p className="mt-1 text-base text-gray-400">{v.note}</p>
                  </figcaption>
                </figure>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── The problem ──────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-8 text-center">
              Recital day is already full
            </h2>
            <div className="space-y-5 text-lg leading-relaxed text-gray-300">
              <p>
                There is a run order to hold together, a hundred costumes moving in the wings, a
                lobby full of families, and someone at the door who needs you right now.
              </p>
              <p>
                Somewhere in the middle of that, the video has to happen. So it gets handed to a
                parent with a phone, or a camera on a tripod at the back, or a friend who films
                weddings. One studio told us their recording corrupted one year and the families
                got nothing at all.
              </p>
              <p className="font-heading text-xl font-semibold text-white">
                And the part nobody mentions: when the video is an afterthought, so is the revenue
                it could have made you.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── What you get ─────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-12 text-center">
              What you get
            </h2>
          </ScrollReveal>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {included.map((f, i) => (
              <ScrollReveal key={f.title} delay={i * 0.05}>
                <div className="rounded-2xl border border-white/10 bg-charcoal-dark p-6 h-full">
                  <f.icon className="h-7 w-7 text-cyan-brand" />
                  <h3 className="font-heading text-lg font-semibold text-white mt-4 mb-2">
                    {f.title}
                  </h3>
                  <p className="text-base leading-relaxed text-gray-400">{f.body}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── The revenue reframe ──────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <ScrollReveal>
            <p className="font-heading text-sm uppercase tracking-[0.2em] text-cyan-brand mb-5">
              The part most studios miss
            </p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-6">
              Your recital video should make you money, not cost you money
            </h2>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-gray-300 mb-10">
              You set the media fee your families pay. We charge you a flat rate per dancer. The
              difference is yours to keep, and the calculator shows you that number before you
              decide anything.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {["You set the fee", "We bill per dancer", "You keep the spread"].map((s, i) => (
                <div key={s} className="rounded-xl border border-white/10 bg-charcoal-mid p-6">
                  <p className="font-heading text-3xl font-bold text-cyan-brand">{i + 1}</p>
                  <p className="mt-2 text-base font-medium text-gray-200">{s}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Social proof ─────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-12 text-center">
              What studio directors say afterwards
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

      {/* ── Availability ─────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <div className="flex flex-col gap-6 rounded-2xl border border-amber-brand/30 bg-amber-brand/5 p-8 sm:flex-row sm:items-center">
              <CalendarDays className="h-10 w-10 shrink-0 text-amber-brand" />
              <div>
                <h2 className="font-heading text-xl font-semibold text-white mb-2">
                  Recital weekends collide, and we cannot be in two places
                </h2>
                <p className="text-base leading-relaxed text-gray-300">
                  Nearly every studio holds its show across the same handful of spring weekends,
                  and we have a finite number of crews. Two studios on the same Saturday means one
                  of them hears no. December shows are usually easier to place. If you know your
                  date, it costs nothing to put it on our board now.
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto text-center">
          <ScrollReveal>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-4">
              Priced per dancer. Published, not quoted.
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-400 mb-12">
              The bigger your recital, the less it costs per dancer. Video, livestream and
              photography together look like this:
            </p>
          </ScrollReveal>

          <div className="grid gap-6 sm:grid-cols-3">
            {tiers.map((t, i) => (
              <ScrollReveal key={t.label} delay={i * 0.1}>
                <div className="rounded-2xl border border-white/10 bg-charcoal-dark p-8 h-full">
                  <h3 className="font-heading text-lg font-semibold text-white">{t.label}</h3>
                  <p className="mt-1 text-sm text-gray-500">{t.range}</p>
                  <p className="mt-6 font-heading text-4xl font-bold text-cyan-brand">
                    ${t.bundle}
                  </p>
                  <p className="mt-1 text-sm text-gray-400">per dancer, all three</p>
                  <p className="mt-4 text-xs uppercase tracking-wider text-gray-600">{t.note}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal>
            <p className="mt-8 text-base text-gray-400">
              Video on its own costs less. Discounts stack for booking early, sharing your
              experience, and committing to three years.
            </p>
            <Link
              href="/dancerecital"
              className="mt-10 inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-brand px-8 py-4 font-heading text-base font-semibold text-charcoal-deep transition-transform duration-200 hover:scale-[1.02]"
            >
              Build your number <ArrowRight className="h-5 w-5" />
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
              See what your recital would cost
            </h2>
            <p className="text-lg text-gray-400 mb-8">
              Put in your dancer count, pick what you want, and the number appears. Nothing to
              book, and nobody calls you.
            </p>
            <Link
              href="/dancerecital"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-brand px-8 py-4 font-heading text-base font-semibold text-charcoal-deep transition-transform duration-200 hover:scale-[1.02]"
            >
              See your pricing <ArrowRight className="h-5 w-5" />
            </Link>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-gray-500">
              {["Multi-camera", "Livestream included", "You keep the revenue", "Ontario based"].map((b) => (
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
