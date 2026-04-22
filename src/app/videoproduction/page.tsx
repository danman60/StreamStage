"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  Film,
  Mail,
  Megaphone,
  Minus,
  Plus,
  Send,
  Sparkles,
  Video,
} from "lucide-react";
import RecitalNav from "@/components/RecitalNav";
import ScrollReveal from "@/components/ScrollReveal";
import Footer from "@/components/Footer";

const BASE_PACKAGE_PRICE = 1250;
const CAMPAIGN_WEEKS = 13;
const CAMPAIGN_MONTHS = 3;
const SOCIAL_POST_PRICE = 40;
const NEWSLETTER_PRICE = 75;

const ADDITIONAL_VIDEO_OPTIONS = [
  {
    id: "none",
    label: "Base package only",
    description: "Main landscape video with no extra edits",
    countLabel: "No add-on",
    price: 0,
  },
  {
    id: "plus3",
    label: "+3 videos",
    description: "Venue and personal story cutdowns",
    countLabel: "3 additional campaign videos",
    price: 500,
  },
  {
    id: "plus5",
    label: "+5 videos",
    description: "Extended campaign suite",
    countLabel: "5 additional campaign videos",
    price: 750,
  },
  {
    id: "plus10",
    label: "+10 videos",
    description: "Full campaign rollout",
    countLabel: "10 additional campaign videos",
    price: 1000,
  },
] as const;

const DISCOUNT_TIERS = [
  { min: 2250, discount: 0.2, label: "20%" },
  { min: 1750, discount: 0.15, label: "15%" },
  { min: 1250, discount: 0.1, label: "10%" },
] as const;

function money(n: number) {
  return "$" + Math.round(n).toLocaleString("en-CA");
}

