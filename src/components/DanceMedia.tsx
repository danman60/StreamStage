"use client";

import ScrollReveal from "./ScrollReveal";
import { Video, Radio, Film, Share2, Quote } from "lucide-react";

const services = [
  {
    icon: Radio,
    title: "Livestreaming",
    description:
      "Multi-camera live broadcast for competitions, recitals, and showcases. Professional quality your audience can watch from anywhere.",
  },
  {
    icon: Video,
    title: "Videography & Editing",
    description:
      "Full-service video production from capture to final cut. Highlight reels, performance archives, and promotional content.",
  },
  {
    icon: Film,
    title: "Promotional Videos",
    description:
      "Cinematic promotional content that captures the energy and artistry of your studio, company, or production.",
  },
  {
    icon: Share2,
    title: "Social Content",
    description:
      "Short-form, platform-optimized content for Instagram, TikTok, and YouTube that drives engagement and enrollment.",
  },
];

const portfolio = [
  { title: "National Dance Competition", category: "Livestream" },
  { title: "Annual Studio Recital", category: "Videography" },
  { title: "Theatre Production", category: "Multi-Camera" },
  { title: "Dance Showcase", category: "Promo" },
  { title: "Competition Highlights", category: "Editing" },
  { title: "Studio Promo", category: "Social" },
];

const testimonials = [
  {
    quote:
      "StreamStage captured the magic of our show in a way that truly honored the performers and the music.",
    name: "Amy Sky",
    role: "Singer-Songwriter & Performer",
  },
  {
    quote:
      "Professional, creative, and deeply committed to quality. They understand the performing arts.",
    name: "Andrea Donaldson",
    role: "Artistic Director, Nightwood Theatre",
  },
  {
    quote:
      "Our families love being able to watch the performances live. The quality is outstanding every time.",
    name: "Andrew Tribe",
    role: "Director, Original Kids Theatre",
  },
];

export default function DanceMedia() {
  return (
    <section id="dance-media" className="py-24 sm:py-32 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <ScrollReveal>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block text-cyan-brand text-sm font-semibold tracking-widest uppercase mb-4">
              Dance & Stage Media
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
              Your Performance, Elevated
            </h2>
            <p className="text-lg text-gray-400 leading-relaxed">
              From multi-camera livestreams to cinematic highlight reels, we
              bring the stage to every screen.
            </p>
          </div>
        </ScrollReveal>

        {/* Services grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {services.map((service, i) => (
            <ScrollReveal key={service.title} delay={i * 0.1}>
              <div className="group p-6 rounded-xl bg-charcoal-dark/50 border border-white/5 hover:border-cyan-brand/30 transition-all duration-300 h-full">
                <div className="w-12 h-12 rounded-lg bg-cyan-brand/10 flex items-center justify-center mb-4 group-hover:bg-cyan-brand/20 transition-colors duration-300">
                  <service.icon
                    className="text-cyan-brand"
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
            Recent Work
          </h3>
        </ScrollReveal>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-20">
          {portfolio.map((item, i) => (
            <ScrollReveal key={item.title} delay={i * 0.05}>
              <div className="group relative aspect-video rounded-lg bg-charcoal-mid border border-white/5 overflow-hidden hover:border-cyan-brand/20 transition-all duration-300">
                {/* Placeholder - will be replaced with actual thumbnails */}
                <div className="absolute inset-0 bg-gradient-to-br from-charcoal-dark to-charcoal-mid flex items-center justify-center">
                  <Video
                    className="text-gray-700 group-hover:text-cyan-brand/30 transition-colors duration-300"
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
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, i) => (
            <ScrollReveal key={testimonial.name} delay={i * 0.1}>
              <figure className="p-6 rounded-xl bg-charcoal-dark/30 border border-white/5">
                <Quote
                  className="text-cyan-brand/30 mb-4"
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
