"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { ShimmerButton } from "./magicui/shimmer-button";
import { TextAnimate } from "./magicui/text-animate";

export default function Hero() {
  const shouldReduceMotion = useReducedMotion();

  const handleScroll = (href: string) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
        {/* Heading — word-by-word blur-in-up */}
        <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
          {shouldReduceMotion ? (
            <>
              Where Stage Meets{" "}
              <span className="text-gradient-cyan">Technology</span>
            </>
          ) : (
            <>
              <TextAnimate
                animation="blurInUp"
                by="word"
                as="span"
                startOnView={false}
                delay={0.2}
                duration={0.8}
                className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]"
              >
                Where Stage Meets
              </TextAnimate>{" "}
              <TextAnimate
                animation="blurInUp"
                by="character"
                as="span"
                startOnView={false}
                delay={0.7}
                duration={1.0}
                className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] text-gradient-cyan"
              >
                Technology
              </TextAnimate>
            </>
          )}
        </h1>

        {/* Subtitle — word-by-word fade in */}
        {shouldReduceMotion ? (
          <p className="text-lg sm:text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            Canada&apos;s dance industry partner &mdash; media production,
            software, and live broadcast
          </p>
        ) : (
          <TextAnimate
            animation="fadeIn"
            by="word"
            as="p"
            startOnView={false}
            delay={1.0}
            duration={1.2}
            className="text-lg sm:text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed"
          >
            {"Canada\u2019s dance industry partner \u2014 media production, software, and live broadcast"}
          </TextAnimate>
        )}

        {/* CTA buttons — slide up */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.6 }}
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
