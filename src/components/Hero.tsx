"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";

export default function Hero() {
  const shouldReduceMotion = useReducedMotion();

  const handleScroll = (href: string) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-charcoal-deep" />
        {!shouldReduceMotion ? (
          <>
            <motion.div
              className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-cyan-brand/8 blur-[120px]"
              animate={{
                x: [0, 50, 0],
                y: [0, -30, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 12,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="absolute bottom-1/4 -right-1/4 w-[500px] h-[500px] rounded-full bg-cyan-brand/5 blur-[100px]"
              animate={{
                x: [0, -40, 0],
                y: [0, 40, 0],
                scale: [1, 1.15, 1],
              }}
              transition={{
                duration: 15,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </>
        ) : (
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-cyan-brand/8 blur-[120px]" />
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
        <motion.h1
          className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6"
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Where Dance Meets{" "}
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
          <a
            href="#dance-media"
            onClick={(e) => {
              e.preventDefault();
              handleScroll("#dance-media");
            }}
            className="cursor-pointer px-8 py-3.5 bg-cyan-brand text-charcoal-deep font-heading font-semibold text-base rounded-lg hover:bg-cyan-brand/90 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-brand/20"
          >
            Our Work
          </a>
          <a
            href="#software"
            onClick={(e) => {
              e.preventDefault();
              handleScroll("#software");
            }}
            className="cursor-pointer px-8 py-3.5 border border-cyan-brand/40 text-cyan-brand font-heading font-semibold text-base rounded-lg hover:bg-cyan-brand/10 hover:border-cyan-brand/60 transition-all duration-200"
          >
            Our Software
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
