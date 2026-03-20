import type { Metadata } from "next";
import Link from "next/link";
import { Video, Radio, Camera, Film, Share2, ArrowRight, ArrowDown, Quote } from "lucide-react";
import RecitalNav from "@/components/RecitalNav";
import ScrollReveal from "@/components/ScrollReveal";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Dance Media Services — Recitals, Promos & Social Content | StreamStage",
  description:
    "Professional multi-camera recital video, livestreaming, photography, promotional videos, and social content for dance studios. Transparent per-dancer pricing. You keep 100% of the revenue. Ontario, Canada.",
  alternates: { canonical: "/dance" },
  openGraph: {
    title: "Dance Media Services | StreamStage",
    description:
      "Recital media, promotional videos, and social content for dance studios. You keep all the revenue.",
    url: "https://streamstage.live/dance",
  },
};

const recitalServices = [
  {
    icon: Video,
    title: "Video",
    features: [
      "Multi-camera professional recording",
      "1-week turnaround time",
      "On-screen titles per routine",
      "Digital download delivery",
      "Social highlight reel included",
    ],
  },
  {
    icon: Radio,
    title: "Livestreaming",
    features: [
      "Professional live streaming setup",
      "Viewing page hosted at streamstage.live",
      "Unlimited viewers worldwide",
      "Real-time broadcast during event",
      "Recording available afterward",
    ],
  },
  {
    icon: Camera,
    title: "Photography",
    features: [
      "Dedicated professional photographer",
      "10\u201315 high-quality stills per routine",
      "Professional editing & colour correction",
      "Digital download delivery",
      "High-resolution images for printing",
    ],
  },
];

const promoServices = [
  {
    icon: Film,
    title: "Promotional Videos",
    description:
      "Cinematic promos that capture the energy of your studio, company, or production. Perfect for your website, enrollment campaigns, and open house events.",
    features: [
      "Studio & brand promos",
      "Enrollment campaign videos",
      "Season announcement reels",
      "Open house & event teasers",
    ],
  },
  {
    icon: Share2,
    title: "Social Content",
    description:
      "Short-form, platform-optimized content built to drive engagement and enrollment. Delivered ready to post.",
    features: [
      "Instagram Reels & Stories",
      "TikTok & YouTube Shorts",
      "Routine & rehearsal highlights",
      "Behind-the-scenes content",
    ],
  },
];

const tiers = [
  {
    label: "Small Recital",
    range: "1\u2013100 dancers",
    video: 25,
    streaming: 5,
    photo: 8,
    bundle: 35,
    note: "Standard pricing",
  },
  {
    label: "Medium Recital",
    range: "101\u2013150 dancers",
    video: 25,
    streaming: 3,
    photo: 7,
    bundle: 30,
    note: "Volume discount",
  },
  {
    label: "Large Recital",
    range: "151+ dancers",
    video: 18,
    streaming: 2,
    photo: 5,
    bundle: 22,
    note: "Best value at scale",
  },
];

const testimonials = [
  {
    quote:
      "Daniel and StreamStage reinvented the dance competition video model. Multi camera angles, backstage glimpses, tight close ups, and crisp graphics give teachers, dancers, and parents a high quality twist on recital media.",
    name: "Kiri Lyn Muir",
    title: "Director, Ultimate Dance Connection",
  },
  {
    quote:
      "Working with StreamStage was a dream. Dan and Kayla understood the dance world, and the content showcased our brand and studio values beautifully.",
    name: "Lainy Zimmer",
    title: "Owner, Footprints Dance Centre",
  },
];

