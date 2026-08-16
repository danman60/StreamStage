import Link from "next/link";
import Image from "next/image";
import { Layers, ArrowRight, Quote } from "lucide-react";
import RecitalNav from "@/components/RecitalNav";
import Footer from "@/components/Footer";

/* VARIANT B. Same thesis as /contentday, restructured on the measured pattern: more screens,
   one idea each, short copy, a visual every time. */

const CAMERA_BASE = 865;
const CAMERA_ADDITIONAL = 175;

const deliverables = [
  { label: "60 second promo film", price: 405 },
  { label: "30 second cut", price: 200 },
  { label: "10 second cut", price: 115 },
  { label: "All raw footage", price: 290 },
];

/* StreamStage's own work only, verified by frame 2026-08-16. The former example-*.mp4 clips
   were other accounts' posts from the expo talk's credited audit slide. Do not restore them. */
const formats = [
  { src: "fmt-owner-oncamera", title: "Owner on camera" },
  { src: "fmt-class-in-motion", title: "Class in motion" },
  { src: "fmt-studio-culture", title: "Studio culture" },
  { src: "fmt-studio-tour", title: "Studio tour and team" },
  { src: "fmt-cinematic", title: "Cinematic studio shoot" },
];

const logos = [
  "footprints-dance-centre", "artistic-movement", "bravo-academy", "elite-dance",
  "impact-dance-complex", "all-thats-dance", "canadian-dance-awards", "cbc-sports",
];

const Cta = ({ label = "Build your content day" }: { label?: string }) => (
  <Link
    href="/dancepromo"
    className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-brand px-8 py-4 font-heading text-base font-semibold text-charcoal-deep transition-transform duration-200 hover:scale-[1.02]"
  >
    {label} <ArrowRight className="h-5 w-5" />
  </Link>
);

