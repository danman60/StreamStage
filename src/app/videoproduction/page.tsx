"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  Clapperboard,
  Image as ImageIcon,
  Minus,
  Send,
  Sparkles,
  Users,
  Video,
  Plus,
} from "lucide-react";
import RecitalNav from "@/components/RecitalNav";
import ScrollReveal from "@/components/ScrollReveal";
import Footer from "@/components/Footer";

const PRIMARY_OPERATOR_DAY_RATE = 750;
const SECOND_OPERATOR_DAY_RATE = 250;

const DELIVERABLES = [
  {
    id: "drone",
    title: "Drone Video",
    description: "Aerial establishing footage and dynamic movement shots",
    price: 250,
    quantityLabel: "flat",
    hasQuantity: false,
  },
  {
    id: "oneMinuteReel",
    title: "1-Minute Social Reel",
    description: "Hero cut for launch, promotion, or recap",
    price: 249,
    quantityLabel: "each",
    hasQuantity: true,
  },
  {
    id: "stillImages",
    title: "50 Edited Still Images",
    description: "Retouched image package for marketing and web use",
    price: 150,
    quantityLabel: "set",
    hasQuantity: true,
  },
  {
    id: "fifteenSecondReels",
    title: "Five 15-Second Social Reels",
    description: "Short-form vertical edits ready for posting",
    price: 150,
    quantityLabel: "pack",
    hasQuantity: true,
  },
  {
    id: "rawVideo",
    title: "All Raw Video Footage",
    description: "Source video files delivered for internal reuse",
    price: 100,
    quantityLabel: "flat",
    hasQuantity: false,
  },
  {
    id: "rawImages",
    title: "All Raw Images",
    description: "Unedited image archive from the shoot",
    price: 100,
    quantityLabel: "flat",
    hasQuantity: false,
  },
] as const;

type DeliverableId = (typeof DELIVERABLES)[number]["id"];

function money(n: number) {
  return "$" + Math.round(n).toLocaleString("en-CA");
}

