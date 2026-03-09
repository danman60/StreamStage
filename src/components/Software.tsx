"use client";

import { useRef } from "react";
import ScrollReveal from "./ScrollReveal";
import { BarChart3, Brain, MessageSquare, ExternalLink } from "lucide-react";
import { MagicCard } from "./magicui/magic-card";
import { BorderBeam } from "./magicui/border-beam";

const R2 = "https://pub-626d1637ca4c4f34a7916019aaa3efce.r2.dev";

const products = [
  {
    icon: BarChart3,
    name: "CompSync",
    tagline: "Competition Management Platform",
    description:
      "The all-in-one platform for dance competitions. Registration, scheduling, scoring, and live results — built by people who understand competitions.",
    href: "https://compsync.net",
    demoVideo: null,
  },
  {
    icon: Brain,
    name: "StudioSage",
    tagline: "AI-Powered Studio Assistant",
    description:
      "AI-powered assistant for dance studio owners. Answers parent questions, manages communication, and reduces administrative workload — so you can focus on teaching.",
    href: "#contact",
    demoVideo: null,
  },
  {
    icon: MessageSquare,
    name: "StudioBeat",
    tagline: "Unified Studio Management Platform",
    description:
      "All-in-one studio management — class scheduling, attendance tracking, billing, and parent communication in a single platform built for dance studios.",
    href: "#contact",
    demoVideo: `${R2}/streamstage/studiobeat-demo.mp4`,
  },
];

function ProductCard({
  product,
  index,
}: {
  product: (typeof products)[0];
  index: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  return (
    <ScrollReveal delay={index * 0.15}>
      <a
        href={product.href}
        target={product.href.startsWith("http") ? "_blank" : undefined}
        rel={
          product.href.startsWith("http") ? "noopener noreferrer" : undefined
        }
        className="group cursor-pointer block h-full"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <MagicCard
          className="h-full rounded-2xl"
          gradientColor="rgba(78, 197, 212, 0.15)"
          gradientFrom="#4EC5D4"
          gradientTo="#3BA3B0"
          gradientSize={250}
          gradientOpacity={0.8}
        >
          <div className="relative p-8 h-full">
            <BorderBeam
              size={80}
              duration={8}
              colorFrom="#4EC5D4"
              colorTo="#3BA3B0"
              borderWidth={1}
            />

            {/* Icon */}
            <div className="w-14 h-14 rounded-xl bg-cyan-brand/10 flex items-center justify-center mb-6 group-hover:bg-cyan-brand/20 transition-colors duration-300">
              <product.icon
                className="text-cyan-brand"
                size={28}
                strokeWidth={1.5}
              />
            </div>

            {/* Name */}
            <h3 className="font-heading text-xl font-bold text-white mb-1 flex items-center gap-2">
              {product.name}
              <ExternalLink
                className="text-gray-600 group-hover:text-cyan-brand transition-colors duration-200"
                size={16}
                strokeWidth={1.5}
              />
            </h3>

            {/* Tagline */}
            <p className="text-cyan-brand/70 text-sm font-medium mb-4">
              {product.tagline}
            </p>

            {/* Description — hides on hover when video exists */}
            <p
              className={`text-gray-400 text-sm leading-relaxed ${product.demoVideo ? "group-hover:opacity-0 transition-opacity duration-300" : ""}`}
            >
              {product.description}
            </p>

            {/* Demo video — fades in on hover */}
            {product.demoVideo && (
              <div className="absolute inset-x-4 bottom-4 top-[140px] rounded-lg overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <video
                  ref={videoRef}
                  src={product.demoVideo}
                  muted
                  playsInline
                  loop
                  preload="metadata"
                  className="w-full h-full object-cover object-top rounded-lg"
                />
              </div>
            )}
          </div>
        </MagicCard>
      </a>
    </ScrollReveal>
  );
}

export default function Software() {
  return (
    <section id="software" className="py-16 sm:py-20 relative">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-cyan-brand/5 blur-[150px] rounded-full" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <ScrollReveal>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block text-cyan-brand text-sm font-semibold tracking-widest uppercase mb-4">
              Dance Software
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
              Software Built for Dance
            </h2>
            <p className="text-lg text-gray-400 leading-relaxed">
              Purpose-built tools for the dance industry — because generic
              software was never designed for what you do.
            </p>
          </div>
        </ScrollReveal>

        {/* Product cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {products.map((product, i) => (
            <ProductCard key={product.name} product={product} index={i} />
          ))}
        </div>
      </div>

      <div className="section-divider mt-16 sm:mt-20 max-w-4xl mx-auto" />
    </section>
  );
}