export default function DancePage() {
  return (
    <>
      <RecitalNav ctaHref="/dance/proposal" ctaLabel="Build Your Proposal" />
      <main className="min-h-screen">
        {/* ───── Hero ───── */}
        <section className="pt-32 sm:pt-40 pb-20 sm:pb-28 text-center px-4 sm:px-6">
          <div className="max-w-3xl mx-auto">
            <ScrollReveal>
              <span className="inline-block text-cyan-brand text-sm font-semibold tracking-widest uppercase mb-4">
                Dance Media Services
              </span>
            </ScrollReveal>
            <ScrollReveal delay={0.05}>
              <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
                Your Performance, Elevated
              </h1>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <p className="text-lg sm:text-xl text-gray-400 leading-relaxed mb-10 max-w-2xl mx-auto">
                From recital day coverage to year-round promo content, we help
                dance studios look incredible on every screen.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={0.15}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href="#recitals"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-lg border border-cyan-brand/30 text-cyan-brand hover:bg-cyan-brand/10 transition-all duration-200"
                >
                  Recital Media <ArrowDown size={16} />
                </a>
                <a
                  href="#promos"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 transition-all duration-200"
                >
                  Promos & Social <ArrowDown size={16} />
                </a>
                <Link
                  href="/dance/proposal"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-lg bg-cyan-brand text-charcoal-deep hover:bg-cyan-brand/90 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-brand/20"
                >
                  Build Your Proposal <ArrowRight size={16} />
                </Link>
              </div>
            </ScrollReveal>

            {/* Stats */}
            <ScrollReveal delay={0.2}>
              <div className="flex items-center justify-center gap-8 sm:gap-12 mt-14 text-center">
                {[
                  ["100+", "Events Filmed"],
                  ["500+", "Videos Produced"],
                  ["50+", "Dance Studios"],
                ].map(([num, label]) => (
                  <div key={label}>
                    <p className="font-heading text-2xl sm:text-3xl font-bold text-white">
                      {num}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </section>

        <div className="section-divider max-w-4xl mx-auto" />

        {/* ───── Recital Services ───── */}
        <section id="recitals" className="py-20 px-4 sm:px-6 scroll-mt-24">
          <div className="max-w-6xl mx-auto">
            <ScrollReveal>
              <div className="text-center mb-14">
                <span className="inline-block text-cyan-brand text-sm font-semibold tracking-widest uppercase mb-3">
                  Recital Media
                </span>
                <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-3">
                  Complete Recital Coverage
                </h2>
                <p className="text-gray-400 max-w-2xl mx-auto">
                  Everything your recital needs&nbsp;&mdash; multi-camera video,
                  livestreaming for remote families, and professional photography.
                </p>
              </div>
            </ScrollReveal>

            <div className="grid md:grid-cols-3 gap-6">
              {recitalServices.map((svc, i) => (
                <ScrollReveal key={svc.title} delay={i * 0.1}>
                  <div className="p-6 rounded-xl bg-charcoal-dark/60 border border-white/5 h-full">
                    <div className="w-12 h-12 rounded-lg bg-cyan-brand/10 flex items-center justify-center mb-4">
                      <svc.icon
                        className="text-cyan-brand"
                        size={24}
                        strokeWidth={1.5}
                      />
                    </div>
                    <h3 className="font-heading text-lg font-semibold text-white mb-4">
                      {svc.title}
                    </h3>
                    <ul className="space-y-2">
                      {svc.features.map((f) => (
                        <li
                          key={f}
                          className="flex items-start gap-2 text-sm text-gray-400"
                        >
                          <span className="text-cyan-brand mt-0.5 shrink-0">
                            &#10003;
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            <ScrollReveal delay={0.3}>
              <p className="text-center text-sm text-gray-500 mt-8">
                All A/V equipment provided &middot; Up to 4 hours consultation
                included &middot; 1-week turnaround on all deliverables
              </p>
            </ScrollReveal>
          </div>
        </section>

        <div className="section-divider max-w-4xl mx-auto" />

        {/* ───── Revenue Callout ───── */}
        <section className="py-20 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <ScrollReveal>
              <div className="rounded-2xl border border-cyan-brand/20 bg-cyan-brand/5 p-8 sm:p-12">
                <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white text-center mb-6">
                  You Keep 100% of the Revenue
                </h2>
                <p className="text-gray-400 text-center max-w-2xl mx-auto mb-10 leading-relaxed">
                  StreamStage charges a transparent per-dancer fee. You set a
                  media fee for parents&nbsp;&mdash; whatever you choose. The
                  difference is profit to your studio.
                </p>

                <div className="grid sm:grid-cols-3 gap-4 text-center">
                  <div className="p-5 rounded-xl bg-charcoal-dark/60">
                    <p className="text-sm text-gray-500 mb-1">
                      StreamStage Cost
                    </p>
                    <p className="font-heading text-xl font-bold text-white">
                      $25
                      <span className="text-sm font-normal text-gray-400">
                        /dancer
                      </span>
                    </p>
                  </div>
                  <div className="p-5 rounded-xl bg-charcoal-dark/60">
                    <p className="text-sm text-gray-500 mb-1">
                      Your Media Fee
                    </p>
                    <p className="font-heading text-xl font-bold text-white">
                      $30
                      <span className="text-sm font-normal text-gray-400">
                        /dancer
                      </span>
                    </p>
                  </div>
                  <div className="p-5 rounded-xl bg-cyan-brand/10 border border-cyan-brand/20">
                    <p className="text-sm text-cyan-brand mb-1">
                      Profit to Studio
                    </p>
                    <p className="font-heading text-xl font-bold text-cyan-brand">
                      $500
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      on 100 dancers
                    </p>
                  </div>
                </div>

                <p className="text-sm text-gray-500 text-center mt-6">
                  With all three services bundled at $35/dancer and a $45 media
                  fee, the same 100 dancers generate $1,000 in studio profit.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </section>

        <div className="section-divider max-w-4xl mx-auto" />

        {/* ───── Promos & Social ───── */}
        <section id="promos" className="py-20 px-4 sm:px-6 scroll-mt-24">
          <div className="max-w-5xl mx-auto">
            <ScrollReveal>
              <div className="text-center mb-14">
                <span className="inline-block text-cyan-brand text-sm font-semibold tracking-widest uppercase mb-3">
                  Year-Round Content
                </span>
                <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-3">
                  Promos & Social Content
                </h2>
                <p className="text-gray-400 max-w-2xl mx-auto">
                  Your studio deserves content that works as hard as you do.
                  Promotional videos and social media content that drive
                  enrollment and showcase your brand.
                </p>
              </div>
            </ScrollReveal>

            <div className="grid md:grid-cols-2 gap-6">
              {promoServices.map((svc, i) => (
                <ScrollReveal key={svc.title} delay={i * 0.1}>
                  <div className="p-6 sm:p-8 rounded-xl bg-charcoal-dark/60 border border-white/5 h-full">
                    <div className="w-12 h-12 rounded-lg bg-cyan-brand/10 flex items-center justify-center mb-4">
                      <svc.icon
                        className="text-cyan-brand"
                        size={24}
                        strokeWidth={1.5}
                      />
                    </div>
                    <h3 className="font-heading text-lg font-semibold text-white mb-2">
                      {svc.title}
                    </h3>
                    <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                      {svc.description}
                    </p>
                    <ul className="space-y-2">
                      {svc.features.map((f) => (
                        <li
                          key={f}
                          className="flex items-start gap-2 text-sm text-gray-400"
                        >
                          <span className="text-cyan-brand mt-0.5 shrink-0">
                            &#10003;
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            <ScrollReveal delay={0.2}>
              <div className="text-center mt-10">
                <a
                  href="/#contact"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-lg border border-cyan-brand/30 text-cyan-brand hover:bg-cyan-brand/10 transition-all duration-200"
                >
                  Get a Custom Quote <ArrowRight size={16} />
                </a>
                <p className="text-xs text-gray-500 mt-3">
                  Promo and social content projects are quoted individually based
                  on scope.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </section>

        <div className="section-divider max-w-4xl mx-auto" />

        {/* ───── Testimonials ───── */}
        <section className="py-20 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <ScrollReveal>
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white text-center mb-12">
                What Studio Owners Say
              </h2>
            </ScrollReveal>
            <div className="grid md:grid-cols-2 gap-6">
              {testimonials.map((t, i) => (
                <ScrollReveal key={t.name} delay={i * 0.1}>
                  <div className="p-6 sm:p-8 rounded-xl bg-charcoal-dark/60 border border-white/5 h-full flex flex-col">
                    <Quote
                      size={24}
                      className="text-cyan-brand/30 mb-4 shrink-0"
                    />
                    <p className="text-gray-300 leading-relaxed italic flex-1">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                    <div className="mt-6 pt-4 border-t border-white/5">
                      <p className="font-heading font-semibold text-cyan-brand">
                        {t.name}
                      </p>
                      <p className="text-sm text-gray-500">{t.title}</p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        <div className="section-divider max-w-4xl mx-auto" />

        {/* ───── Pricing ───── */}
        <section id="pricing" className="py-20 px-4 sm:px-6 scroll-mt-24">
          <div className="max-w-5xl mx-auto">
            <ScrollReveal>
              <div className="text-center mb-14">
                <span className="inline-block text-cyan-brand text-sm font-semibold tracking-widest uppercase mb-3">
                  Recital Pricing
                </span>
                <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-4">
                  Simple Per-Dancer Pricing
                </h2>
                <p className="text-gray-400">
                  Volume discounts at 100+ and 150+ dancers. Stackable discounts
                  available&nbsp;&mdash; save up to 15%.
                </p>
              </div>
            </ScrollReveal>

            <div className="grid md:grid-cols-3 gap-6">
              {tiers.map((tier, i) => (
                <ScrollReveal key={tier.label} delay={i * 0.1}>
                  <div className="rounded-xl bg-charcoal-dark/60 border border-white/5 overflow-hidden h-full flex flex-col">
                    <div className="p-6 text-center border-b border-white/5">
                      <h3 className="font-heading text-lg font-semibold text-white">
                        {tier.label}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        ({tier.range})
                      </p>
                    </div>
                    <div className="p-6 space-y-3 flex-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Video</span>
                        <span className="text-white font-medium">
                          ${tier.video}/dancer
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">+ Streaming</span>
                        <span className="text-white font-medium">
                          +${tier.streaming}/dancer
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">+ Photo</span>
                        <span className="text-white font-medium">
                          +${tier.photo}/dancer
                        </span>
                      </div>
                    </div>
                    <div className="p-6 bg-cyan-brand/5 border-t border-cyan-brand/10 text-center">
                      <p className="text-sm text-gray-400">All 3 for</p>
                      <p className="font-heading text-xl font-bold text-cyan-brand">
                        ${tier.bundle}
                        <span className="text-sm font-normal text-gray-400">
                          /dancer
                        </span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{tier.note}</p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        <div className="section-divider max-w-4xl mx-auto" />

        {/* ───── CTA ───── */}
        <section className="py-20 sm:py-28 px-4 sm:px-6 text-center">
          <div className="max-w-2xl mx-auto">
            <ScrollReveal>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-4">
                Ready to Book Your Recital?
              </h2>
              <p className="text-gray-400 mb-8">
                Peak recital season fills quickly. Secure your date before
                it&rsquo;s gone.
              </p>
              <Link
                href="/dance/proposal"
                className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold rounded-lg bg-cyan-brand text-charcoal-deep hover:bg-cyan-brand/90 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-brand/20"
              >
                Build Your Custom Proposal <ArrowRight size={18} />
              </Link>
              <p className="text-sm text-gray-500 mt-6">
                For promo and social content,{" "}
                <a
                  href="/#contact"
                  className="text-cyan-brand hover:underline"
                >
                  reach out for a custom quote
                </a>
                . Questions?{" "}
                <a
                  href="mailto:daniel@streamstage.live"
                  className="text-cyan-brand hover:underline"
                >
                  daniel@streamstage.live
                </a>
              </p>
            </ScrollReveal>
          </div>
        </section>

        <Footer />
      </main>
    </>
  );
}
