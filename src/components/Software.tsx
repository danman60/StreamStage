"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ScrollReveal from "./ScrollReveal";
import { TextAnimate } from "./magicui/text-animate";
import {
  BarChart3,
  Brain,
  MessageSquare,
  ExternalLink,
  PlayCircle,
} from "lucide-react";
import { MagicCard } from "./magicui/magic-card";
import { BorderBeam } from "./magicui/border-beam";

const R2 = "https://pub-626d1637ca4c4f34a7916019aaa3efce.r2.dev";

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

const products = [
  {
    icon: BarChart3,
    name: "CompSync",
    tagline: "Competition Management Platform",
    description:
      "The all-in-one platform for dance competitions. Registration, scheduling, scoring, and live results in one place.",
    brief:
      "CompSync streamlines every aspect of running a dance competition — from registration and scheduling to real-time scoring and instant results.",
    features: [
      "Online registration & payments",
      "Automated scheduling engine",
      "Real-time scoring & results",
      "Judge management & tabulation",
    ],
    href: "https://compsync.net",
    cta: "Visit Site",
    demoVideo: null as string | null,
    demoHref: null as string | null,
  },
  {
    icon: Brain,
    name: "StudioSage",
    tagline: "AI-Powered Studio Assistant",
    description:
      "AI assistant for dance studio owners. Answers parent questions, manages communication, and cuts admin work so you can teach.",
    brief:
      "StudioSage uses AI to handle the questions and communication that eat up your day — so you can focus on teaching, not typing.",
    features: [
      "Instant parent Q&A responses",
      "Smart communication drafting",
      "Policy & schedule lookups",
      "Learns your studio's voice",
    ],
    href: "#contact",
    cta: "Learn More",
    demoVideo: null as string | null,
    demoHref: null as string | null,
  },
  {
    icon: MessageSquare,
    name: "StudioBeat",
    tagline: "Unified Studio Management Platform",
    description:
      "All-in-one studio management. Class scheduling, attendance, billing, and parent communication in one platform.",
    brief:
      "StudioBeat brings class management, billing, attendance, and parent communication into one unified platform built specifically for dance studios.",
    features: [
      "Class scheduling & attendance",
      "Integrated billing & payments",
      "Parent communication hub",
      "Student progress tracking",
    ],
    href: "#contact",
    cta: "Learn More",
    demoVideo: `${R2}/streamstage/studiobeat-demo.mp4`,
    demoHref: null as string | null, // wire up later
  },
];

type Product = (typeof products)[number];

