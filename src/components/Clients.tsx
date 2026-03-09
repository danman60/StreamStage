"use client";

import ScrollReveal from "./ScrollReveal";
import { Marquee } from "./magicui/marquee";

const clients = [
  "EMPWR Dance",
  "Glow Dance Competition",
  "Original Kids Theatre",
  "Nightwood Theatre",
  "Cristini Crossfit",
  "Goat Yoga Toronto",
  "Raw Rock Shop",
  "Uvalux",
  "Cedar Nook Creative",
  "Holt Xchange",
  "Amy Sky",
  "Ultimate Dance Connection",
];

function ClientCard({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-center px-6 py-4 rounded-xl bg-charcoal-dark/30 border border-white/5 hover:border-white/10 transition-colors duration-300 min-w-[160px]">
      <span className="text-gray-400 text-sm font-medium text-center leading-tight whitespace-nowrap">
        {name}
      </span>
    </div>
  );
}

export default function Clients() {
  return (
    <section id="clients" className="py-16 sm:py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <ScrollReveal>
          <div className="text-center mb-12">
            <h2 className="text-gray-500 text-sm font-semibold tracking-widest uppercase">
              Trusted By
            </h2>
          </div>
        </ScrollReveal>

        <div className="relative">
          {/* Fade edges */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-charcoal-deep to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-charcoal-deep to-transparent" />

          <Marquee pauseOnHover duration="30s">
            {clients.map((client) => (
              <ClientCard key={client} name={client} />
            ))}
          </Marquee>
        </div>
      </div>

      <div className="section-divider mt-16 sm:mt-20 max-w-4xl mx-auto" />
    </section>
  );
}