export default function VideoProductionProposal() {
  const [shootDays, setShootDays] = useState(2);
  const [secondOperatorDays, setSecondOperatorDays] = useState(0);
  const [quantities, setQuantities] = useState<Record<string, number>>({
    oneMinuteReel: 1,
    stillImages: 0,
    fifteenSecondReels: 0,
  });
  const [selectedDeliverables, setSelectedDeliverables] = useState<
    Record<DeliverableId, boolean>
  >({
    drone: true,
    oneMinuteReel: true,
    stillImages: false,
    fifteenSecondReels: false,
    rawVideo: false,
    rawImages: false,
  });

  const [form, setForm] = useState({
    organization: "",
    contactName: "",
    email: "",
    phone: "",
    preferredDate: "",
    location: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const calc = useMemo(() => {
    const primaryOperatorCost = shootDays * PRIMARY_OPERATOR_DAY_RATE;
    const secondOperatorCost = secondOperatorDays * SECOND_OPERATOR_DAY_RATE;

    const deliverableLineItems = DELIVERABLES.filter(
      (item) => selectedDeliverables[item.id]
    ).map((item) => {
      const quantity = item.hasQuantity
        ? Math.max(1, quantities[item.id] || 1)
        : 1;
      return {
        id: item.id,
        title: item.title,
        quantity,
        unitPrice: item.price,
        total: item.price * quantity,
      };
    });

    const deliverablesCost = deliverableLineItems.reduce(
      (sum, item) => sum + item.total,
      0
    );
    const total = primaryOperatorCost + secondOperatorCost + deliverablesCost;

    return {
      primaryOperatorCost,
      secondOperatorCost,
      deliverablesCost,
      deliverableLineItems,
      total,
    };
  }, [quantities, secondOperatorDays, selectedDeliverables, shootDays]);

  const updateForm = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const adjustCounter = (
    setter: React.Dispatch<React.SetStateAction<number>>,
    min: number,
    max: number,
    delta: number
  ) => {
    setter((prev) => Math.max(min, Math.min(max, prev + delta)));
  };

  const toggleDeliverable = (id: DeliverableId) => {
    setSelectedDeliverables((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const setQuantity = (id: string, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.max(1, (prev[id] || 1) + delta),
    }));
  };

  const handleShootDaysChange = (delta: number) => {
    setShootDays((prev) => {
      const next = Math.max(1, Math.min(7, prev + delta));
      setSecondOperatorDays((current) => Math.min(current, next));
      return next;
    });
  };

  const handleSubmit = async () => {
    if (
      !form.organization ||
      !form.contactName ||
      !form.email ||
      !form.phone ||
      !form.preferredDate ||
      !form.location
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
      const res = await fetch("/api/video-production-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          shootDays,
          secondOperatorDays,
          primaryOperatorDayRate: PRIMARY_OPERATOR_DAY_RATE,
          secondOperatorDayRate: SECOND_OPERATOR_DAY_RATE,
          deliverables: calc.deliverableLineItems,
          primaryOperatorCost: calc.primaryOperatorCost,
          secondOperatorCost: calc.secondOperatorCost,
          deliverablesCost: calc.deliverablesCost,
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
      <RecitalNav ctaHref="/#business-video" ctaLabel="Business Video" />

      <main className="min-h-screen pt-24 pb-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <section className="mb-12">
            <Link
              href="/#business-video"
              className="inline-flex items-center gap-2 text-base text-gray-400 hover:text-cyan-brand transition-colors mb-6"
            >
              <ArrowLeft size={18} /> Business Video
            </Link>

            <ScrollReveal>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-brand/10 border border-cyan-brand/20 text-cyan-brand text-sm font-semibold tracking-wide uppercase mb-6">
                <Sparkles size={16} />
                Proposal Builder
              </span>
            </ScrollReveal>

            <ScrollReveal delay={0.05}>
              <h1 className="font-heading text-4xl sm:text-5xl font-bold text-white mb-4">
                Build Your Video Production Proposal
              </h1>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <p className="text-lg sm:text-xl text-gray-400 leading-relaxed max-w-3xl">
                Configure your shoot days, operators, and deliverables. The
                investment updates automatically as you shape the package.
              </p>
            </ScrollReveal>
          </section>

          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-8 items-start">
            <div className="space-y-8">
              <ScrollReveal>
                <section className="bg-charcoal-dark/50 border border-white/5 rounded-3xl p-6 sm:p-8">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 rounded-xl bg-cyan-brand/10 text-cyan-brand">
                      <Video size={24} />
                    </div>
                    <div>
                      <h2 className="font-heading text-2xl font-bold text-white">
                        Included With Every Package
                      </h2>
                      <p className="text-gray-400 mt-2">
                        StreamStage provides the production backbone, and you
                        choose the days and deliverables on top.
                      </p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 text-sm text-gray-300">
                    {[
                      "Operator(s) for event duration",
                      "All camera equipment",
                      "Up to 4 hours consultation and coordination",
                      "Client retains all ticket revenue",
                    ].map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-3 bg-black/20 rounded-xl p-4 border border-white/5"
                      >
                        <Check size={18} className="text-cyan-brand shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </ScrollReveal>

              <ScrollReveal delay={0.05}>
                <section className="bg-charcoal-dark/50 border border-white/5 rounded-3xl p-6 sm:p-8">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 rounded-xl bg-cyan-brand/10 text-cyan-brand">
                      <Clapperboard size={24} />
                    </div>
                    <div>
                      <h2 className="font-heading text-2xl font-bold text-white">
                        Production Days
                      </h2>
                      <p className="text-gray-400 mt-2">
                        Primary operator pricing adds {money(PRIMARY_OPERATOR_DAY_RATE)} per
                        day.
                      </p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="bg-charcoal-dark/60 border border-white/5 rounded-2xl p-6">
                      <p className="text-sm uppercase tracking-[0.18em] text-cyan-brand mb-2">
                        Shoot Days
                      </p>
                      <div className="flex items-center justify-between gap-4 mb-4">
                        <button
                          type="button"
                          onClick={() => handleShootDaysChange(-1)}
                          className="p-3 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:border-white/20 transition-colors"
                          aria-label="Decrease shoot days"
                        >
                          <Minus size={18} />
                        </button>
                        <div className="text-center">
                          <p className="font-heading text-4xl font-bold text-white">
                            {shootDays}
                          </p>
                          <p className="text-sm text-gray-400">days</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleShootDaysChange(1)}
                          className="p-3 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:border-white/20 transition-colors"
                          aria-label="Increase shoot days"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                      <p className="text-lg font-semibold text-white">
                        {money(calc.primaryOperatorCost)}
                      </p>
                    </div>

                    <div className="bg-charcoal-dark/60 border border-white/5 rounded-2xl p-6">
                      <p className="text-sm uppercase tracking-[0.18em] text-cyan-brand mb-2">
                        2nd Operator Days
                      </p>
                      <div className="flex items-center justify-between gap-4 mb-4">
                        <button
                          type="button"
                          onClick={() =>
                            adjustCounter(
                              setSecondOperatorDays,
                              0,
                              shootDays,
                              -1
                            )
                          }
                          className="p-3 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:border-white/20 transition-colors"
                          aria-label="Decrease second operator days"
                        >
                          <Minus size={18} />
                        </button>
                        <div className="text-center">
                          <p className="font-heading text-4xl font-bold text-white">
                            {secondOperatorDays}
                          </p>
                          <p className="text-sm text-gray-400">days</p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            adjustCounter(
                              setSecondOperatorDays,
                              0,
                              shootDays,
                              1
                            )
                          }
                          className="p-3 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:border-white/20 transition-colors"
                          aria-label="Increase second operator days"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                      <p className="text-sm text-gray-400 mb-1">
                        Adds {money(SECOND_OPERATOR_DAY_RATE)} per day
                      </p>
                      <p className="text-lg font-semibold text-white">
                        {money(calc.secondOperatorCost)}
                      </p>
                    </div>
                  </div>
                </section>
              </ScrollReveal>

              <ScrollReveal delay={0.1}>
                <section className="bg-charcoal-dark/50 border border-white/5 rounded-3xl p-6 sm:p-8">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 rounded-xl bg-cyan-brand/10 text-cyan-brand">
                      <Camera size={24} />
                    </div>
                    <div>
                      <h2 className="font-heading text-2xl font-bold text-white">
                        Deliverables
                      </h2>
                      <p className="text-gray-400 mt-2">
                        Toggle the assets you want included and increase any
                        repeatable deliverables as needed.
                      </p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {DELIVERABLES.map((item) => {
                      const active = selectedDeliverables[item.id];
                      const quantity = quantities[item.id] || 1;
                      return (
                        <div
                          key={item.id}
                          className={`${cardBase} ${active ? cardOn : cardOff}`}
                          onClick={() => toggleDeliverable(item.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              toggleDeliverable(item.id);
                            }
                          }}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-heading text-xl font-bold text-white mb-2">
                                {item.title}
                              </p>
                              <p className="text-gray-400 text-sm">
                                {item.description}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-white font-semibold">
                                {money(item.price)}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                / {item.quantityLabel}
                              </p>
                            </div>
                          </div>

                          {active && item.hasQuantity ? (
                            <div
                              className="mt-5 flex items-center justify-between gap-4"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => setQuantity(item.id, -1)}
                                className="p-2 rounded-lg border border-white/10 text-gray-300 hover:text-white hover:border-white/20 transition-colors"
                                aria-label={`Decrease ${item.title}`}
                              >
                                <Minus size={16} />
                              </button>
                              <div className="text-center">
                                <p className="font-heading text-2xl text-white">
                                  {quantity}
                                </p>
                                <p className="text-xs text-gray-400 uppercase tracking-[0.15em]">
                                  Qty
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setQuantity(item.id, 1)}
                                className="p-2 rounded-lg border border-white/10 text-gray-300 hover:text-white hover:border-white/20 transition-colors"
                                aria-label={`Increase ${item.title}`}
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </section>
              </ScrollReveal>
            </div>

            <ScrollReveal delay={0.05} direction="left">
              <aside className="lg:sticky lg:top-28 bg-charcoal-dark/70 border border-white/5 rounded-3xl p-6 sm:p-8">
                <div className="flex items-start gap-3 mb-6">
                  <div className="p-3 rounded-xl bg-cyan-brand/10 text-cyan-brand">
                    <Users size={22} />
                  </div>
                  <div>
                    <h2 className="font-heading text-2xl font-bold text-white">
                      Investment Summary
                    </h2>
                    <p className="text-gray-400 mt-2">
                      Custom pricing updates as you change days and deliverables.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-gray-400">
                      Primary operator ({shootDays} day{shootDays === 1 ? "" : "s"})
                    </span>
                    <span className="text-white font-medium">
                      {money(calc.primaryOperatorCost)}
                    </span>
                  </div>

                  {secondOperatorDays > 0 ? (
                    <div className="flex justify-between gap-4 text-sm">
                      <span className="text-gray-400">
                        2nd operator ({secondOperatorDays} day
                        {secondOperatorDays === 1 ? "" : "s"})
                      </span>
                      <span className="text-white font-medium">
                        {money(calc.secondOperatorCost)}
                      </span>
                    </div>
                  ) : null}

                  {calc.deliverableLineItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between gap-4 text-sm"
                    >
                      <span className="text-gray-400">
                        {item.title}
                        {item.quantity > 1 ? ` x${item.quantity}` : ""}
                      </span>
                      <span className="text-white font-medium">
                        {money(item.total)}
                      </span>
                    </div>
                  ))}

                  <div className="border-t border-white/10 pt-4 flex justify-between gap-4">
                    <span className="text-white font-semibold">Total Investment</span>
                    <span className="font-heading text-3xl text-white">
                      {money(calc.total)}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-gray-400 mt-3">+HST</p>

                <div className="mt-8 pt-6 border-t border-white/10 space-y-3 text-sm text-gray-400">
                  <div className="flex items-start gap-3">
                    <Check size={16} className="text-cyan-brand mt-0.5 shrink-0" />
                    <span>2-day builds can roughly mirror the old Bronze, Silver, and Gold totals depending on your selections.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check size={16} className="text-cyan-brand mt-0.5 shrink-0" />
                    <span>Every added shoot day increases the package by {money(PRIMARY_OPERATOR_DAY_RATE)} before optional add-ons.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check size={16} className="text-cyan-brand mt-0.5 shrink-0" />
                    <span>All prices in CAD + HST.</span>
                  </div>
                </div>
              </aside>
            </ScrollReveal>
          </div>
        </div>

        <section
          id="submit-section"
          className="mt-16 border-t border-white/5 bg-charcoal-dark/40"
        >
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <ScrollReveal>
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 rounded-xl bg-cyan-brand/10 text-cyan-brand">
                  <ImageIcon size={24} />
                </div>
                <div>
                  <h2 className="font-heading text-3xl font-bold text-white">
                    Submit Proposal
                  </h2>
                  <p className="text-gray-400 mt-2 max-w-2xl">
                    Send your package summary and event details directly to
                    StreamStage for follow-up.
                  </p>
                </div>
              </div>

              {submitted ? (
                <div className="rounded-2xl border border-cyan-brand/20 bg-cyan-brand/10 p-6 text-center">
                  <CheckCircle2
                    className="mx-auto text-cyan-brand mb-4"
                    size={44}
                  />
                  <h3 className="font-heading text-2xl font-bold text-white mb-2">
                    Proposal Sent
                  </h3>
                  <p className="text-gray-300">
                    StreamStage received the package summary and will follow up
                    with the detailed quote.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <input
                      value={form.organization}
                      onChange={(e) =>
                        updateForm("organization", e.target.value)
                      }
                      placeholder="Organization *"
                      className="bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-brand/50"
                    />
                    <input
                      value={form.contactName}
                      onChange={(e) => updateForm("contactName", e.target.value)}
                      placeholder="Contact Name *"
                      className="bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-brand/50"
                    />
                    <input
                      value={form.email}
                      onChange={(e) => updateForm("email", e.target.value)}
                      placeholder="Email *"
                      className="bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-brand/50"
                    />
                    <input
                      value={form.phone}
                      onChange={(e) => updateForm("phone", e.target.value)}
                      placeholder="Phone *"
                      className="bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-brand/50"
                    />
                    <input
                      type="date"
                      value={form.preferredDate}
                      onChange={(e) =>
                        updateForm("preferredDate", e.target.value)
                      }
                      className="bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-brand/50"
                    />
                    <input
                      value={form.location}
                      onChange={(e) => updateForm("location", e.target.value)}
                      placeholder="Location / Venue *"
                      className="bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-brand/50"
                    />
                  </div>

                  <textarea
                    value={form.notes}
                    onChange={(e) => updateForm("notes", e.target.value)}
                    placeholder="Additional notes, goals, or timing details"
                    rows={5}
                    className="mt-4 w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-brand/50 resize-y"
                  />

                  {submitError ? (
                    <p className="mt-4 text-sm text-red-400">{submitError}</p>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-brand text-charcoal-deep font-semibold hover:bg-cyan-brand/90 transition-colors disabled:opacity-60"
                  >
                    <Send size={18} />
                    {submitting ? "Submitting..." : "Submit Proposal"}
                  </button>
                </>
              )}
            </ScrollReveal>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
