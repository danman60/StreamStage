"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Video,
  Radio,
  Camera,
  Package,
  Clock,
  Star,
  Handshake,
  ArrowLeft,
  Check,
  Send,
  CheckCircle2,
  Quote,
} from "lucide-react";
import RecitalNav from "@/components/RecitalNav";
import ScrollReveal from "@/components/ScrollReveal";
import TestimonialWall from "@/components/TestimonialWall";
import Footer from "@/components/Footer";
import { funnel } from "@/lib/analytics";

/* ── Constants ── */

const EARLY_BIRD_DEADLINE = "December 31, 2026";

const PRICES = {
  small: { video: 25, streaming: 5, photo: 8, bundle: 35 },
  medium: { video: 25, streaming: 3, photo: 7, bundle: 30 },
  large: { video: 18, streaming: 2, photo: 5, bundle: 22 },
} as const;

const TIER_LABELS = {
  small: "Small Recital (1\u2013100)",
  medium: "Medium Recital (101\u2013150)",
  large: "Large Recital (151+)",
} as const;

type Tier = keyof typeof PRICES;

/* Director quotes pulled from the StreamStage kiosk testimonial film (2026). */
const HERO_QUOTE = {
  quote:
    "I really felt that you had it all handled and taken care of. There's so much going on on recital day, and that was one thing I didn't even have to think about.",
  name: "Mandy",
  title: "Ancaster Dance Arts",
};

/* The three strongest quotes, shown BEFORE the form. The full library sits below it. */
const PRE_FORM_QUOTES = [
  {
    quote:
      "With StreamStage, I don't have to do anything. They send me a link, I send it to my customers, and that's it. I don't have to follow up, I don't have to edit the video.",
    name: "Tiffany Caron",
    title: "7 Attitudes",
  },
  {
    quote:
      "One of our dance moms, probably five minutes later, messaged me saying: this video is awesome. She saw the difference immediately.",
    name: "Kerry Moore",
    title: "Kerry Moore School of Dance",
  },
  {
    quote:
      "It's all branded for my studio and it looks beautiful, and he sets it all up. It is so easy and problem-free for a studio director.",
    name: "Laura Ramsey",
    title: "Grand River Academy of Dance",
  },
];

const CLOSER_QUOTE = {
  quote: "Take the leap. You won't be disappointed, and you'll be a repeat customer for sure.",
  name: "Nicole",
  title: "Stagecoach Canada",
};

function getTier(dancers: number): Tier {
  if (dancers <= 100) return "small";
  if (dancers <= 150) return "medium";
  return "large";
}

