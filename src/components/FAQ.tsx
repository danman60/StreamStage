"use client";

import { useState } from "react";
import ScrollReveal from "./ScrollReveal";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "What is StreamStage?",
    answer:
      "StreamStage is Canada's dance industry partner, combining media production, purpose-built software, and live broadcast services. With over 100 events streamed and 500+ videos produced for 50+ studios across Canada, we provide everything from multi-camera livestreaming to competition management platforms like CompSync.",
  },
  {
    question: "How does dance competition livestreaming work?",
    answer:
      "Our livestreaming service uses professional multi-camera setups with real-time switching and broadcast-quality audio. Families and fans can watch competitions, recitals, and showcases live from any device, anywhere in the world. We handle all technical production so organizers can focus on running their event.",
  },
  {
    question: "What is CompSync and how much does it cost?",
    answer:
      "CompSync is our all-in-one dance competition management platform. It handles registration, scheduling, scoring, live results, and integrates directly with our livestream services. CompSync is free to use — visit compsync.net to get started.",
  },
  {
    question: "Do you offer video production for businesses outside of dance?",
    answer:
      "Yes. We provide full-stack video production for any business — hybrid event production, social media content for Instagram, TikTok, and YouTube, brand and promotional videos, and end-to-end video strategy. Our clients include fitness studios, retail brands, theatre companies, and creative agencies across Ontario.",
  },
  {
    question: "What areas do you serve?",
    answer:
      "StreamStage serves clients across Canada, with a focus on Ontario. We regularly travel for dance competitions, recitals, and events. For business video production, we primarily serve the Greater Toronto Area and surrounding regions.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 sm:py-32 relative">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <ScrollReveal>
          <div className="text-center mb-12">
            <span className="inline-block text-cyan-brand text-sm font-semibold tracking-widest uppercase mb-4">
              FAQ
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-400 text-lg">
              Common questions about our services and software.
            </p>
          </div>
        </ScrollReveal>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <ScrollReveal key={i} delay={i * 0.05}>
              <div className="rounded-xl border border-white/5 bg-charcoal-dark/50 overflow-hidden">
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="cursor-pointer w-full flex items-center justify-between p-5 text-left"
                  aria-expanded={openIndex === i}
                >
                  <h3 className="font-heading text-base sm:text-lg font-semibold text-white pr-4">
                    {faq.question}
                  </h3>
                  <ChevronDown
                    size={20}
                    className={`text-cyan-brand shrink-0 transition-transform duration-200 ${
                      openIndex === i ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    openIndex === i ? "max-h-96 pb-5" : "max-h-0"
                  }`}
                >
                  <p className="px-5 text-gray-400 text-sm sm:text-base leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>

      <div className="section-divider mt-24 sm:mt-32 max-w-4xl mx-auto" />
    </section>
  );
}
