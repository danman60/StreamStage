"use client";

import ScrollReveal from "./ScrollReveal";
import {
  Monitor,
  Sparkles,
  Megaphone,
  ClipboardList,
  Video,
  Quote,
} from "lucide-react";

const services = [
  {
    icon: Monitor,
    title: "Hybrid Events",
    description:
      "Live + virtual event production that extends your reach beyond the room. Multi-camera, switched, and streamed.",
  },
  {
    icon: Sparkles,
    title: "Social Highlights",
    description:
      "Short, punchy content designed for social media engagement. Reels, stories, and clips that convert.",
  },
  {
    icon: Megaphone,
    title: "Promotional Content",
    description:
      "Brand videos, product launches, and marketing content that tells your story with cinematic quality.",
  },
  {
    icon: ClipboardList,
    title: "Planning & Strategy",
    description:
      "End-to-end video strategy from concept through delivery. We handle the creative so you can focus on your business.",
  },
];

const portfolio = [
  { title: "Cristini Crossfit", category: "Promo" },
  { title: "Goat Yoga Toronto", category: "Social" },
  { title: "Raw Rock Shop", category: "Brand" },
  { title: "Uvalux Tanning", category: "Commercial" },
];

const testimonials = [
  {
    quote:
      "StreamStage understood our brand instantly and delivered video content that exceeded our expectations.",
    name: "Sarah Higgins",
    role: "Founder, Cedar Nook Creative",
  },
  {
    quote:
      "They made the whole process seamless. From planning through final delivery, everything was professional and on time.",
    name: "Jan Arp",
    role: "Director, Holt Xchange",
  },
];

export default function BusinessVideo() {
  return (
    <section id="business-video" className="py-24 sm:py-32 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <ScrollReveal>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block text-amber-brand text-sm font-semibold tracking-widest uppercase mb-4">
              Business Video
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
              Full-Stack Video for Your Business
            </h2>
            <p className="text-lg text-gray-400 leading-relaxed">
              Professional video production that drives real results — from
              events to social content.
            </p>
          </div>
        </ScrollReveal>

        {/* Services grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {services.map((service, i) => (
            <ScrollReveal key={service.title} delay={i * 0.1}>
              <div className="group p-6 rounded-xl bg-charcoal-dark/50 border border-white/5 hover:border-amber-brand/30 transition-all duration-300 h-full">
                <div className="w-12 h-12 rounded-lg bg-amber-brand/10 flex items-center justify-center mb-4 group-hover:bg-amber-brand/20 transition-colors duration-300">
                  <service.icon
                    className="text-amber-brand"
                    size={24}
                    strokeWidth={1.5}
                  />
                </div>
                <h3 className="font-heading text-lg font-semibold text-white mb-2">
                  {service.title}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {service.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Portfolio grid */}
        <ScrollReveal>
          <h3 className="font-heading text-2xl font-bold text-white text-center mb-8">
            Client Work
          </h3>
        </ScrollReveal>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
          {portfolio.map((item, i) => (
            <ScrollReveal key={item.title} delay={i * 0.05}>
              <div className="group relative aspect-video rounded-lg bg-charcoal-mid border border-white/5 overflow-hidden hover:border-amber-brand/20 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-charcoal-dark to-charcoal-mid flex items-center justify-center">
                  <Video
                    className="text-gray-700 group-hover:text-amber-brand/30 transition-colors duration-300"
                    size={40}
                    strokeWidth={1}
                  />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-sm font-medium text-white">
                    {item.title}
                  </p>
                  <p className="text-xs text-gray-400">{item.category}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Testimonials */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {testimonials.map((testimonial, i) => (
            <ScrollReveal key={testimonial.name} delay={i * 0.1}>
              <figure className="p-6 rounded-xl bg-charcoal-dark/30 border border-white/5">
                <Quote
                  className="text-amber-brand/30 mb-4"
                  size={24}
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <blockquote className="text-gray-300 text-sm leading-relaxed mb-4 italic">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <figcaption>
                  <cite className="not-italic">
                    <span className="text-white text-sm font-medium block">
                      {testimonial.name}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {testimonial.role}
                    </span>
                  </cite>
                </figcaption>
              </figure>
            </ScrollReveal>
          ))}
        </div>
      </div>

      <div className="section-divider mt-24 sm:mt-32 max-w-4xl mx-auto" />
    </section>
  );
}
