"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Video,
  Camera,
  Mic,
  Smartphone,
  Film,
  Clock,
  ArrowLeft,
  Check,
  Send,
  CheckCircle2,
  Package,
  Quote,
  Plus,
  Minus,
} from "lucide-react";
import RecitalNav from "@/components/RecitalNav";
import ScrollReveal from "@/components/ScrollReveal";
import Footer from "@/components/Footer";

/* ── Constants ── */

const CAMERA_BASE = 750;
const CAMERA_ADDITIONAL = 150;

const DELIVERABLES = [
  {
    id: "30s",
    label: "30-Second Vertical Video",
    description: "Portrait format, social-ready content",
    price: 175,
    unit: "each",
    hasQuantity: true,
  },
  {
    id: "1min",
    label: "1-Minute Brand Story",
    description: "Uses all footage to create a captivating brand story video",
    price: 350,
    unit: "each",
    hasQuantity: true,
  },
  {
    id: "10s",
    label: "10-Second Vertical Video",
    description: "Micro clip for hooks and teasers",
    price: 100,
    unit: "each",
    hasQuantity: true,
  },
  {
    id: "raw",
    label: "Raw Footage Package",
    description: "All raw video captured for client remix and use",
    price: 250,
    unit: "flat",
    hasQuantity: false,
  },
] as const;

const CAMERAS = [
  {
    id: "gimbal",
    label: "Gimbal-Operated Movement Camera",
    description: "Roaming movement for dynamic b-roll footage",
  },
  {
    id: "interview",
    label: "Interview Camera",
    description: "Lighting and audio for testimonials and interviews",
  },
  {
    id: "selfie",
    label: "Selfie Studio",
    description: "Unmanned station for self-recorded content",
  },
];

const SHOOT_OPTIONS = [
  { hours: 3, label: "3 hrs", sub: "Base", modifier: 1.0 },
  { hours: 4, label: "4 hrs", sub: "+10%", modifier: 1.1 },
  { hours: 5, label: "5 hrs", sub: "+20%", modifier: 1.2 },
];

const VOLUME_TIERS = [
  { min: 2250, discount: 0.2, label: "20%" },
  { min: 1750, discount: 0.15, label: "15%" },
  { min: 1250, discount: 0.1, label: "10%" },
];

function money(n: number) {
  return "$" + Math.round(n).toLocaleString("en-CA");
}

/* ── Component ── */

