import Link from "next/link";
import Image from "next/image";
import {
  Video,
  Radio,
  Camera,
  Users,
  Clock,
  Wallet,
  Globe,
  CalendarCheck,
  ArrowRight,
  Quote,
} from "lucide-react";
import RecitalNav from "@/components/RecitalNav";
import ScrollReveal from "@/components/ScrollReveal";
import Footer from "@/components/Footer";

/* Compact landing page: hero -> proof bar -> benefits -> proof -> testimonial -> price+close.
   Tier numbers mirror /dancerecital and /dance. The calculator is the source of truth. */
const tiers = [
  { label: "Small", range: "1–100 dancers", bundle: 35 },
  { label: "Medium", range: "101–150", bundle: 30 },
  { label: "Large", range: "151+", bundle: 22 },
];

const included = [
  { icon: Video, title: "Multi-camera", body: "Full stage plus the angles that catch faces." },
  { icon: Radio, title: "Livestream", body: "Family who can't be in the room watch it live." },
  { icon: Camera, title: "Your media, your mix", body: "Video, photography, livestream. Take what fits, or bundle all three." },
  { icon: Globe, title: "Branded portal", body: "Your studio's own portal. Families find their dancer and buy from you." },
  { icon: Clock, title: "10-day turnaround", body: "The link goes out while the show is still the talk of the lobby." },
  { icon: Users, title: "Our operators", body: "Our crew runs it. You get your day back." },
  { icon: Wallet, title: "All A/V gear", body: "Nothing for you to rent or borrow." },
  { icon: CalendarCheck, title: "4 hrs consultation", body: "Planning with you before the show." },
];

const logos = [
  "artistic-movement", "footprints-dance-centre", "bravo-academy", "elite-dance",
  "impact-dance-complex", "all-thats-dance", "canadian-dance-awards", "cbc-sports",
];

const testimonials = [
  {
    quote:
      "One of our dance moms messaged me about five minutes later saying this video is awesome. She saw the difference immediately.",
    name: "Kerry Moore",
    title: "Kerry Moore School of Dance",
  },
  {
    quote:
      "There is so much going on on recital day, and that was one thing I did not even have to think about.",
    name: "Mandy London",
    title: "Ancaster Dance Arts",
  },
  {
    quote:
      "Hands down the best experience we have ever had with a videographer.",
    name: "Christina Canella",
    title: "Artistic Movement Dance Studio",
  },
];

const faq = [
  { q: "How does the money work?", a: "You set a media fee for your families. We bill you per dancer. The difference is yours." },
  { q: "Small studio, still worth it?", a: "The per-dancer rate is highest for small shows and drops as your count grows." },
  { q: "What do parents get?", a: "A link, not a disc. They find their dancer's routine, watch it, download it." },
  { q: "Our date is close.", a: "Ask anyway. Spring weekends collide and crews are finite, but December usually has room." },
];

