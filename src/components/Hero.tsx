"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { ShimmerButton } from "./magicui/shimmer-button";

export default function Hero() {
  const shouldReduceMotion = useReducedMotion();

  const handleScroll = (href: string) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Transparent — video shows through from layout */}

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
        <motion.h1
          className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6"
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Where Stage Meets{" "}
          <span className="text-gradient-cyan">Technology</span>
        </motion.h1>

        <motion.p
          className="text-lg sm:text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed"
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          Canada&apos;s dance industry partner &mdash; media production,
          software, and live broadcast
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <ShimmerButton
            shimmerColor="#4EC5D4"
            shimmerSize="0.05em"
            shimmerDuration="3s"
            borderRadius="0.5rem"
            background="rgba(78, 197, 212, 1)"
            className="font-heading font-semibold text-base text-charcoal-deep px-8 py-3.5"
            onClick={() => handleScroll("#dance-media")}
          >
            View Portfolio
          </ShimmerButton>
          <a
            href="#software"
            onClick={(e) => {
              e.preventDefault();
              handleScroll("#software");
            }}
            className="cursor-pointer px-8 py-3.5 border border-cyan-brand/40 text-cyan-brand font-heading font-semibold text-base rounded-lg hover:bg-cyan-brand/10 hover:border-cyan-brand/60 transition-all duration-200"
          >
            Explore Tools
          </a>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.button
        onClick={() => handleScroll("#about")}
        className="cursor-pointer absolute bottom-8 left-1/2 -translate-x-1/2 text-gray-500 hover:text-cyan-brand transition-colors duration-200"
        aria-label="Scroll down"
        animate={shouldReduceMotion ? {} : { y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <ChevronDown size={28} />
      </motion.button>
    </section>
  );
}