export default function DancePromo() {
  const [shootLength, setShootLength] = useState(3);
  const [cameras, setCameras] = useState<Set<string>>(new Set());
  const [quantities, setQuantities] = useState<Record<string, number>>({
    "30s": 0,
    "1min": 0,
    "10s": 0,
  });
  const [rawFootage, setRawFootage] = useState(false);

  /* Form */
  const [form, setForm] = useState({
    email: "",
    studio: "",
    date: "",
    startTime: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  /* Calculations */
  const calc = useMemo(() => {
    const cameraCount = cameras.size;
    const elementsCost =
      cameraCount === 0 ? 0 : CAMERA_BASE + (cameraCount - 1) * CAMERA_ADDITIONAL;

    let deliverablesCost = 0;
    deliverablesCost += quantities["30s"] * 175;
    deliverablesCost += quantities["1min"] * 350;
    deliverablesCost += quantities["10s"] * 100;
    if (rawFootage) deliverablesCost += 250;

    const preModifier = elementsCost + deliverablesCost;
    const shootOption = SHOOT_OPTIONS.find((s) => s.hours === shootLength)!;
    const subtotal = Math.round(preModifier * shootOption.modifier);

    let discountPct = 0;
    let discountLabel = "";
    for (const tier of VOLUME_TIERS) {
      if (subtotal >= tier.min) {
        discountPct = tier.discount;
        discountLabel = tier.label;
        break;
      }
    }

    const discountAmount = Math.round(subtotal * discountPct);
    const total = subtotal - discountAmount;

    // Next discount tier info
    let nextTierMsg = "";
    if (discountPct === 0 && subtotal > 0) {
      nextTierMsg = `Add ${money(1250 - subtotal)} more to unlock 10% savings`;
    } else if (discountPct === 0.1) {
      nextTierMsg = `Add ${money(1750 - subtotal)} more to unlock 15% savings`;
    } else if (discountPct === 0.15) {
      nextTierMsg = `Add ${money(2250 - subtotal)} more to unlock 20% savings`;
    }

    return {
      cameraCount,
      elementsCost,
      deliverablesCost,
      subtotal,
      discountPct,
      discountLabel,
      discountAmount,
      total,
      nextTierMsg,
    };
  }, [cameras, quantities, rawFootage, shootLength]);

  /* Handlers */
  const toggleCamera = (id: string) => {
    setCameras((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const setQty = (id: string, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + delta),
    }));
  };

  const updateForm = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    if (!form.email || !form.studio) {
      setSubmitError("Email and studio name are required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setSubmitError("Please enter a valid email address.");
      return;
    }
    if (calc.total === 0) {
      setSubmitError("Please select at least one production element or deliverable.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch("/api/dance-promo-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          shootLength,
          cameras: Array.from(cameras),
          deliverables: {
            "30s": quantities["30s"],
            "1min": quantities["1min"],
            "10s": quantities["10s"],
            raw: rawFootage,
          },
          elementsCost: calc.elementsCost,
          deliverablesCost: calc.deliverablesCost,
          subtotal: calc.subtotal,
          discountLabel: calc.discountLabel,
          discountAmount: calc.discountAmount,
          total: calc.total,
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

  const cardBase =
    "p-6 rounded-xl border transition-all duration-200 cursor-pointer select-none";
  const cardOff = "bg-charcoal-dark/60 border-white/5 hover:border-white/10";
  const cardOn =
    "bg-cyan-brand/10 border-cyan-brand/30 ring-1 ring-cyan-brand/20";

  return (
    <>
      <RecitalNav ctaHref="/dance" ctaLabel="Dance Services" />

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
                Build Your Perfect Video Package
              </h1>
              <p className="text-lg text-gray-400 mb-6">
                Select production elements and deliverables. Dynamic pricing
                with automatic volume discounts.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.05}>
              <div className="flex flex-wrap gap-3 text-sm text-gray-400">
                {[
                  "One revision per deliverable",
                  "6\u20138 week delivery",
                  "3-hour consultation included",
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

            {/* Testimonial */}
            <ScrollReveal delay={0.1}>
              <div className="mt-8 p-6 rounded-xl bg-charcoal-dark/60 border border-white/5">
                <Quote size={20} className="text-cyan-brand/30 mb-3" />
                <p className="text-gray-300 leading-relaxed italic text-base">
                  &ldquo;Working with the team at StreamStage has been a dream!
                  Both Dan and Kayla are knowledgeable about the dance world and
                  were easy to work with when creating our vision. The content
                  showcased our brand and studio values incredibly well.&rdquo;
                </p>
                <div className="mt-4 pt-3 border-t border-white/5">
                  <p className="font-heading font-semibold text-cyan-brand">
                    Lainy Zimmer
                  </p>
                  <p className="text-sm text-gray-500">
                    Owner, Footprints Dance Centre
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </section>

          <div className="section-divider mb-14" />

          {/* ── Shoot Length ── */}
          <ScrollReveal>
            <section className="mb-14">
              <h2 className="font-heading text-2xl font-semibold text-white mb-3">
                Shoot Length
              </h2>
              <p className="text-base text-gray-500 mb-5">
                Base: 3 hours. Longer shoots add a percentage to the total.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {SHOOT_OPTIONS.map((opt) => {
                  const active = shootLength === opt.hours;
                  return (
                    <div
                      key={opt.hours}
                      onClick={() => setShootLength(opt.hours)}
                      className={`${cardBase} text-center ${active ? cardOn : cardOff}`}
                    >
                      <p
                        className={`font-heading text-lg font-semibold ${active ? "text-cyan-brand" : "text-white"}`}
                      >
                        {opt.label}
                      </p>
                      <p className="text-sm text-gray-500">({opt.sub})</p>
                    </div>
                  );
                })}
              </div>
            </section>
          </ScrollReveal>

          <div className="section-divider mb-14" />

          {/* ── Production Elements ── */}
          <ScrollReveal>
            <section className="mb-14">
              <h2 className="font-heading text-2xl font-semibold text-white mb-3">
                Production Elements
              </h2>
              <p className="text-base text-gray-500 mb-6">
                1st camera: $750. Each additional: +$150. All cameras capture
                the full shoot length.
              </p>

              <div className="grid sm:grid-cols-3 gap-4">
                {CAMERAS.map((cam) => {
                  const active = cameras.has(cam.id);
                  const Icon =
                    cam.id === "gimbal"
                      ? Video
                      : cam.id === "interview"
                        ? Mic
                        : Smartphone;
                  return (
                    <div
                      key={cam.id}
                      onClick={() => toggleCamera(cam.id)}
                      className={`${cardBase} ${active ? cardOn : cardOff}`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <Icon
                          size={24}
                          className={
                            active ? "text-cyan-brand" : "text-gray-500"
                          }
                        />
                        <p className="font-heading text-base font-semibold text-white">
                          {cam.label}
                        </p>
                      </div>
                      <p className="text-sm text-gray-400">{cam.description}</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Captures full shoot length
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          </ScrollReveal>

          <div className="section-divider mb-14" />

          {/* ── Video Deliverables ── */}
          <ScrollReveal>
            <section className="mb-14">
              <h2 className="font-heading text-2xl font-semibold text-white mb-6">
                Video Deliverables
              </h2>

              <div className="space-y-4">
                {DELIVERABLES.map((del) => {
                  const isRaw = del.id === "raw";
                  const qty = isRaw ? (rawFootage ? 1 : 0) : quantities[del.id] || 0;
                  const active = qty > 0;

                  return (
                    <div
                      key={del.id}
                      className={`p-6 rounded-xl border transition-all duration-200 ${active ? "bg-cyan-brand/5 border-cyan-brand/20" : "bg-charcoal-dark/60 border-white/5"}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-heading text-base font-semibold text-white">
                            {del.label}
                          </p>
                          <p className="text-sm text-gray-400 mt-1">
                            {del.description}
                          </p>
                          <p className="text-base text-cyan-brand font-medium mt-2">
                            ${del.price} {del.unit}
                          </p>
                        </div>
                        <div className="shrink-0">
                          {isRaw ? (
                            <button
                              onClick={() => setRawFootage((v) => !v)}
                              className={`cursor-pointer px-5 py-2.5 rounded-lg text-base font-medium transition-all ${
                                rawFootage
                                  ? "bg-cyan-brand text-charcoal-deep"
                                  : "bg-charcoal-mid border border-white/10 text-gray-400 hover:text-white"
                              }`}
                            >
                              {rawFootage ? "Selected" : "Select"}
                            </button>
                          ) : (
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => setQty(del.id, -1)}
                                className="cursor-pointer w-10 h-10 rounded-lg bg-charcoal-mid border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                              >
                                <Minus size={18} />
                              </button>
                              <span className="w-10 text-center text-lg font-heading font-semibold text-white">
                                {qty}
                              </span>
                              <button
                                onClick={() => setQty(del.id, 1)}
                                className="cursor-pointer w-10 h-10 rounded-lg bg-charcoal-mid border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                              >
                                <Plus size={18} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                <Row
                  label="Shoot Length"
                  value={`${shootLength} hours`}
                />
                <Row
                  label={`Production Elements (${calc.cameraCount} camera${calc.cameraCount !== 1 ? "s" : ""})`}
                  value={money(calc.elementsCost)}
                />
                <Row
                  label="Video Deliverables"
                  value={money(calc.deliverablesCost)}
                />

                <div className="border-t border-white/5 pt-5" />

                <Row label="Subtotal" value={money(calc.subtotal)} />

                {calc.discountPct > 0 && (
                  <Row
                    label={`Volume Discount (${calc.discountLabel})`}
                    value={`-${money(calc.discountAmount)}`}
                    highlight
                  />
                )}

                <Row
                  label="Total Investment"
                  value={`${money(calc.total)} +HST`}
                  highlight
                  bold
                />

                {calc.nextTierMsg && (
                  <div className="mt-4 p-4 rounded-lg bg-amber-brand/10 border border-amber-brand/20">
                    <p className="text-sm text-amber-brand font-medium">
                      {calc.nextTierMsg}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Volume discounts: 10% at $1,250 &middot; 15% at $1,750
                      &middot; 20% at $2,250
                    </p>
                  </div>
                )}
              </div>
            </section>
          </ScrollReveal>

          <div className="section-divider mb-14" />

          {/* ── Submit Form ── */}
          <section id="submit-section" className="mb-16 scroll-mt-24">
            <ScrollReveal>
              {submitted ? (
                <div className="rounded-xl bg-charcoal-dark/60 border border-cyan-brand/20 p-8 sm:p-12 text-center">
                  <CheckCircle2
                    size={56}
                    className="text-cyan-brand mx-auto mb-5"
                  />
                  <h2 className="font-heading text-3xl font-bold text-white mb-4">
                    Proposal Submitted!
                  </h2>
                  <p className="text-lg text-gray-400 mb-6">
                    We&rsquo;ll get back to you within one business day.
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
                <div className="rounded-xl bg-charcoal-dark/60 border border-white/5 p-6 sm:p-8">
                  <h2 className="font-heading text-2xl font-semibold text-white mb-6">
                    Submit Your Proposal
                  </h2>

                  <div className="grid sm:grid-cols-2 gap-5 mb-5">
                    <FormInput
                      label="Email Address"
                      type="email"
                      value={form.email}
                      onChange={(v) => updateForm("email", v)}
                      required
                    />
                    <FormInput
                      label="Studio Name"
                      value={form.studio}
                      onChange={(v) => updateForm("studio", v)}
                      required
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-5 mb-5">
                    <FormInput
                      label="Preferred Shoot Date"
                      type="date"
                      value={form.date}
                      onChange={(v) => updateForm("date", v)}
                      placeholder="Optional"
                    />
                    <div>
                      <label className="block text-base text-gray-400 mb-2">
                        Start Time
                      </label>
                      <select
                        value={form.startTime}
                        onChange={(e) => updateForm("startTime", e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-charcoal-mid border border-white/10 text-white text-base focus:outline-none focus:border-cyan-brand/50 focus:ring-1 focus:ring-cyan-brand/20 transition-all"
                      >
                        <option value="">Select time (optional)</option>
                        {Array.from({ length: 27 }, (_, i) => {
                          const hour = 8 + Math.floor(i / 2);
                          const min = i % 2 === 0 ? "00" : "30";
                          const ampm = hour >= 12 ? "PM" : "AM";
                          const display = `${hour > 12 ? hour - 12 : hour}:${min} ${ampm}`;
                          return (
                            <option key={i} value={display}>
                              {display}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  <p className="text-sm text-gray-500 mb-5">
                    Date and time are optional — we&rsquo;ll coordinate
                    scheduling after your proposal is reviewed.
                  </p>

                  {submitError && (
                    <p className="text-base text-red-400 mt-4 mb-4">
                      {submitError}
                    </p>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="cursor-pointer w-full sm:w-auto inline-flex items-center justify-center gap-2 px-10 py-4 text-base font-semibold rounded-lg bg-cyan-brand text-charcoal-deep hover:bg-cyan-brand/90 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-brand/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      "Submitting..."
                    ) : (
                      <>
                        Submit Proposal <Send size={18} />
                      </>
                    )}
                  </button>

                  {/* Terms */}
                  <div className="mt-8 pt-6 border-t border-white/5">
                    <p className="text-sm text-gray-500 font-medium mb-3">
                      Terms & Conditions
                    </p>
                    <div className="grid sm:grid-cols-2 gap-2 text-sm text-gray-500">
                      {[
                        "Standard delivery: 6\u20138 weeks",
                        "All prices in CAD + HST",
                        "50% deposit to commence",
                        "Final payment due upon delivery",
                        "Social media optimization included",
                        "Professional color grading & audio mixing",
                      ].map((term) => (
                        <p key={term} className="flex items-start gap-2">
                          <Check
                            size={14}
                            className="text-gray-600 mt-0.5 shrink-0"
                          />
                          {term}
                        </p>
                      ))}
                    </div>
                  </div>
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
      <label className="block text-base text-gray-400 mb-2">
        {label}
        {required && <span className="text-cyan-brand ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || label}
        className="w-full px-4 py-3 rounded-lg bg-charcoal-mid border border-white/10 text-white text-base placeholder:text-gray-600 focus:outline-none focus:border-cyan-brand/50 focus:ring-1 focus:ring-cyan-brand/20 transition-all"
      />
    </div>
  );
}