function money(n: number, decimals = 0) {
  return (
    "$" +
    n.toLocaleString("en-CA", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  );
}

/* ── Component ── */

export default function RecitalProposal() {
  /* State: calculator */
  const [dancerInput, setDancerInput] = useState("50");
  const [streaming, setStreaming] = useState(false);
  const [photo, setPhoto] = useState(false);
  const [bundle, setBundle] = useState(false);

  /* State: discounts */
  const [earlyBird, setEarlyBird] = useState(false);
  const [testimonial, setTestimonial] = useState(false);
  const [loyalty, setLoyalty] = useState(false);

  /* State: media fee override */
  const [mediaFeeOverride, setMediaFeeOverride] = useState("");

  /* State: form */
  const [form, setForm] = useState({
    studio: "",
    email: "",
    contact: "",
    phone: "",
    city: "",
    date: "",
    venue: "",
    notes: "",
  });
  const [dateTBD, setDateTBD] = useState(false);
  const [showCount, setShowCount] = useState(1);
  const [showTimes, setShowTimes] = useState(["", "", "", ""]);

  /* State: submission */
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  /* Derived values */
  const dancerCount = Math.max(1, parseInt(dancerInput) || 1);
  const tier = getTier(dancerCount);
  const p = PRICES[tier];

  const calc = useMemo(() => {
    let perDancer: number;
    if (bundle) {
      perDancer = p.bundle;
    } else {
      perDancer = p.video;
      if (streaming) perDancer += p.streaming;
      if (photo) perDancer += p.photo;
    }

    const subtotal = perDancer * dancerCount;
    let discountPct = 0;
    if (earlyBird) discountPct += 5;
    if (testimonial) discountPct += 5;
    if (loyalty) discountPct += 5;

    const discountAmount = Math.round((subtotal * discountPct) / 100);
    const total = subtotal - discountAmount;
    const feePerDancer = total / dancerCount;
    const suggestedMediaFee = Math.ceil(feePerDancer * 1.2);
    const userMediaFee = mediaFeeOverride
      ? parseFloat(mediaFeeOverride) || suggestedMediaFee
      : suggestedMediaFee;
    const profitToStudio = Math.round(
      (userMediaFee - feePerDancer) * dancerCount
    );

    return {
      perDancer,
      subtotal,
      discountPct,
      discountAmount,
      total,
      feePerDancer,
      suggestedMediaFee,
      userMediaFee,
      profitToStudio,
    };
  }, [dancerCount, bundle, streaming, photo, earlyBird, testimonial, loyalty, mediaFeeOverride, p]);

  const router = useRouter();

  const serviceLabel = [
    "Video",
    ...(streaming || bundle ? ["Streaming"] : []),
    ...(photo || bundle ? ["Photo"] : []),
    ...(bundle ? ["(Bundle)"] : []),
  ].join(" + ");

  /* Funnel: calculator_start on the first real interaction, calculator_complete once the
     visitor has a meaningful estimate (they moved off the default and picked services). */
  const markStart = () => funnel.calculatorStart();

  useEffect(() => {
    const movedOffDefault = dancerInput !== "50";
    const pickedServices = streaming || photo || bundle;
    if (calc.total <= 0 || !(movedOffDefault || pickedServices)) return;

    // Wait for the configuration to settle before reporting a value. Firing on the first
    // qualifying render captured a half-built quote: 140 dancers at video-only ($3,500)
    // a moment before the bundle was picked ($4,200), and the once-guard then blocked the
    // corrected figure. The conversion value Meta optimizes against has to be the settled one.
    const t = setTimeout(() => {
      funnel.calculatorComplete({
        dancer_count: dancerCount,
        tier: TIER_LABELS[tier],
        total: calc.total,
        services: serviceLabel,
      });
    }, 2500);
    return () => clearTimeout(t);
  }, [calc.total, dancerCount, dancerInput, streaming, photo, bundle, tier, serviceLabel]);

  /* Handlers */
  const toggleStreaming = () => {
    markStart();
    const next = !streaming;
    setStreaming(next);
    if (next && photo) {
      setBundle(true);
    } else if (bundle && !next) {
      setBundle(false);
    }
  };
  const togglePhoto = () => {
    markStart();
    const next = !photo;
    setPhoto(next);
    if (streaming && next) {
      setBundle(true);
    } else if (bundle && !next) {
      setBundle(false);
    }
  };
  const toggleBundle = () => {
    markStart();
    if (!bundle) {
      setStreaming(true);
      setPhoto(true);
    }
    setBundle((v) => !v);
  };

  const updateForm = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const updateShowTime = (idx: number, value: string) => {
    setShowTimes((t) => {
      const next = [...t];
      next[idx] = value;
      return next;
    });
  };

  const handleSubmit = async () => {
    // Qualifying set: who they are, where they are, and when. Everything the calculator
    // already knows (count, tier, services, discounts, totals, media fee) rides along
    // automatically and is never re-typed.
    if (!form.studio || !form.email || !form.contact || !form.city || (!form.date && !dateTBD)) {
      setSubmitError("Please fill in all required fields.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setSubmitError("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch("/api/recital-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          date: dateTBD ? "Date not confirmed" : form.date,
          showCount,
          showTimes: showTimes.slice(0, showCount),
          dancerCount,
          tier: TIER_LABELS[tier],
          services: {
            video: true,
            streaming: bundle || streaming,
            photo: bundle || photo,
            bundle,
          },
          discounts: { earlyBird, testimonial, loyalty },
          subtotal: calc.subtotal,
          discountPercent: calc.discountPct,
          discountAmount: calc.discountAmount,
          total: calc.total,
          feePerDancer: calc.feePerDancer,
          suggestedMediaFee: calc.suggestedMediaFee,
          mediaFee: calc.userMediaFee,
          profitToStudio: calc.profitToStudio,
        }),
      });

      // Lead fires ONLY on a server-accepted submission, and only on the success page,
      // so a failed POST or a double click can never mint a conversion.
      if (!res.ok) throw new Error("Failed to submit");

      try {
        sessionStorage.setItem(
          "ss_proposal_submitted",
          JSON.stringify({
            studio: form.studio,
            email: form.email,
            city: form.city,
            date: dateTBD ? "Date not confirmed" : form.date,
            dancerCount,
            tier: TIER_LABELS[tier],
            total: calc.total,
            services: serviceLabel,
          })
        );
      } catch { /* the confirmation page degrades to a generic thank you */ }

      setSubmitted(true);
      router.push("/recitals/received");
    } catch {
      setSubmitError(
        "Something went wrong. Please try again or email daniel@streamstage.live directly."
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Shared card styles ── */
  const cardBase =
    "p-6 rounded-xl border transition-all duration-200 cursor-pointer select-none";
  const cardOff =
    "bg-charcoal-dark/60 border-white/5 hover:border-white/10";
  const cardOn =
    "bg-cyan-brand/10 border-cyan-brand/30 ring-1 ring-cyan-brand/20";

  return (
    <>
      <RecitalNav ctaHref="/dance" ctaLabel="Overview" />

      <main className="min-h-screen pt-24 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {/* ── Header ── */}
          <section className="mb-14">
            <Link
              href="/dance"
              className="inline-flex items-center gap-2 text-base text-gray-400 hover:text-cyan-brand transition-colors mb-6"
            >
              <ArrowLeft size={18} /> Dance Services
            </Link>

            <ScrollReveal>
              <h1 className="font-heading text-4xl sm:text-5xl font-bold text-white mb-4">
                Build Your Recital Proposal
              </h1>
              <p className="text-lg text-gray-400 mb-6">
                Select your services, enter your dancer count, and we&rsquo;ll
                calculate a custom proposal. Submit below to receive a detailed
                quote within one business day.
              </p>
            </ScrollReveal>

            {/* Trust badges */}
            <ScrollReveal delay={0.05}>
              <div className="flex flex-wrap gap-3 text-sm text-gray-400">
                {[
                  "Professional operators",
                  "All A/V equipment provided",
                  "Livestream available",
                  "Branded media portal",
                  "Client retains all revenue",
                  "10-day turnaround",
                ].map((badge) => (
                  <span
                    key={badge}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-charcoal-dark/60 border border-white/5"
                  >
                    <Check size={14} className="text-cyan-brand shrink-0" />
                    {badge}
                  </span>
                ))}
              </div>
            </ScrollReveal>

            {/* Hero testimonial */}
            <ScrollReveal delay={0.1}>
              <div className="mt-8 p-6 rounded-xl bg-charcoal-dark/60 border border-white/5">
                <Quote size={20} className="text-cyan-brand/30 mb-3" />
                <p className="text-gray-300 leading-relaxed italic text-base">
                  &ldquo;{HERO_QUOTE.quote}&rdquo;
                </p>
                <div className="mt-4 pt-3 border-t border-white/5">
                  <p className="font-heading font-semibold text-cyan-brand">
                    {HERO_QUOTE.name}
                  </p>
                  <p className="text-sm text-gray-500">{HERO_QUOTE.title}</p>
                </div>
              </div>
            </ScrollReveal>
          </section>

          <div className="section-divider mb-14" />

          {/* ── Pricing Reference ── */}
          <ScrollReveal>
            <section className="mb-14">
              <h2 className="font-heading text-2xl font-semibold text-white mb-3">
                Pricing Information
              </h2>
              <p className="text-base text-gray-500 mb-6">
                Pricing adjusts automatically by dancer count. Higher volumes
                receive greater discounts.
              </p>

              <div className="grid sm:grid-cols-3 gap-4">
                {(["small", "medium", "large"] as Tier[]).map((t) => {
                  const tp = PRICES[t];
                  const active = tier === t;
                  return (
                    <div
                      key={t}
                      className={`rounded-xl p-5 text-center transition-all duration-200 ${
                        active
                          ? "bg-cyan-brand/10 border border-cyan-brand/30 ring-1 ring-cyan-brand/20"
                          : "bg-charcoal-dark/60 border border-white/5"
                      }`}
                    >
                      <p
                        className={`font-heading text-base font-semibold ${active ? "text-cyan-brand" : "text-white"}`}
                      >
                        {TIER_LABELS[t]}
                      </p>
                      <div className="mt-3 space-y-1 text-sm text-gray-400">
                        <p>Video ${tp.video} &middot; +Stream ${tp.streaming} &middot; +Photo ${tp.photo}</p>
                        <p className={`font-semibold ${active ? "text-cyan-brand" : "text-white"}`}>
                          All 3 for ${tp.bundle}/dancer
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </ScrollReveal>

          <div className="section-divider mb-14" />

          {/* ── Dancer Count ── */}
          <ScrollReveal>
            <section className="mb-14">
              <h2 className="font-heading text-2xl font-semibold text-white mb-3">
                How many dancers will be performing?
              </h2>
              <p className="text-base text-gray-500 mb-5">
                This sets your pricing tier and per-dancer rates.
              </p>
              <input
                type="number"
                min={1}
                max={999}
                value={dancerInput}
                onFocus={markStart}
                onChange={(e) => {
                  markStart();
                  setDancerInput(e.target.value);
                }}
                onBlur={() => {
                  const n = parseInt(dancerInput);
                  if (!n || n < 1) setDancerInput("1");
                  else if (n > 999) setDancerInput("999");
                }}
                className="w-36 px-5 py-4 rounded-lg bg-charcoal-dark border border-white/10 text-white text-center text-xl font-heading font-semibold focus:outline-none focus:border-cyan-brand/50 focus:ring-1 focus:ring-cyan-brand/20 transition-all"
              />
            </section>
          </ScrollReveal>

          <div className="section-divider mb-14" />

          {/* ── Service Selection ── */}
          <ScrollReveal>
            <section className="mb-14">
              <h2 className="font-heading text-2xl font-semibold text-white mb-3">
                Select Your Services
              </h2>
              <p className="text-base text-gray-500 mb-6">
                Choose the services you need for your recital.
              </p>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Video (always on) */}
                <div className={`${cardBase} ${cardOn} cursor-default`}>
                  <div className="flex items-center gap-3 mb-3">
                    <Video size={24} className="text-cyan-brand" />
                    <div>
                      <p className="font-heading text-base font-semibold text-white">
                        Video
                      </p>
                      <p className="text-xs text-cyan-brand uppercase tracking-wider">
                        Required
                      </p>
                    </div>
                  </div>
                  <p className="text-base text-cyan-brand font-medium">
                    ${p.video}/dancer
                  </p>
                </div>

                {/* Streaming */}
                <div
                  onClick={toggleStreaming}
                  className={`${cardBase} ${streaming || bundle ? cardOn : cardOff}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Radio
                      size={24}
                      className={
                        streaming || bundle ? "text-cyan-brand" : "text-gray-500"
                      }
                    />
                    <p className="font-heading text-base font-semibold text-white">
                      Streaming
                    </p>
                  </div>
                  <p
                    className={`text-base font-medium ${streaming || bundle ? "text-cyan-brand" : "text-gray-400"}`}
                  >
                    +${p.streaming}/dancer
                  </p>
                </div>

                {/* Photo */}
                <div
                  onClick={togglePhoto}
                  className={`${cardBase} ${photo || bundle ? cardOn : cardOff}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Camera
                      size={24}
                      className={
                        photo || bundle ? "text-cyan-brand" : "text-gray-500"
                      }
                    />
                    <p className="font-heading text-base font-semibold text-white">
                      Photo
                    </p>
                  </div>
                  <p
                    className={`text-base font-medium ${photo || bundle ? "text-cyan-brand" : "text-gray-400"}`}
                  >
                    +${p.photo}/dancer
                  </p>
                </div>

                {/* Bundle */}
                <div
                  onClick={toggleBundle}
                  className={`${cardBase} ${bundle ? cardOn : cardOff}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Package
                      size={24}
                      className={bundle ? "text-cyan-brand" : "text-gray-500"}
                    />
                    <p className="font-heading text-base font-semibold text-white">
                      All 3 Package
                    </p>
                  </div>
                  <p
                    className={`text-base font-medium ${bundle ? "text-cyan-brand" : "text-gray-400"}`}
                  >
                    ${p.bundle}/dancer
                  </p>
                </div>
              </div>
            </section>
          </ScrollReveal>

          <div className="section-divider mb-14" />

          {/* ── Discounts ── */}
          <ScrollReveal>
            <section className="mb-14">
              <h2 className="font-heading text-2xl font-semibold text-white mb-3">
                Available Discounts
              </h2>
              <p className="text-base text-gray-500 mb-6">
                All discounts are stackable&nbsp;&mdash; save up to 15%!
              </p>

              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  {
                    key: "earlyBird" as const,
                    icon: Clock,
                    label: "Early Bird",
                    desc: `Book before ${EARLY_BIRD_DEADLINE}`,
                    value: earlyBird,
                    toggle: () => setEarlyBird((v) => !v),
                  },
                  {
                    key: "testimonial" as const,
                    icon: Star,
                    label: "Testimonial",
                    desc: "Share your experience",
                    value: testimonial,
                    toggle: () => setTestimonial((v) => !v),
                  },
                  {
                    key: "loyalty" as const,
                    icon: Handshake,
                    label: "3-Year Loyalty",
                    desc: "Commit to 3 years with StreamStage",
                    value: loyalty,
                    toggle: () => setLoyalty((v) => !v),
                  },
                ].map((d) => (
                  <div
                    key={d.key}
                    onClick={d.toggle}
                    className={`${cardBase} ${d.value ? cardOn : cardOff}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <d.icon
                        size={22}
                        className={
                          d.value ? "text-cyan-brand" : "text-gray-500"
                        }
                      />
                      <p className="font-heading text-base font-semibold text-white">
                        {d.label}
                      </p>
                    </div>
                    <p className="text-sm text-gray-400">{d.desc}</p>
                    <p
                      className={`text-base font-semibold mt-2 ${d.value ? "text-cyan-brand" : "text-gray-500"}`}
                    >
                      5% OFF
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </ScrollReveal>

          <div className="section-divider mb-14" />

          {/* ── Investment Summary ── */}
          <ScrollReveal>
            <section className="mb-14">
              <h2 className="font-heading text-2xl font-semibold text-white mb-6">
                Investment Summary
              </h2>

              <div className="rounded-xl bg-charcoal-dark/60 border border-white/5 p-6 sm:p-8 space-y-5">
                <Row label="Number of Dancers" value={String(dancerCount)} />
                <Row label="Pricing Tier" value={TIER_LABELS[tier]} />
                <Row
                  label="Selected Services"
                  value={[
                    "Video",
                    ...(streaming || bundle ? ["Streaming"] : []),
                    ...(photo || bundle ? ["Photo"] : []),
                    ...(bundle ? ["(Bundle)"] : []),
                  ].join(" + ")}
                />

                <div className="border-t border-white/5 pt-5" />

                <Row label="Subtotal" value={money(calc.subtotal)} />

                {calc.discountPct > 0 && (
                  <Row
                    label={`Discount (${calc.discountPct}%)`}
                    value={`-${money(calc.discountAmount)}`}
                    highlight
                  />
                )}

                <Row
                  label="Total Investment"
                  value={money(calc.total)}
                  highlight
                  bold
                />

                <div className="border-t border-white/5 pt-5" />

                <Row
                  label="Fee per Dancer"
                  value={money(calc.feePerDancer, 2)}
                />
                <Row
                  label="Suggested Media Fee"
                  value={money(calc.suggestedMediaFee, 2)}
                />

                <div className="flex items-center justify-between">
                  <span className="text-base text-gray-400">Your Media Fee</span>
                  <div className="flex items-center gap-1">
                    <span className="text-base text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      placeholder={calc.suggestedMediaFee.toFixed(2)}
                      value={mediaFeeOverride}
                      onChange={(e) => setMediaFeeOverride(e.target.value)}
                      className="w-28 px-3 py-2 rounded-md bg-charcoal-mid border border-white/10 text-white text-base text-right font-medium focus:outline-none focus:border-cyan-brand/50 focus:ring-1 focus:ring-cyan-brand/20 transition-all"
                    />
                  </div>
                </div>

                <Row
                  label="Profit to Studio"
                  value={money(calc.profitToStudio)}
                  highlight
                  bold
                />
              </div>
            </section>
          </ScrollReveal>

          <div className="section-divider mb-14" />

          {/* ── Three strongest quotes, immediately before the form ── */}
          <ScrollReveal>
            <div className="grid sm:grid-cols-3 gap-4 mb-14">
              {PRE_FORM_QUOTES.map((t) => (
                <div
                  key={t.name}
                  className="p-6 rounded-xl bg-charcoal-dark/60 border border-white/5 flex flex-col"
                >
                  <Quote size={18} className="text-cyan-brand/30 mb-3 shrink-0" />
                  <p className="text-sm text-gray-300 leading-relaxed italic flex-1">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="mt-4 pt-3 border-t border-white/5">
                    <p className="font-heading font-semibold text-cyan-brand text-sm">
                      {t.name}
                    </p>
                    <p className="text-xs text-gray-500">{t.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>

          {/* ── Submit Form ── */}
          <section id="submit-section" className="mb-16 scroll-mt-24">
            <ScrollReveal>
              {submitted ? (
                /* Success state */
                <div className="rounded-xl bg-charcoal-dark/60 border border-cyan-brand/20 p-8 sm:p-12 text-center">
                  <CheckCircle2
                    size={56}
                    className="text-cyan-brand mx-auto mb-5"
                  />
                  <h2 className="font-heading text-3xl font-bold text-white mb-4">
                    Proposal Submitted!
                  </h2>
                  <p className="text-lg text-gray-400 mb-6">
                    We&rsquo;ll get back to you within one business day with a
                    detailed quote.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                      href="/dance"
                      className="text-base text-cyan-brand hover:underline"
                    >
                      View dance services
                    </Link>
                    <Link
                      href="/"
                      className="text-base text-gray-400 hover:text-white transition-colors"
                    >
                      Back to StreamStage
                    </Link>
                  </div>
                </div>
              ) : (
                /* Form */
                <div className="rounded-xl bg-charcoal-dark/60 border border-white/5 p-6 sm:p-8">
                  <h2 className="font-heading text-2xl font-semibold text-white mb-2">
                    Send us your recital details
                  </h2>
                  <p className="text-base text-gray-400 mb-6">
                    This is not a booking or a commitment. We&rsquo;ll confirm the date and
                    answer any questions by email. Your numbers above come with it, so
                    there&rsquo;s nothing to re-enter.
                  </p>

                  <div className="grid sm:grid-cols-2 gap-5 mb-5">
                    <FormInput
                      label="Contact Name"
                      value={form.contact}
                      onChange={(v) => updateForm("contact", v)}
                      required
                    />
                    <FormInput
                      label="Studio or Organization Name"
                      value={form.studio}
                      onChange={(v) => updateForm("studio", v)}
                      required
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-5 mb-5">
                    <FormInput
                      label="Contact Email"
                      type="email"
                      value={form.email}
                      onChange={(v) => updateForm("email", v)}
                      required
                    />
                    <FormInput
                      label="City"
                      value={form.city}
                      onChange={(v) => updateForm("city", v)}
                      required
                    />
                  </div>

                  <FormInput
                    label="Recital Date"
                    type="date"
                    value={form.date}
                    onChange={(v) => updateForm("date", v)}
                    disabled={dateTBD}
                    required={!dateTBD}
                  />

                  <label className="mt-3 inline-flex items-center gap-2 text-base text-gray-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={dateTBD}
                      onChange={(e) => setDateTBD(e.target.checked)}
                      className="h-4 w-4 accent-cyan-brand"
                    />
                    Our date is not confirmed yet
                  </label>

                  <div className="grid sm:grid-cols-2 gap-5 mt-5">
                    <FormInput
                      label="Phone (optional)"
                      type="tel"
                      value={form.phone}
                      onChange={(v) => updateForm("phone", v)}
                    />
                    <div>
                      <label className="block text-base text-gray-400 mb-2">
                        Number of shows (optional)
                      </label>
                      <select
                        value={showCount}
                        onChange={(e) => setShowCount(Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-lg bg-charcoal-mid border border-white/10 text-white text-base focus:outline-none focus:border-cyan-brand/50 focus:ring-1 focus:ring-cyan-brand/20 transition-all"
                      >
                        {[1, 2, 3, 4].map((n) => (
                          <option key={n} value={n}>
                            {n} {n === 1 ? "show" : "shows"}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-gray-500">
                    Venue and show times come later, in the reply. No additional surcharge
                    for multiple shows.
                  </p>

                  <div className="mt-5">
                    <label className="block text-base text-gray-400 mb-2">
                      Additional notes or special requirements
                    </label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => updateForm("notes", e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 rounded-lg bg-charcoal-mid border border-white/10 text-white text-base placeholder:text-gray-600 focus:outline-none focus:border-cyan-brand/50 focus:ring-1 focus:ring-cyan-brand/20 transition-all resize-y"
                    />
                  </div>

                  {submitError && (
                    <p className="text-base text-red-400 mt-4">{submitError}</p>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="cursor-pointer mt-6 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-10 py-4 text-base font-semibold rounded-lg bg-cyan-brand text-charcoal-deep hover:bg-cyan-brand/90 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-brand/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      "Sending..."
                    ) : (
                      <>
                        Send my recital details <Send size={18} />
                      </>
                    )}
                  </button>
                </div>
              )}
            </ScrollReveal>
          </section>

          <div className="section-divider mb-14" />

          {/* ── Full testimonial library, below the form ── */}
          <div className="mb-14">
            <TestimonialWall heading="More from the studios we work with" />
          </div>

          {/* ── Closer quote ── */}
          <ScrollReveal>
            <div className="text-center mb-16 max-w-2xl mx-auto">
              <p className="font-heading text-xl sm:text-2xl text-white italic leading-relaxed">
                &ldquo;{CLOSER_QUOTE.quote}&rdquo;
              </p>
              <p className="mt-4 text-base text-cyan-brand font-heading font-semibold">
                {CLOSER_QUOTE.name}
                <span className="text-gray-500 font-normal"> &middot; {CLOSER_QUOTE.title}</span>
              </p>
            </div>
          </ScrollReveal>
        </div>

        <Footer />
      </main>
    </>
  );
}

/* ── Helper components ── */

function Row({
  label,
  value,
  highlight = false,
  bold = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-base text-gray-400">{label}</span>
      <span
        className={`${highlight ? "text-cyan-brand" : "text-white"} ${bold ? "font-heading font-bold text-lg" : "text-base font-medium"}`}
      >
        {value}
      </span>
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-base text-gray-400 mb-2">
        {label}
        {required && <span className="text-cyan-brand ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || label}
        disabled={disabled}
        className="w-full px-4 py-3 rounded-lg bg-charcoal-mid border border-white/10 text-white text-base placeholder:text-gray-600 focus:outline-none focus:border-cyan-brand/50 focus:ring-1 focus:ring-cyan-brand/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      />
    </div>
  );
}
