"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

/* Mobile-only sticky primary action, appears once the visitor scrolls past the hero.
   One primary action on the page; this is the same one, kept in reach. */

export default function StickyCTA() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > window.innerHeight * 0.9);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`lg:hidden fixed bottom-0 inset-x-0 z-40 p-3 bg-charcoal-deep/95 backdrop-blur border-t border-white/10 transition-transform duration-300 ${
        show ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <Link
        href="/dancerecital"
        className="flex items-center justify-center gap-2 rounded-xl bg-cyan-brand px-6 py-3.5 font-heading text-base font-semibold text-charcoal-deep"
      >
        See your pricing <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
