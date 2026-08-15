import Link from "next/link";
import Image from "next/image";
import { Video, Radio, Camera, Users, Clock, Wallet, ArrowRight, Quote } from "lucide-react";
import RecitalNav from "@/components/RecitalNav";
import Footer from "@/components/Footer";

/* VARIANT B. Built from a structural teardown of Vanta, Framer, Attio, Linear and Basecamp:
   those pages run 11 to 20 screens at 64 to 104 words per screen, with a visual on every one.
   Variant A runs 3 screens at 172 words per screen. B trades height for breathing room:
   one idea per screen, short copy, an image or clip every time. */

const tiers = [
  { label: "1–100 dancers", bundle: 35 },
  { label: "101–150", bundle: 30 },
  { label: "151+", bundle: 22 },
];

const included = [
  { icon: Video, t: "Multi-camera" },
  { icon: Radio, t: "Livestream" },
  { icon: Camera, t: "Photography" },
  { icon: Users, t: "Our crew, our gear" },
  { icon: Clock, t: "4 hrs planning" },
  { icon: Wallet, t: "You keep the revenue" },
];

const logos = [
  "artistic-movement", "footprints-dance-centre", "bravo-academy", "elite-dance",
  "impact-dance-complex", "all-thats-dance", "canadian-dance-awards", "cbc-sports",
];

const Cta = ({ label = "See your pricing" }: { label?: string }) => (
  <Link
    href="/dancerecital"
    className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-brand px-8 py-4 font-heading text-base font-semibold text-charcoal-deep transition-transform duration-200 hover:scale-[1.02]"
  >
    {label} <ArrowRight className="h-5 w-5" />
  </Link>
);