export default function ContentDayBPage() {
  return (
    <main className="bg-charcoal-deep">
      <RecitalNav ctaLabel="Build Your Content Day" ctaHref="/dancepromo" />

      {/* 1 — hero */}
      <section className="relative flex min-h-[92vh] items-center overflow-hidden px-4 sm:px-6">
        <video
          className="absolute inset-0 h-full w-full object-cover opacity-35"
          src="/campaign/contentday-hero.mp4"
          poster="/campaign/contentday-hero.jpg"
          autoPlay muted loop playsInline preload="metadata" aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-charcoal-deep/80 via-charcoal-deep/60 to-charcoal-deep" />
        <div className="relative mx-auto w-full max-w-4xl text-center">
          <p className="font-heading text-sm uppercase tracking-[0.25em] text-cyan-brand mb-6">
            The content day
          </p>
          <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl font-bold text-white leading-[1.02]">
            One morning.
            <br />
            <span className="text-cyan-brand">A year of posts.</span>
          </h1>
          <p className="mx-auto mt-7 max-w-xl text-lg text-gray-300">
            Do the hard thing once, then spend the season posting from it.
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

      {/* 3 — the problem */}
      <section className="flex min-h-[75vh] items-center px-4 sm:px-6 py-16">
        <div className="mx-auto w-full max-w-3xl text-center">
          <h2 className="font-heading text-3xl sm:text-5xl font-bold text-white mb-6">
            Shoot. Edit. Post. Repeat.
          </h2>
          <p className="text-lg leading-relaxed text-gray-300">
            That is how most studios make content, and it is why the posting stops every February.
            Made piecemeal, it looks piecemeal.
          </p>
        </div>
      </section>

      {/* 4 — the formats */}
      <section className="flex min-h-[88vh] items-center border-t border-white/5 px-4 sm:px-6 py-16">
        <div className="mx-auto w-full max-w-6xl">
          <h2 className="font-heading text-3xl sm:text-5xl font-bold text-white text-center mb-3">
            Five formats. One morning.
          </h2>
          <p className="text-center text-lg text-gray-400 mb-10">Every clip below is our own work, from five different studios.</p>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {formats.map((f) => (
              <figure key={f.src} className="overflow-hidden rounded-2xl border border-white/10">
                <video className="aspect-[4/5] w-full object-cover" src={`/campaign/${f.src}.mp4`}
                  poster={`/campaign/${f.src}.jpg`} muted loop playsInline preload="none" controls />
                <figcaption className="bg-charcoal-dark px-3 py-2.5 font-heading text-sm font-semibold text-white">
                  {f.title}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* 5 — the economics */}
      <section className="relative flex min-h-[70vh] items-center overflow-hidden border-t border-white/5 px-4 sm:px-6 py-16">
        <Image src="/campaign/still-footprints.jpg" alt="" fill className="object-cover opacity-20" />
        <div className="relative mx-auto w-full max-w-3xl text-center">
          <Layers className="mx-auto h-9 w-9 text-cyan-brand mb-6" />
          <h2 className="font-heading text-4xl sm:text-6xl font-bold text-white">
            One clip. Nine posts.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-gray-300">
            That is the whole economics of a content day.
          </p>
        </div>
      </section>

      {/* 6 — testimonial */}
      <section className="relative flex min-h-[75vh] items-center overflow-hidden border-t border-white/5 px-4 sm:px-6 py-16">
        <Image src="/campaign/still-grandriver.jpg" alt="" fill className="object-cover opacity-20" />
        <div className="relative mx-auto w-full max-w-3xl text-center">
          <Quote className="mx-auto h-8 w-8 text-cyan-brand mb-6" />
          <p className="font-heading text-2xl sm:text-4xl font-semibold leading-snug text-white">
            I look at that raw footage about once a week just to say, what can I pull out today and
            post.
          </p>
          <p className="mt-7 font-heading text-base font-semibold text-white">Tiffany Adoranti</p>
          <p className="text-sm text-cyan-brand">Caledonia School of Dance</p>
        </div>
      </section>

      {/* 7 — pro feeds UGC */}
      <section className="flex min-h-[65vh] items-center border-t border-white/5 px-4 sm:px-6 py-16">
        <div className="mx-auto w-full max-w-3xl text-center">
          <h2 className="font-heading text-3xl sm:text-5xl font-bold text-white mb-6">
            Keep posting your phone videos.
          </h2>
          <p className="text-lg leading-relaxed text-gray-300">
            We would never tell you to stop. Pro footage is the well you draw from, and it makes
            everything you shoot yourself look intentional.
          </p>
        </div>
      </section>

      {/* 8 — pricing */}
      <section className="flex min-h-[80vh] items-center border-t border-white/5 px-4 sm:px-6 py-16">
        <div className="mx-auto w-full max-w-4xl text-center">
          <h2 className="font-heading text-3xl sm:text-5xl font-bold text-white mb-4">
            A day, then your cuts.
          </h2>
          <p className="text-lg text-gray-400 mb-12">
            Every camera captures the whole day, so more angles means more usable cuts.
          </p>
          <div className="grid gap-5 sm:grid-cols-2 text-left">
            <div className="rounded-2xl border border-white/10 bg-charcoal-dark px-7 py-9">
              <p className="font-heading text-5xl font-bold text-cyan-brand">${CAMERA_BASE}</p>
              <p className="text-sm text-gray-400 mt-2">first camera</p>
              <p className="text-sm text-gray-500 mt-4">+${CAMERA_ADDITIONAL} each additional</p>
            </div>
            <ul className="rounded-2xl border border-white/10 bg-charcoal-dark px-7 py-9 space-y-3">
              {deliverables.map((d) => (
                <li key={d.label} className="flex items-baseline justify-between gap-4">
                  <span className="text-base text-gray-300">{d.label}</span>
                  <span className="font-heading text-base font-semibold text-cyan-brand shrink-0">
                    ${d.price}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-6 text-sm text-gray-500">CAD, plus HST.</p>
        </div>
      </section>

      {/* 9 — close */}
      <section className="flex min-h-[70vh] items-center border-t border-white/5 px-4 sm:px-6 py-16">
        <div className="mx-auto w-full max-w-2xl text-center">
          <h2 className="font-heading text-3xl sm:text-5xl font-bold text-white mb-5">
            Stop wondering what to post.
          </h2>
          <p className="text-lg text-gray-300 mb-9">
            Pick your cameras, pick your cuts, see the number.
          </p>
          <Cta />
        </div>
      </section>

      <Footer />
    </main>
  );
}
