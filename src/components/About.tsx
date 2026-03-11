"use client";

import ScrollReveal from "./ScrollReveal";
import { Radio, MonitorPlay, Users, Calendar } from "lucide-react";
import { NumberTicker } from "./magicui/number-ticker";
import { TextAnimate } from "./magicui/text-animate";

const stats = [
  { icon: Radio, value: 100, suffix: "+", label: "Events Streamed" },
  { icon: MonitorPlay, value: 500, suffix: "+", label: "Videos Produced" },
  { icon: Users, value: 50, suffix: "+", label: "Studios Served" },
  { icon: Calendar, value: 10, suffix: "+", label: "Years Experience" },
];

export default function About() {
  return (
    <section id="about" className="py-16 sm:py-20 relative">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <TextAnimate
            animation="blurInUp"
            by="word"
            as="h2"
            className="font-heading text-3xl sm:text-4xl font-bold text-white mb-6"
          >
            Built for the Stage
          </TextAnimate>
          <TextAnimate
            animation="fadeIn"
            by="word"
            as="p"
            delay={0.2}
            duration={1.5}
            className="text-lg sm:text-xl text-gray-400 leading-relaxed"
          >
            {"We live and breathe performance. Multi-camera broadcasts, highlight reels, and dance software \u2014 all built for Canada\u2019s performing arts community. Studios, competitions, and performing arts organizations across Ontario and beyond."}
          </TextAnimate>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {stats.map((stat, i) => (
            <ScrollReveal key={stat.label} delay={i * 0.1}>
              <div className="text-center p-6 rounded-xl bg-charcoal-dark/50 border border-white/5 hover:border-cyan-brand/20 transition-colors duration-300">
                <stat.icon
                  className="mx-auto mb-3 text-cyan-brand"
                  size={28}
                  strokeWidth={1.5}
                />
                <div className="font-heading text-2xl sm:text-3xl font-bold text-white mb-1">
                  <NumberTicker
                    value={stat.value}
                    suffix={stat.suffix}
                    delay={0.3 + i * 0.15}
                  />
                </div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>

      <div className="section-divider mt-16 sm:mt-20 max-w-4xl mx-auto" />
    </section>
  );
}