export default function RecitalsBPage() {
  return (
    <main className="bg-charcoal-deep">
      <RecitalNav ctaLabel="See Your Pricing" ctaHref="/dancerecital" />

      {/* 1 — hero */}
      <section className="relative flex min-h-[92vh] items-center overflow-hidden px-4 sm:px-6">
        <video
          className="absolute inset-0 h-full w-full object-cover opacity-35"
          src="/campaign/recital-hero.mp4"
          poster="/campaign/recital-hero.jpg"
          autoPlay muted loop playsInline preload="metadata" aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-charcoal-deep/80 via-charcoal-deep/60 to-charcoal-deep" />
        <div className="relative mx-auto w-full max-w-4xl text-center">
          <p className="font-heading text-sm uppercase tracking-[0.25em] text-cyan-brand mb-6">
            Dance recital media
          </p>
          <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl font-bold text-white leading-[1.02]">
            You keep
            <br />
            <span className="text-cyan-brand">the difference.</span>
          </h1>
          <p className="mx-auto mt-7 max-w-xl text-lg text-gray-300">
            You charge the media fee. We bill per dancer. The rest is yours.
          </p>
          <div className="mt-9"><Cta /></div>
          <p className="mt-4 text-sm text-gray-500">Published pricing. Nobody calls you.</p>
        </div>
      </section>

      {/* 2 — logos */}
      <section className="border-y border-white/5 py-9 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-center font-heading text-xs uppercase tracking-[0.18em] text-gray-500 mb-6">
            Studios, theatres and broadcasters
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 opacity-80">
            {logos.map((l) => (
              <Image key={l} src={`/logos-white/${l}.png`} alt="" width={120} height={38}
                className="h-9 w-auto object-contain sm:h-11" />
            ))}
          </div>
        </div>
      </section>

      {/* 3 — the proof, one idea */}
      <section className="flex min-h-[88vh] items-center px-4 sm:px-6 py-16">
        <div className="mx-auto w-full max-w-6xl">
          <h2 className="font-heading text-3xl sm:text-5xl font-bold text-white text-center mb-3">
            Same routine. Two cameras.
          </h2>
          <p className="text-center text-lg text-gray-400 mb-10">
            One of these is what the back row sees.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            {[
              { src: "recital-wide", label: "From the back row" },
              { src: "recital-multicam", label: "What we capture" },
            ].map((v) => (
              <figure key={v.src} className="overflow-hidden rounded-2xl border border-white/10">
                <video className="aspect-video w-full object-cover" src={`/campaign/${v.src}.mp4`}
                  poster={`/campaign/${v.src}.jpg`} autoPlay muted loop playsInline preload="none" />
                <figcaption className="bg-charcoal-dark px-4 py-3 font-heading text-base font-semibold text-cyan-brand">
                  {v.label}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* 4 — the money, one idea */}
      <section className="flex min-h-[80vh] items-center border-t border-white/5 px-4 sm:px-6 py-16">
        <div className="mx-auto w-full max-w-5xl text-center">
          <h2 className="font-heading text-3xl sm:text-5xl font-bold text-white mb-4">
            It should pay you.
          </h2>
          <p className="mx-auto max-w-xl text-lg text-gray-300 mb-12">
            Most studios treat recital video as a cost. It is a line you can earn on.
          </p>
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              { n: "1", t: "You set the fee" },
              { n: "2", t: "We bill per dancer" },
              { n: "3", t: "You keep the spread" },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border border-white/10 bg-charcoal-dark px-6 py-10">
                <p className="font-heading text-5xl font-bold text-cyan-brand">{s.n}</p>
                <p className="font-heading text-lg font-semibold text-white mt-4">{s.t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5 — the portal, one idea */}
      <section className="flex min-h-[85vh] items-center border-t border-white/5 px-4 sm:px-6 py-16">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="font-heading text-3xl sm:text-5xl font-bold text-white mb-4">
              Branded to your studio.
            </h2>
            <p className="text-lg leading-relaxed text-gray-300">
              Families buy from a storefront that looks like you, not like us. They get a link,
              find their dancer, and download the routine.
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <Image src="/campaign/shot-portal.png" alt="Branded recital media storefront"
              width={1200} height={800} className="w-full object-cover" />
          </div>
        </div>
      </section>

      {/* 6 — testimonial, one idea */}
      <section className="relative flex min-h-[80vh] items-center overflow-hidden border-t border-white/5 px-4 sm:px-6 py-16">
        <Image src="/campaign/still-kmsd.jpg" alt="" fill className="object-cover opacity-20" />
        <div className="relative mx-auto w-full max-w-3xl text-center">
          <Quote className="mx-auto h-8 w-8 text-cyan-brand mb-6" />
          <p className="font-heading text-2xl sm:text-4xl font-semibold leading-snug text-white">
            One of our dance moms messaged me about five minutes later saying this video is awesome.
          </p>
          <p className="mt-7 font-heading text-base font-semibold text-white">Kerry Moore</p>
          <p className="text-sm text-cyan-brand">Kerry Moore School of Dance</p>
        </div>
      </section>

      {/* 7 — what you get */}
      <section className="flex min-h-[70vh] items-center border-t border-white/5 px-4 sm:px-6 py-16">
        <div className="mx-auto w-full max-w-5xl">
          <h2 className="font-heading text-3xl sm:text-5xl font-bold text-white text-center mb-12">
            All of it, included.
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {included.map((f) => (
              <div key={f.t} className="rounded-2xl border border-white/10 bg-charcoal-dark px-6 py-8 text-center">
                <f.icon className="mx-auto h-7 w-7 text-cyan-brand" />
                <p className="font-heading text-base font-semibold text-white mt-4">{f.t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8 — second testimonial over a still */}
      <section className="relative flex min-h-[70vh] items-center overflow-hidden border-t border-white/5 px-4 sm:px-6 py-16">
        <Image src="/campaign/still-lds.jpg" alt="" fill className="object-cover opacity-20" />
        <div className="relative mx-auto w-full max-w-3xl text-center">
          <p className="font-heading text-2xl sm:text-4xl font-semibold leading-snug text-white">
            There is so much going on on recital day. That was one thing I did not even have to
            think about.
          </p>
          <p className="mt-7 font-heading text-base font-semibold text-white">Mandy London</p>
          <p className="text-sm text-cyan-brand">Ancaster Dance Arts</p>
        </div>
      </section>

      {/* 9 — pricing */}
      <section className="flex min-h-[80vh] items-center border-t border-white/5 px-4 sm:px-6 py-16">
        <div className="mx-auto w-full max-w-4xl text-center">
          <h2 className="font-heading text-3xl sm:text-5xl font-bold text-white mb-4">
            Priced per dancer.
          </h2>
          <p className="text-lg text-gray-400 mb-12">
            Video, livestream and photography together. Bigger show, lower rate.
          </p>
          <div className="grid gap-5 sm:grid-cols-3">
            {tiers.map((t) => (
              <div key={t.label} className="rounded-2xl border border-white/10 bg-charcoal-dark px-6 py-10">
                <p className="font-heading text-5xl font-bold text-cyan-brand">${t.bundle}</p>
                <p className="text-sm text-gray-400 mt-2">per dancer</p>
                <p className="text-sm text-gray-500 mt-4">{t.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-gray-500">CAD, plus HST. Video alone costs less.</p>
        </div>
      </section>

      {/* 10 — close */}
      <section className="flex min-h-[70vh] items-center border-t border-white/5 px-4 sm:px-6 py-16">
        <div className="mx-auto w-full max-w-2xl text-center">
          <h2 className="font-heading text-3xl sm:text-5xl font-bold text-white mb-5">
            See your number.
          </h2>
          <p className="text-lg text-gray-300 mb-9">
            About a minute. Nothing to book, and nobody calls you.
          </p>
          <Cta />
        </div>
      </section>

      <Footer />
    </main>
  );
}
