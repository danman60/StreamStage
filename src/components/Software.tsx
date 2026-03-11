"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ScrollReveal from "./ScrollReveal";
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

/* ─── Mobile Card (unchanged behavior) ─── */
function MobileProductCard({
  product,
  index,
}: {
  product: Product;
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
            <div className="w-14 h-14 rounded-xl bg-cyan-brand/10 flex items-center justify-center mb-6 group-hover:bg-cyan-brand/20 transition-colors duration-300">
              <product.icon
                className="text-cyan-brand"
                size={28}
                strokeWidth={1.5}
              />
            </div>
            <h3 className="font-heading text-xl font-bold text-white mb-1 flex items-center gap-2">
              {product.name}
              <ExternalLink
                className="text-gray-600 group-hover:text-cyan-brand transition-colors duration-200"
                size={16}
                strokeWidth={1.5}
              />
            </h3>
            <p className="text-cyan-brand/70 text-sm font-medium mb-4">
              {product.tagline}
            </p>
            <p
              className={`text-gray-400 text-sm leading-relaxed ${product.demoVideo ? "group-hover:opacity-0 transition-opacity duration-300" : ""}`}
            >
              {product.description}
            </p>
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

/* ─── Demo Panel ─── */
function DemoPanel({
  product,
  direction,
  videoRef,
}: {
  product: Product;
  direction: "left" | "right";
  videoRef: React.RefObject<HTMLVideoElement | null>;
}) {
  const slideFrom = direction === "right" ? 60 : -60;

  return (
    <motion.div
      initial={{ opacity: 0, x: slideFrom }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: slideFrom }}
      transition={spring}
      className="h-full"
    >
      {product.demoVideo ? (
        <a
          href={product.demoHref || "#"}
          className="block h-full rounded-2xl overflow-hidden border border-white/10 bg-gray-900/80 cursor-pointer hover:border-cyan-brand/30 transition-colors"
          onClick={(e) => {
            if (!product.demoHref) e.preventDefault();
          }}
        >
          <video
            ref={videoRef}
            src={product.demoVideo}
            muted
            playsInline
            loop
            preload="metadata"
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
            A video walkthrough of {product.name} will be available here soon.
          </p>
        </div>
      )}
    </motion.div>
  );
}

/* ─── Desktop Interactive Layout ─── */
function DesktopProducts() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleHover = (index: number) => {
    setHoveredIndex(index);
  };

  const handleLeave = () => {
    if (videoRef.current) videoRef.current.pause();
    setHoveredIndex(null);
  };

  // Autoplay video when panel appears
  useEffect(() => {
    if (hoveredIndex !== null && products[hoveredIndex].demoVideo) {
      // Small delay to let the ref attach
      const t = setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          videoRef.current.play().catch(() => {});
        }
      }, 50);
      return () => clearTimeout(t);
    }
  }, [hoveredIndex]);

  const isHovered = hoveredIndex !== null;

  // Panel placement: left card → cols 2-3, center → col 3, right → cols 1-2
  // Direction panel slides from
  const panelDirection =
    hoveredIndex === 2 ? "left" : ("right" as "left" | "right");

  return (
    <ScrollReveal>
      <div
        className="grid grid-cols-3 gap-6 lg:gap-8 min-h-[380px] relative"
        onMouseLeave={handleLeave}
      >
        {/* Product cards — always in their grid column */}
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

        {/* Demo panel — positioned absolutely over the empty card columns */}
        <AnimatePresence>
          {isHovered && (
            <div
              className="absolute top-0 bottom-0 z-20"
              style={{
                // Left card (0): panel in cols 2-3
                // Center card (1): panel in col 3
                // Right card (2): panel in cols 1-2
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
              <DemoPanel
                key={hoveredIndex}
                product={products[hoveredIndex!]}
                direction={panelDirection}
                videoRef={videoRef}
              />
            </div>
          )}
        </AnimatePresence>
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

        {/* Mobile: stacked cards (unchanged) */}
        <div className="grid gap-6 md:hidden">
          {products.map((product, i) => (
            <MobileProductCard
              key={product.name}
              product={product}
              index={i}
            />
          ))}
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