export default function VideoProductionProposal() {
  const [additionalVideos, setAdditionalVideos] = useState<
    (typeof ADDITIONAL_VIDEO_OPTIONS)[number]["id"]
  >("none");
  const [socialPostsPerWeek, setSocialPostsPerWeek] = useState(0);
  const [newslettersPerMonth, setNewslettersPerMonth] = useState(0);

  const [form, setForm] = useState({
    organization: "",
    contactName: "",
    email: "",
    phone: "",
    preferredDate: "",
    location: "",
    campaignName: "",
    creativeInput: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const selectedVideoOption =
    ADDITIONAL_VIDEO_OPTIONS.find((option) => option.id === additionalVideos) ??
    ADDITIONAL_VIDEO_OPTIONS[0];

  const calc = useMemo(() => {
    const additionalVideoCost = selectedVideoOption.price;
    const socialPostsTotal =
      socialPostsPerWeek * CAMPAIGN_WEEKS * SOCIAL_POST_PRICE;
    const newslettersTotal =
      newslettersPerMonth * CAMPAIGN_MONTHS * NEWSLETTER_PRICE;
    const marketingSupportTotal = socialPostsTotal + newslettersTotal;
    const subtotal =
      BASE_PACKAGE_PRICE + additionalVideoCost + marketingSupportTotal;

    let discountPct = 0;
    let discountLabel = "";
    for (const tier of DISCOUNT_TIERS) {
      if (subtotal >= tier.min) {
        discountPct = tier.discount;
        discountLabel = tier.label;
        break;
      }
    }

    const discountAmount = Math.round(subtotal * discountPct);
    const total = subtotal - discountAmount;

    let nextTierMessage = "";
    if (discountPct === 0 && subtotal > 0) {
      nextTierMessage = `Add ${money(1250 - subtotal)} more to unlock 10% savings`;
    } else if (discountPct === 0.1) {
      nextTierMessage = `Add ${money(1750 - subtotal)} more to unlock 15% savings`;
    } else if (discountPct === 0.15) {
      nextTierMessage = `Add ${money(2250 - subtotal)} more to unlock 20% savings`;
    }

    return {
      additionalVideoCost,
      socialPostsTotal,
      newslettersTotal,
      marketingSupportTotal,
      subtotal,
      discountPct,
      discountLabel,
      discountAmount,
      total,
      nextTierMessage,
    };
  }, [newslettersPerMonth, selectedVideoOption.price, socialPostsPerWeek]);

  const updateForm = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const changeCounter = (
    setter: React.Dispatch<React.SetStateAction<number>>,
    min: number,
    max: number,
    delta: number
  ) => {
    setter((prev) => Math.max(min, Math.min(max, prev + delta)));
  };

  const handleSubmit = async () => {
    if (!form.organization || !form.contactName || !form.email) {
      setSubmitError("Organization, contact name, and email are required.");
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
          basePackagePrice: BASE_PACKAGE_PRICE,
          additionalVideos: selectedVideoOption,
          socialPostsPerWeek,
          newslettersPerMonth,
          campaignWeeks: CAMPAIGN_WEEKS,
          campaignMonths: CAMPAIGN_MONTHS,
          socialPostsTotal: calc.socialPostsTotal,
          newslettersTotal: calc.newslettersTotal,
          marketingSupportTotal: calc.marketingSupportTotal,
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

  const marketingCard =
    "bg-charcoal-dark/60 border border-white/5 rounded-2xl p-6";

  return (
    <>
      <RecitalNav ctaHref="/#business-video" ctaLabel="Business Video" />

      <main className="min-h-screen pt-24 pb-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <section className="mb-14">
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
                Select your campaign options, marketing support, and contact
                details. StreamStage will receive the package summary and follow
                up with your custom quote.
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
                        Base Campaign Package
                      </h2>
                      <p className="text-gray-400 mt-2">
                        Full-day production, primary landscape edit, and project
                        coordination.
                      </p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 text-sm text-gray-300">
                    {[
                      "1 full-day shoot",
                      "Main landscape video",
                      "Professional editing and colour grading",
                      "Project coordination and planning",
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

                  <div className="mt-6 rounded-2xl border border-cyan-brand/20 bg-cyan-brand/5 p-5">
                    <p className="text-sm uppercase tracking-[0.2em] text-cyan-brand mb-2">
                      Base Investment
                    </p>
                    <p className="font-heading text-3xl font-bold text-white">
                      {money(BASE_PACKAGE_PRICE)}
                    </p>
                  </div>
                </section>
              </ScrollReveal>

              <ScrollReveal delay={0.05}>
                <section className="bg-charcoal-dark/50 border border-white/5 rounded-3xl p-6 sm:p-8">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 rounded-xl bg-cyan-brand/10 text-cyan-brand">
                      <Film size={24} />
                    </div>
                    <div>
                      <h2 className="font-heading text-2xl font-bold text-white">
                        Additional Videos
                      </h2>
                      <p className="text-gray-400 mt-2">
                        Expand the campaign with extra cutdowns and supporting
                        story edits.
                      </p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {ADDITIONAL_VIDEO_OPTIONS.map((option) => {
                      const active = option.id === additionalVideos;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setAdditionalVideos(option.id)}
                          className={`${cardBase} ${active ? cardOn : cardOff} text-left`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm uppercase tracking-[0.18em] text-cyan-brand mb-2">
                                {option.countLabel}
                              </p>
                              <h3 className="font-heading text-xl font-bold text-white mb-2">
                                {option.label}
                              </h3>
                              <p className="text-gray-400 text-sm">
                                {option.description}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-white font-semibold">
                                {option.price === 0 ? "$0" : `+${money(option.price)}`}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </ScrollReveal>

              <ScrollReveal delay={0.1}>
                <section className="bg-charcoal-dark/50 border border-white/5 rounded-3xl p-6 sm:p-8">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 rounded-xl bg-cyan-brand/10 text-cyan-brand">
                      <Megaphone size={24} />
                    </div>
                    <div>
                      <h2 className="font-heading text-2xl font-bold text-white">
                        Marketing Support
                      </h2>
                      <p className="text-gray-400 mt-2">
                        Optional campaign support across a 13-week, 3-month
                        rollout.
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <div className={marketingCard}>
                      <p className="text-sm uppercase tracking-[0.18em] text-cyan-brand mb-2">
                        Social Posts per Week
                      </p>
                      <div className="flex items-center justify-between gap-4 mb-4">
                        <button
                          type="button"
                          onClick={() =>
                            changeCounter(
                              setSocialPostsPerWeek,
                              0,
                              7,
                              -1
                            )
                          }
                          className="p-3 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:border-white/20 transition-colors"
                          aria-label="Decrease social posts"
                        >
                          <Minus size={18} />
                        </button>
                        <div className="text-center">
                          <p className="font-heading text-4xl font-bold text-white">
                            {socialPostsPerWeek}
                          </p>
                          <p className="text-sm text-gray-400">posts / week</p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            changeCounter(setSocialPostsPerWeek, 0, 7, 1)
                          }
                          className="p-3 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:border-white/20 transition-colors"
                          aria-label="Increase social posts"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                      <p className="text-sm text-gray-400">
                        {socialPostsPerWeek * CAMPAIGN_WEEKS} total posts at{" "}
                        {money(SOCIAL_POST_PRICE)} each
                      </p>
                      <p className="mt-3 text-lg font-semibold text-white">
                        {money(calc.socialPostsTotal)}
                      </p>
                    </div>

                    <div className={marketingCard}>
                      <p className="text-sm uppercase tracking-[0.18em] text-cyan-brand mb-2">
                        Newsletters per Month
                      </p>
                      <div className="flex items-center justify-between gap-4 mb-4">
                        <button
                          type="button"
                          onClick={() =>
                            changeCounter(
                              setNewslettersPerMonth,
                              0,
                              4,
                              -1
                            )
                          }
                          className="p-3 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:border-white/20 transition-colors"
                          aria-label="Decrease newsletters"
                        >
                          <Minus size={18} />
                        </button>
                        <div className="text-center">
                          <p className="font-heading text-4xl font-bold text-white">
                            {newslettersPerMonth}
                          </p>
                          <p className="text-sm text-gray-400">
                            newsletters / month
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            changeCounter(setNewslettersPerMonth, 0, 4, 1)
                          }
                          className="p-3 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:border-white/20 transition-colors"
                          aria-label="Increase newsletters"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                      <p className="text-sm text-gray-400">
                        {newslettersPerMonth * CAMPAIGN_MONTHS} total newsletters
                        at {money(NEWSLETTER_PRICE)} each
                      </p>
                      <p className="mt-3 text-lg font-semibold text-white">
                        {money(calc.newslettersTotal)}
                      </p>
                    </div>
                  </div>
                </section>
              </ScrollReveal>

              <ScrollReveal delay={0.15}>
                <section
                  id="submit-section"
                  className="bg-charcoal-dark/50 border border-white/5 rounded-3xl p-6 sm:p-8"
                >
                  <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 rounded-xl bg-cyan-brand/10 text-cyan-brand">
                      <Mail size={24} />
                    </div>
                    <div>
                      <h2 className="font-heading text-2xl font-bold text-white">
                        Submit Your Proposal
                      </h2>
                      <p className="text-gray-400 mt-2">
                        Preferred date and creative input help tailor the final
                        quote.
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
                        StreamStage received the package summary and will follow
                        up with the detailed quote.
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
                          onChange={(e) =>
                            updateForm("contactName", e.target.value)
                          }
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
                          placeholder="Phone"
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
                          onChange={(e) =>
                            updateForm("location", e.target.value)
                          }
                          placeholder="Location / Venue"
                          className="bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-brand/50"
                        />
                      </div>

                      <input
                        value={form.campaignName}
                        onChange={(e) =>
                          updateForm("campaignName", e.target.value)
                        }
                        placeholder="Campaign Name"
                        className="mt-4 w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-brand/50"
                      />

                      <textarea
                        value={form.creativeInput}
                        onChange={(e) =>
                          updateForm("creativeInput", e.target.value)
                        }
                        placeholder="Creative input, goals, or campaign notes"
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
                </section>
              </ScrollReveal>
            </div>

            <ScrollReveal delay={0.05} direction="left">
              <aside className="lg:sticky lg:top-28 bg-charcoal-dark/70 border border-white/5 rounded-3xl p-6 sm:p-8">
                <div className="flex items-start gap-3 mb-6">
                  <div className="p-3 rounded-xl bg-cyan-brand/10 text-cyan-brand">
                    <Camera size={22} />
                  </div>
                  <div>
                    <h2 className="font-heading text-2xl font-bold text-white">
                      Investment Summary
                    </h2>
                    <p className="text-gray-400 mt-2">
                      Current package totals update as you change the campaign.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-gray-400">Base campaign package</span>
                    <span className="text-white font-medium">
                      {money(BASE_PACKAGE_PRICE)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-gray-400">
                      {selectedVideoOption.label}
                    </span>
                    <span className="text-white font-medium">
                      {money(calc.additionalVideoCost)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-gray-400">Marketing support</span>
                    <span className="text-white font-medium">
                      {money(calc.marketingSupportTotal)}
                    </span>
                  </div>
                  <div className="border-t border-white/10 pt-4 flex justify-between gap-4 text-sm">
                    <span className="text-gray-400">Subtotal</span>
                    <span className="text-white font-medium">
                      {money(calc.subtotal)}
                    </span>
                  </div>
                  {calc.discountAmount > 0 ? (
                    <div className="flex justify-between gap-4 text-sm">
                      <span className="text-cyan-brand">
                        Volume discount ({calc.discountLabel})
                      </span>
                      <span className="text-cyan-brand font-medium">
                        -{money(calc.discountAmount)}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 rounded-2xl bg-cyan-brand/10 border border-cyan-brand/20 p-5">
                  <p className="text-sm uppercase tracking-[0.18em] text-cyan-brand mb-2">
                    Total Investment
                  </p>
                  <p className="font-heading text-4xl font-bold text-white">
                    {money(calc.total)}
                  </p>
                  <p className="text-sm text-gray-400 mt-2">+HST</p>
                </div>

                {calc.nextTierMessage ? (
                  <p className="mt-4 text-sm text-gray-400">
                    {calc.nextTierMessage}
                  </p>
                ) : null}

                <div className="mt-8 pt-6 border-t border-white/10 space-y-3 text-sm text-gray-400">
                  <div className="flex items-start gap-3">
                    <Check size={16} className="text-cyan-brand mt-0.5 shrink-0" />
                    <span>All pricing in CAD + HST</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check size={16} className="text-cyan-brand mt-0.5 shrink-0" />
                    <span>50% deposit required to commence production</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check size={16} className="text-cyan-brand mt-0.5 shrink-0" />
                    <span>Main video delivery targets 3 to 4 weeks post-production</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check size={16} className="text-cyan-brand mt-0.5 shrink-0" />
                    <span>Marketing support begins after agreement and asset handoff</span>
                  </div>
                </div>
              </aside>
            </ScrollReveal>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
