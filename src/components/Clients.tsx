"use client";

import ScrollReveal from "./ScrollReveal";

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

export default function Clients() {
  return (
    <section id="clients" className="py-24 sm:py-32 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <ScrollReveal>
          <div className="text-center mb-12">
            <h2 className="text-gray-500 text-sm font-semibold tracking-widest uppercase">
              Trusted By
            </h2>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {clients.map((client, i) => (
            <ScrollReveal key={client} delay={i * 0.03}>
              <div className="flex items-center justify-center p-4 sm:p-6 rounded-xl bg-charcoal-dark/30 border border-white/5 hover:border-white/10 transition-colors duration-300 h-20">
                {/* Logo placeholder — white text for now, will be replaced with actual logos */}
                <span className="text-gray-500 text-xs sm:text-sm font-medium text-center leading-tight">
                  {client}
                </span>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>

      <div className="section-divider mt-24 sm:mt-32 max-w-4xl mx-auto" />
    </section>
  );
}
