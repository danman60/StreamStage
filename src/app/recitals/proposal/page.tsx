"use client";

import { useState, useMemo } from "react";
import type { Metadata } from "next";
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
} from "lucide-react";
import RecitalNav from "@/components/RecitalNav";
import ScrollReveal from "@/components/ScrollReveal";
import Footer from "@/components/Footer";

/* ── Constants ── */

const EARLY_BIRD_DEADLINE = "April 15, 2026";

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
  const [dancerCount, setDancerCount] = useState(50);
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
    date: "",
    venue: "",
    notes: "",
  });
  const [showCount, setShowCount] = useState(1);
  const [showTimes, setShowTimes] = useState(["", "", "", ""]);

  /* State: submission */
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  /* Derived values */
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

  /* Handlers */
  const toggleStreaming = () => {
    if (bundle && streaming) setBundle(false);
    setStreaming((v) => !v);
  };
  const togglePhoto = () => {
    if (bundle && photo) setBundle(false);
    setPhoto((v) => !v);
  };
  const toggleBundle = () => {
    if (!bundle) {
      setStreaming(true);
      setPhoto(true);
    }
    setBundle((v) => !v);
  };

  const updateForm = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const updateShowCount = (count: number) => {
    setShowCount(count);
  };

  const updateShowTime = (idx: number, value: string) => {
    setShowTimes((t) => {
      const next = [...t];
      next[idx] = value;
      return next;
    });
  };

  const handleSubmit = async () => {
    if (
      !form.studio ||
      !form.email ||
      !form.contact ||
      !form.phone ||
      !form.date ||
      !form.venue
    ) {
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

      if (!res.ok) throw new Error("Failed to submit");
      setSubmitted(true);
      document
        .getElementById("submit-section")
        ?.scrollIntoView({ behavior: "smooth" });
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
    "p-5 rounded-xl border transition-all duration-200 cursor-pointer select-none";
  const cardOff =
    "bg-charcoal-dark/60 border-white/5 hover:border-white/10";
  const cardOn =
    "bg-cyan-brand/10 border-cyan-brand/30 ring-1 ring-cyan-brand/20";

  return (
    <>
      <RecitalNav ctaHref="/recitals" ctaLabel="Overview" />

      <main className="min-h-screen pt-24 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {/* ── Header ── */}
          <section className="mb-12">
            <Link
              href="/recitals"
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-cyan-brand transition-colors mb-6"
            >
              <ArrowLeft size={16} /> Recital Overview
            </Link>

            <ScrollReveal>
              <h1 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-3">
                Build Your Recital Proposal
              </h1>
              <p className="text-gray-400 mb-6">
                Select your services, enter your dancer count, and we&rsquo;ll
                calculate a custom proposal. Submit below to receive a detailed
                quote within one business day.
              </p>
            </ScrollReveal>

            {/* Trust badges */}
            <ScrollReveal delay={0.05}>
              <div className="flex flex-wrap gap-3 text-xs sm:text-sm text-gray-400">
                {[
                  "Professional operators",
                  "All A/V equipment provided",
                  "Up to 4 hrs consultation",
                  "Client retains all revenue",
                  "1-week turnaround",
                ].map((badge) => (
                  <span
                    key={badge}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-charcoal-dark/60 border border-white/5"
                  >
                    <Check size={12} className="text-cyan-brand shrink-0" />
                    {badge}
                  </span>
                ))}
              </div>
            </ScrollReveal>
          </section>

          <div className="section-divider mb-12" />

          {/* ── Pricing Reference ── */}
          <ScrollReveal>
            <section className="mb-12">
              <h2 className="font-heading text-xl font-semibold text-white mb-2">
                Pricing Information
              </h2>
              <p className="text-sm text-gray-500 mb-6">
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
                      className={`rounded-xl p-4 text-center transition-all duration-200 ${
                        active
                          ? "bg-cyan-brand/10 border border-cyan-brand/30 ring-1 ring-cyan-brand/20"
                          : "bg-charcoal-dark/60 border border-white/5"
                      }`}
                    >
                      <p
                        className={`font-heading text-sm font-semibold ${active ? "text-cyan-brand" : "text-white"}`}
                      >
                        {TIER_LABELS[t]}
                      </p>
                      <div className="mt-3 space-y-1 text-xs text-gray-400">
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

          <div className="section-divider mb-12" />

          {/* ── Dancer Count ── */}
          <ScrollReveal>
            <section className="mb-12">
              <h2 className="font-heading text-xl font-semibold text-white mb-2">
                How many dancers will be performing?
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                This sets your pricing tier and per-dancer rates.
              </p>
              <input
                type="number"
                min={1}
                max={999}
                value={dancerCount}
                onChange={(e) =>
                  setDancerCount(
                    Math.max(1, Math.min(999, parseInt(e.target.value) || 1))
                  )
                }
                className="w-32 px-4 py-3 rounded-lg bg-charcoal-dark border border-white/10 text-white text-center text-lg font-heading font-semibold focus:outline-none focus:border-cyan-brand/50 focus:ring-1 focus:ring-cyan-brand/20 transition-all"
              />
            </section>
          </ScrollReveal>

          <div className="section-divider mb-12" />

          {/* ── Service Selection ── */}
          <ScrollReveal>
            <section className="mb-12">
              <h2 className="font-heading text-xl font-semibold text-white mb-2">
                Select Your Services
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Choose the services you need for your recital.
              </p>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Video (always on) */}
                <div className={`${cardBase} ${cardOn} cursor-default`}>
                  <div className="flex items-center gap-3 mb-2">
                    <Video size={20} className="text-cyan-brand" />
                    <div>
                      <p className="font-heading text-sm font-semibold text-white">
                        Video
                      </p>
                      <p className="text-[10px] text-cyan-brand uppercase tracking-wider">
                        Required
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-cyan-brand font-medium">
                    ${p.video}/dancer
                  </p>
                </div>

                {/* Streaming */}
                <div
                  onClick={toggleStreaming}
                  className={`${cardBase} ${streaming || bundle ? cardOn : cardOff}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Radio
                      size={20}
                      className={
                        streaming || bundle ? "text-cyan-brand" : "text-gray-500"
                      }
                    />
                    <p className="font-heading text-sm font-semibold text-white">
                      Streaming
                    </p>
                  </div>
                  <p
                    className={`text-sm font-medium ${streaming || bundle ? "text-cyan-brand" : "text-gray-400"}`}
                  >
                    +${p.streaming}/dancer
                  </p>
                </div>

                {/* Photo */}
                <div
                  onClick={togglePhoto}
                  className={`${cardBase} ${photo || bundle ? cardOn : cardOff}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Camera
                      size={20}
                      className={
                        photo || bundle ? "text-cyan-brand" : "text-gray-500"
                      }
                    />
                    <p className="font-heading text-sm font-semibold text-white">
                      Photo
                    </p>
                  </div>
                  <p
                    className={`text-sm font-medium ${photo || bundle ? "text-cyan-brand" : "text-gray-400"}`}
                  >
                    +${p.photo}/dancer
                  </p>
                </div>

                {/* Bundle */}
                <div
                  onClick={toggleBundle}
                  className={`${cardBase} ${bundle ? cardOn : cardOff}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Package
                      size={20}
                      className={bundle ? "text-cyan-brand" : "text-gray-500"}
                    />
                    <p className="font-heading text-sm font-semibold text-white">
                      All 3 Package
                    </p>
                  </div>
                  <p
                    className={`text-sm font-medium ${bundle ? "text-cyan-brand" : "text-gray-400"}`}
                  >
                    ${p.bundle}/dancer
                  </p>
                </div>
              </div>
            </section>
          </ScrollReveal>

          <div className="section-divider mb-12" />

          {/* ── Discounts ── */}
          <ScrollReveal>
            <section className="mb-12">
              <h2 className="font-heading text-xl font-semibold text-white mb-2">
                Available Discounts
              </h2>
              <p className="text-sm text-gray-500 mb-6">
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
                    <div className="flex items-center gap-3 mb-2">
                      <d.icon
                        size={18}
                        className={
                          d.value ? "text-cyan-brand" : "text-gray-500"
                        }
                      />
                      <p className="font-heading text-sm font-semibold text-white">
                        {d.label}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400">{d.desc}</p>
                    <p
                      className={`text-sm font-semibold mt-2 ${d.value ? "text-cyan-brand" : "text-gray-500"}`}
                    >
                      5% OFF
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </ScrollReveal>

          <div className="section-divider mb-12" />

          {/* ── Investment Summary ── */}
          <ScrollReveal>
            <section className="mb-12">
              <h2 className="font-heading text-xl font-semibold text-white mb-6">
                Investment Summary
              </h2>

              <div className="rounded-xl bg-charcoal-dark/60 border border-white/5 p-6 sm:p-8 space-y-4">
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

                <div className="border-t border-white/5 pt-4" />

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

                <div className="border-t border-white/5 pt-4" />

                <Row
                  label="Fee per Dancer"
                  value={money(calc.feePerDancer, 2)}
                />
                <Row
                  label="Suggested Media Fee"
                  value={money(calc.suggestedMediaFee, 2)}
                />

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Your Media Fee</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      placeholder={calc.suggestedMediaFee.toFixed(2)}
                      value={mediaFeeOverride}
                      onChange={(e) => setMediaFeeOverride(e.target.value)}
                      className="w-24 px-3 py-1.5 rounded-md bg-charcoal-mid border border-white/10 text-white text-sm text-right font-medium focus:outline-none focus:border-cyan-brand/50 focus:ring-1 focus:ring-cyan-brand/20 transition-all"
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

          {/* ── Pick Your Date CTA ── */}
          <ScrollReveal>
            <div className="text-center mb-12">
              <button
                onClick={() =>
                  document
                    .getElementById("submit-section")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="cursor-pointer px-8 py-4 text-base font-semibold rounded-lg bg-cyan-brand text-charcoal-deep hover:bg-cyan-brand/90 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-brand/20"
              >
                Pick Your Date
              </button>
              <p className="text-sm text-gray-500 mt-3">
                Peak recital season fills quickly. Secure your date before
                it&rsquo;s gone.
              </p>
            </div>
          </ScrollReveal>

          <div className="section-divider mb-12" />

          {/* ── Submit Form ── */}
          <section id="submit-section" className="mb-16 scroll-mt-24">
            <ScrollReveal>
              {submitted ? (
                /* Success state */
                <div className="rounded-xl bg-charcoal-dark/60 border border-cyan-brand/20 p-8 sm:p-12 text-center">
                  <CheckCircle2
                    size={48}
                    className="text-cyan-brand mx-auto mb-4"
                  />
                  <h2 className="font-heading text-2xl font-bold text-white mb-3">
                    Proposal Submitted!
                  </h2>
                  <p className="text-gray-400 mb-6">
                    We&rsquo;ll get back to you within one business day with a
                    detailed quote.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                      href="/recitals"
                      className="text-sm text-cyan-brand hover:underline"
                    >
                      View recital services
                    </Link>
                    <Link
                      href="/"
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      Back to StreamStage
                    </Link>
                  </div>
                </div>
              ) : (
                /* Form */
                <div className="rounded-xl bg-charcoal-dark/60 border border-white/5 p-6 sm:p-8">
                  <h2 className="font-heading text-xl font-semibold text-white mb-6">
                    Submit Your Proposal
                  </h2>

                  <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    <FormInput
                      label="Studio or Organization Name"
                      value={form.studio}
                      onChange={(v) => updateForm("studio", v)}
                      required
                    />
                    <FormInput
                      label="Contact Email"
                      type="email"
                      value={form.email}
                      onChange={(v) => updateForm("email", v)}
                      required
                    />
                    <FormInput
                      label="Contact Person"
                      value={form.contact}
                      onChange={(v) => updateForm("contact", v)}
                      required
                    />
                    <FormInput
                      label="Phone Number"
                      type="tel"
                      value={form.phone}
                      onChange={(v) => updateForm("phone", v)}
                      required
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    <FormInput
                      label="Recital Date"
                      type="date"
                      value={form.date}
                      onChange={(v) => updateForm("date", v)}
                      required
                    />
                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5">
                        Number of Shows
                      </label>
                      <select
                        value={showCount}
                        onChange={(e) =>
                          updateShowCount(parseInt(e.target.value))
                        }
                        className="w-full px-4 py-2.5 rounded-lg bg-charcoal-mid border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-brand/50 focus:ring-1 focus:ring-cyan-brand/20 transition-all"
                      >
                        {[1, 2, 3, 4].map((n) => (
                          <option key={n} value={n}>
                            {n} Show{n > 1 ? "s" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Dynamic show time inputs */}
                  <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    {Array.from({ length: showCount }).map((_, i) => (
                      <FormInput
                        key={i}
                        label={`Show ${i + 1} Time`}
                        placeholder="e.g. 2:00 PM"
                        value={showTimes[i]}
                        onChange={(v) => updateShowTime(i, v)}
                      />
                    ))}
                  </div>

                  <p className="text-xs text-gray-500 mb-4">
                    No additional surcharge for multiple shows.
                  </p>

                  <FormInput
                    label="Venue or Location"
                    value={form.venue}
                    onChange={(v) => updateForm("venue", v)}
                    required
                  />

                  <div className="mt-4">
                    <label className="block text-sm text-gray-400 mb-1.5">
                      Additional notes or special requirements
                    </label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => updateForm("notes", e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-lg bg-charcoal-mid border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-brand/50 focus:ring-1 focus:ring-cyan-brand/20 transition-all resize-y"
                    />
                  </div>

                  {submitError && (
                    <p className="text-sm text-red-400 mt-4">{submitError}</p>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="cursor-pointer mt-6 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 text-sm font-semibold rounded-lg bg-cyan-brand text-charcoal-deep hover:bg-cyan-brand/90 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-brand/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      "Submitting..."
                    ) : (
                      <>
                        Submit Proposal <Send size={16} />
                      </>
                    )}
                  </button>
                </div>
              )}
            </ScrollReveal>
          </section>
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
      <span className="text-sm text-gray-400">{label}</span>
      <span
        className={`text-sm ${highlight ? "text-cyan-brand" : "text-white"} ${bold ? "font-heading font-bold text-base" : "font-medium"}`}
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1.5">
        {label}
        {required && <span className="text-cyan-brand ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || label}
        className="w-full px-4 py-2.5 rounded-lg bg-charcoal-mid border border-white/10 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-cyan-brand/50 focus:ring-1 focus:ring-cyan-brand/20 transition-all"
      />
    </div>
  );
}