/* ─── Mobile Interactive Layout ─── */
function MobileProducts() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const handleTap = (index: number) => {
    // Toggle: tap same card to collapse, tap different to switch
    const next = activeIndex === index ? null : index;
    // Pause all videos
    videoRefs.current.forEach((v) => v?.pause());
    setActiveIndex(next);
  };

  // Play video when card becomes active
  useEffect(() => {
    if (activeIndex !== null) {
      const video = videoRefs.current[activeIndex];
      if (video) {
        video.currentTime = 0;
        video.play().catch(() => {});
      }
    }
  }, [activeIndex]);

  return (
    <div className="space-y-3">
      {/* Persistent hidden videos for pre-buffering */}
      {products.map((product, i) =>
        product.demoVideo ? (
          <video
            key={`mv-${i}`}
            ref={(el) => { videoRefs.current[i] = el; }}
            src={product.demoVideo}
            muted
            playsInline
            loop
            preload="auto"
            className="hidden"
          />
        ) : null,
      )}

      {products.map((product, i) => {
        const isActive = activeIndex === i;
        const isCollapsed = activeIndex !== null && !isActive;

        return (
          <div key={product.name}>
            {/* Card — full when default/active, pill when collapsed */}
            <motion.div
              layout
              transition={spring}
              onClick={() => handleTap(i)}
              className="cursor-pointer"
            >
              {isCollapsed ? (
                /* ─ Collapsed pill ─ */
                <motion.div
                  layout="position"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-charcoal-dark/50 border border-white/5"
                >
                  <div className="w-8 h-8 rounded-lg bg-cyan-brand/10 flex items-center justify-center flex-shrink-0">
                    <product.icon className="text-cyan-brand" size={16} strokeWidth={1.5} />
                  </div>
                  <span className="font-heading text-sm font-semibold text-gray-400">
                    {product.name}
                  </span>
                  <span className="text-gray-600 text-xs ml-auto">
                    {product.tagline}
                  </span>
                </motion.div>
              ) : (
                /* ─ Default or Active card ─ */
                <MagicCard
                  className="rounded-2xl"
                  gradientColor="rgba(78, 197, 212, 0.15)"
                  gradientFrom="#4EC5D4"
                  gradientTo="#3BA3B0"
                  gradientSize={250}
                  gradientOpacity={0.8}
                >
                  <div className="relative p-6">
                    <BorderBeam
                      size={80}
                      duration={8}
                      colorFrom="#4EC5D4"
                      colorTo="#3BA3B0"
                      borderWidth={1}
                    />

                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-cyan-brand/10 flex items-center justify-center flex-shrink-0">
                        <product.icon className="text-cyan-brand" size={24} strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                          {product.name}
                          {isActive && (
                            <span className="text-gray-600 text-xs font-normal">tap to close</span>
                          )}
                        </h3>
                        <p className="text-cyan-brand/70 text-sm font-medium">
                          {product.tagline}
                        </p>
                      </div>
                    </div>

                    <AnimatePresence mode="wait">
                      {isActive ? (
                        <motion.div
                          key="expanded"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4">
                            <p className="text-gray-300 text-sm leading-relaxed mb-4">
                              {product.brief}
                            </p>
                            <ul className="space-y-2 mb-4">
                              {product.features.map((f) => (
                                <li key={f} className="text-gray-400 text-sm flex items-start gap-2">
                                  <span className="text-cyan-brand mt-0.5">›</span>
                                  {f}
                                </li>
                              ))}
                            </ul>
                            <a
                              href={product.href}
                              target={product.href.startsWith("http") ? "_blank" : undefined}
                              rel={product.href.startsWith("http") ? "noopener noreferrer" : undefined}
                              className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-brand"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {product.cta}
                              <ExternalLink size={14} strokeWidth={2} />
                            </a>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.p
                          key="compact"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="text-gray-400 text-sm leading-relaxed mt-4"
                        >
                          {product.description}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </MagicCard>
              )}
            </motion.div>

            {/* Demo panel — slides below active card */}
            <AnimatePresence>
              {isActive && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={spring}
                  className="overflow-hidden"
                >
                  <div className="mt-3">
                    {product.demoVideo ? (
                      <a
                        href={product.demoHref || "#"}
                        className="block rounded-2xl overflow-hidden border border-white/10 bg-gray-900/80"
                        onClick={(e) => {
                          if (!product.demoHref) e.preventDefault();
                        }}
                      >
                        <video
                          src={product.demoVideo}
                          ref={(el) => {
                            if (el) {
                              el.currentTime = 0;
                              el.play().catch(() => {});
                            }
                          }}
                          muted
                          playsInline
                          loop
                          preload="auto"
                          className="w-full aspect-video object-contain bg-black rounded-2xl"
                        />
                      </a>
                    ) : (
                      <div className="rounded-2xl border border-white/10 bg-gray-900/80 flex flex-col items-center justify-center gap-3 py-10">
                        <div className="w-12 h-12 rounded-full bg-cyan-brand/10 flex items-center justify-center">
                          <PlayCircle className="text-cyan-brand/50" size={24} strokeWidth={1.5} />
                        </div>
                        <p className="text-gray-500 text-sm font-medium">Demo Coming Soon</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Desktop Interactive Layout ─── */
function DesktopProducts() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const handleHover = (index: number) => {
    setHoveredIndex(index);
  };

  const handleLeave = () => {
    videoRefs.current.forEach((v) => v?.pause());
    setHoveredIndex(null);
  };

  // Play/pause videos based on hover
  useEffect(() => {
    products.forEach((product, i) => {
      const video = videoRefs.current[i];
      if (!video) return;
      if (hoveredIndex === i && product.demoVideo) {
        video.currentTime = 0;
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [hoveredIndex]);

  const isHovered = hoveredIndex !== null;

  return (
    <ScrollReveal>
      <div
        className="grid grid-cols-3 gap-6 lg:gap-8 min-h-[380px] relative"
        onMouseLeave={handleLeave}
      >
        {/* Demo panel — z-0, renders BEHIND cards */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              key={hoveredIndex}
              className="absolute top-0 bottom-0 z-0"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={spring}
              style={{
                ...(hoveredIndex === 0 && {
                  left: "calc(33.333% + 12px)",
                  right: "0",
                }),
                ...(hoveredIndex === 1 && {
                  left: "calc(66.666% + 12px)",
                  right: "0",
                }),
                ...(hoveredIndex === 2 && {
                  left: "0",
                  right: "calc(33.333% + 12px)",
                }),
              }}
            >
              {products[hoveredIndex!].demoVideo ? (
                <a
                  href={products[hoveredIndex!].demoHref || "#"}
                  className="block h-full rounded-2xl overflow-hidden border border-white/10 bg-gray-900/80 cursor-pointer hover:border-cyan-brand/30 transition-colors"
                  onClick={(e) => {
                    if (!products[hoveredIndex!].demoHref) e.preventDefault();
                  }}
                >
                  <video
                    src={products[hoveredIndex!].demoVideo!}
                    ref={(el) => {
                      if (el) {
                        el.currentTime = 0;
                        el.play().catch(() => {});
                      }
                    }}
                    muted
                    playsInline
                    loop
                    preload="auto"
                    className="w-full h-full object-contain bg-black rounded-2xl"
                  />
                </a>
              ) : (
                <div className="h-full rounded-2xl overflow-hidden border border-white/10 bg-gray-900/80 flex flex-col items-center justify-center gap-4 p-8">
                  <div className="w-16 h-16 rounded-full bg-cyan-brand/10 flex items-center justify-center">
                    <PlayCircle
                      className="text-cyan-brand/50"
                      size={32}
                      strokeWidth={1.5}
                    />
                  </div>
                  <p className="text-gray-500 text-sm font-medium">Demo Coming Soon</p>
                  <p className="text-gray-600 text-xs max-w-[200px] text-center">
                    A video walkthrough of {products[hoveredIndex!].name} will be
                    available here soon.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Product cards — z-10, always in their grid column */}
        {products.map((product, i) => {
          const isThis = hoveredIndex === i;
          const isOther = isHovered && !isThis;

          return (
            <motion.div
              key={product.name}
              className="relative z-10"
              animate={{ opacity: isOther ? 0 : 1 }}
              transition={spring}
              style={{
                pointerEvents: isOther ? "none" : "auto",
              }}
              onMouseEnter={() => handleHover(i)}
            >
              <a
                href={product.href}
                target={
                  product.href.startsWith("http") ? "_blank" : undefined
                }
                rel={
                  product.href.startsWith("http")
                    ? "noopener noreferrer"
                    : undefined
                }
                className="group cursor-pointer block h-full"
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

                    {/* Content: compact vs expanded */}
                    <AnimatePresence mode="wait">
                      {isThis ? (
                        <motion.div
                          key="expanded"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <p className="text-gray-300 text-sm leading-relaxed mb-4">
                            {product.brief}
                          </p>
                          <ul className="space-y-2 mb-5">
                            {product.features.map((f) => (
                              <li
                                key={f}
                                className="text-gray-400 text-sm flex items-start gap-2"
                              >
                                <span className="text-cyan-brand mt-0.5">
                                  ›
                                </span>
                                {f}
                              </li>
                            ))}
                          </ul>
                          <span className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-brand group-hover:text-white transition-colors">
                            {product.cta}
                            <ExternalLink size={14} strokeWidth={2} />
                          </span>
                        </motion.div>
                      ) : (
                        <motion.p
                          key="compact"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-gray-400 text-sm leading-relaxed"
                        >
                          {product.description}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </MagicCard>
              </a>
            </motion.div>
          );
        })}

        {/* Hidden persistent videos — always buffering */}
        {products.map((product, i) =>
          product.demoVideo ? (
            <video
              key={`video-${i}`}
              ref={(el) => { videoRefs.current[i] = el; }}
              src={product.demoVideo}
              muted
              playsInline
              loop
              preload="auto"
              className="hidden"
            />
          ) : null,
        )}
      </div>
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
        <div className="text-center max-w-3xl mx-auto mb-16">
          <ScrollReveal>
            <span className="inline-block text-cyan-brand text-sm font-semibold tracking-widest uppercase mb-4">
              Dance Software
            </span>
          </ScrollReveal>
          <TextAnimate
            animation="blurInUp"
            by="word"
            as="h2"
            className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6"
          >
            Software Built for Dance
          </TextAnimate>
          <TextAnimate
            animation="fadeIn"
            by="word"
            as="p"
            delay={0.2}
            duration={1.5}
            className="text-lg text-gray-400 leading-relaxed"
          >
            {"Purpose-built tools for the dance industry \u2014 because generic software was never designed for what you do."}
          </TextAnimate>
        </div>

        {/* Mobile: interactive tap-to-expand */}
        <div className="md:hidden">
          <MobileProducts />
        </div>

        {/* Desktop: interactive grid layout */}
        <div className="hidden md:block">
          <DesktopProducts />
        </div>
      </div>

      <div className="section-divider mt-16 sm:mt-20 max-w-4xl mx-auto" />
    </section>
  );
}