export default function RecitalsPage() {
  return (
    <main className="bg-charcoal-deep min-h-screen">
      <RecitalNav ctaLabel="See Your Pricing" ctaHref="/dancerecital" />

      {/* ── 1. Hero + inline how-it-works ─────────────────────── */}
      <section className="relative overflow-hidden px-4 sm:px-6 pt-28 pb-12 sm:pt-32 sm:pb-16 lg:flex lg:min-h-screen lg:items-center lg:pb-28">
        <video
          className="absolute inset-0 h-full w-full object-cover opacity-30"
          src="/campaign/recital-hero.mp4"
          poster="/campaign/recital-hero.jpg"
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
              Recital video, livestream &amp; photography
            </p>
            <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 leading-[1.05]">
              You charge the media fee.
              <br />
              <span className="text-cyan-brand">You keep the difference.</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-gray-300 mb-7">
              Your dancers deserve better than a tripod in the back row. We shoot the show, your
              families buy the video from you, and recital day gets easier.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Link
                href="/dancerecital"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-brand px-8 py-4 font-heading text-base font-semibold text-charcoal-deep transition-transform duration-200 hover:scale-[1.02]"
              >
                See your pricing <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="mailto:daniel@streamstage.live?subject=Recital%20video"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-6 py-4 text-base font-medium text-gray-200 transition-colors hover:border-cyan-brand hover:text-cyan-brand"
              >
                Ask a question
              </a>
            </div>
            <p className="mt-3 text-sm text-gray-500">Published pricing.</p>
          </div>

          {/* how it works, inline and dense */}
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {[
              { n: "1", t: "You set the media fee", d: "Whatever you charge families." },
              { n: "2", t: "We bill per dancer", d: "A flat published rate." },
              { n: "3", t: "You keep the spread", d: "The calculator shows it before you commit." },
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
      <section className="border-y border-white/5 py-10 lg:py-14 px-4 sm:px-6">
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

      {/* ── 3. What you get, dense grid ───────────────────────── */}
      <section className="py-16 lg:py-32 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid gap-x-10 gap-y-10 lg:gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {included.map((f) => (
              <div key={f.title} className="flex gap-3">
                <f.icon className="h-5 w-5 shrink-0 text-cyan-brand mt-1" />
                <div>
                  <h3 className="font-heading text-base font-semibold text-white">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-400">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. The proof shot ─────────────────────────────────── */}
      <section className="py-16 lg:py-32 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal>
            <div className="grid gap-6 lg:grid-cols-[1fr_1fr] items-center">
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { src: "recital-wide", label: "From the back row" },
                  { src: "recital-multicam", label: "What we capture" },
                ].map((v) => (
                  <figure key={v.src} className="overflow-hidden rounded-xl border border-white/10 bg-charcoal-dark">
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
                    <figcaption className="px-3 py-2 font-heading text-sm font-semibold text-cyan-brand">
                      {v.label}
                    </figcaption>
                  </figure>
                ))}
              </div>
              <div>
                <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white mb-3">
                  Same routine. Same moment.
                </h2>
                <p className="text-base leading-relaxed text-gray-300">
                  One camera at the back gets you heads and a distant stage. We shoot the room
                  properly, so a parent sees the face their kid makes when she lands it. That is
                  why families buy the video.
                </p>
              </div>
            </div>
          </ScrollReveal>

          {/* Directors on camera. Cut from the StreamStage services film shown at the expo booth. */}
          <ScrollReveal>
            <div className="mt-12 lg:mt-24 grid gap-6 lg:grid-cols-[1fr_1fr] items-center">
              <figure className="mx-auto w-full max-w-sm overflow-hidden rounded-xl border border-white/10 bg-charcoal-dark">
                <video
                  className="aspect-[4/5] w-full object-cover"
                  src="/campaign/services-proof.mp4"
                  poster="/campaign/services-proof.jpg"
                  controls
                  playsInline
                  preload="none"
                />
                <figcaption className="px-3 py-2 font-heading text-sm font-semibold text-cyan-brand">
                  Studio directors, in their own words
                </figcaption>
              </figure>
              <div>
                <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white mb-3">
                  Ask the studios who already did it.
                </h2>
                <p className="text-base leading-relaxed text-gray-300">
                  Kerry Moore and Alana Colver, on their own recitals. Ten day turnaround, and a
                  portal families buy from directly.
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── 4b. Highlight reels from this season ──────────────── */}
      <section className="py-16 lg:py-32 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-8">
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white mb-2">
                Fresh from this season&rsquo;s shows
              </h2>
              <p className="text-base text-gray-400">
                Highlight reels our studios shared with their families this year.
              </p>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { src: "seven-att", label: "7 Attitudes" },
              { src: "grad", label: "Grand River Academy of Dance" },
              { src: "lds", label: "Lindsay Dance Studio" },
              { src: "lhl", label: "Recital, Act 1" },
            ].map((r) => (
              <figure
                key={r.src}
                className="overflow-hidden rounded-xl border border-white/10 bg-charcoal-dark"
              >
                <video
                  className="aspect-[9/16] w-full object-cover"
                  src={`/campaign/reels/${r.src}.mp4`}
                  poster={`/campaign/reels/${r.src}.jpg`}
                  controls
                  muted
                  playsInline
                  preload="none"
                />
                <figcaption className="px-3 py-2 font-heading text-xs sm:text-sm font-semibold text-cyan-brand">
                  {r.label}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. Testimonials ───────────────────────────────────── */}
      <section className="py-16 lg:py-32 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto grid gap-10 lg:gap-12 lg:grid-cols-3">
          {testimonials.map((t) => (
            <blockquote key={t.name} className="rounded-xl border border-white/10 bg-charcoal-dark p-7 lg:p-8">
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

      {/* ── 6. Price + close, together ────────────────────────── */}
      <section className="py-16 lg:py-32 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="grid gap-12 lg:gap-16">
            <div>
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white mb-2">
                Priced per dancer. Published, not quoted.
              </h2>
              <p className="text-base text-gray-400 mb-5">
                Video, livestream and photography together. The bigger your recital, the less it
                costs per dancer.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {tiers.map((t) => (
                  <div key={t.label} className="rounded-xl border border-white/10 bg-charcoal-dark px-4 py-4 text-center">
                    <p className="font-heading text-2xl font-bold text-cyan-brand">${t.bundle}</p>
                    <p className="text-xs text-gray-400 mt-0.5">per dancer</p>
                    <p className="text-xs text-gray-500 mt-2">{t.label}</p>
                    <p className="text-[11px] text-gray-600">{t.range}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-500">All prices CAD, plus HST.</p>
            </div>

            <div className="mx-auto w-full max-w-xl rounded-2xl border border-cyan-brand/30 bg-cyan-brand/5 p-7 text-center">
              <h3 className="font-heading text-xl font-bold text-white mb-2">
                See your number in about a minute
              </h3>
              <p className="text-sm text-gray-300 mb-5">
                Enter your dancer count, pick what you want, and the total appears along with the
                media fee you would charge and what you would keep.
              </p>
              <Link
                href="/dancerecital"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-brand px-6 py-4 font-heading text-base font-semibold text-charcoal-deep transition-transform duration-200 hover:scale-[1.02]"
              >
                See your pricing <ArrowRight className="h-5 w-5" />
              </Link>
              <p className="mt-3 text-xs text-gray-400">
                Nothing to book. No account. Nobody calls you.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ── 7. Objections ─────────────────────────────────────── */}
      <section className="py-16 lg:py-32 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <dl className="grid gap-x-10 gap-y-7 sm:grid-cols-2">
            {faq.map((f) => (
              <div key={f.q}>
                <dt className="font-heading text-sm font-semibold text-white">{f.q}</dt>
                <dd className="text-sm leading-relaxed text-gray-400 mt-1">{f.a}</dd>
              </div>
            ))}
          </dl>

        </div>
      </section>

      <Footer />
    </main>
  );
}
