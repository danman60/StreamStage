"use client";

import ScrollReveal from "./ScrollReveal";
import { MapPin, User } from "lucide-react";

const team = [
  {
    name: "Daniel Abrahamson",
    role: "Founder & Creative Director",
    bio: "Bridging technology and the performing arts for over a decade.",
  },
  {
    name: "Team Member",
    role: "Production Lead",
    bio: "Multi-camera specialist with deep roots in the dance community.",
  },
  {
    name: "Team Member",
    role: "Software Developer",
    bio: "Building purpose-built tools for the dance industry.",
  },
];

export default function Team() {
  return (
    <section id="team" className="py-24 sm:py-32 relative">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <ScrollReveal>
          <div className="text-center max-w-3xl mx-auto mb-4">
            <span className="inline-block text-cyan-brand text-sm font-semibold tracking-widest uppercase mb-4">
              Our Team
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-6">
              Canadian-Based. Dance-Focused.
            </h2>
            <div className="flex items-center justify-center gap-2 text-gray-400 mb-12">
              <MapPin size={16} strokeWidth={1.5} />
              <span className="text-sm">Based in Ontario, Canada</span>
            </div>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {team.map((member, i) => (
            <ScrollReveal key={i} delay={i * 0.1}>
              <div className="text-center p-6 rounded-xl bg-charcoal-dark/50 border border-white/5 hover:border-cyan-brand/20 transition-colors duration-300">
                {/* Photo placeholder */}
                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-charcoal-mid border border-white/10 flex items-center justify-center">
                  <User
                    className="text-gray-600"
                    size={36}
                    strokeWidth={1.5}
                  />
                </div>
                <h3 className="font-heading text-lg font-semibold text-white mb-1">
                  {member.name}
                </h3>
                <p className="text-cyan-brand text-sm font-medium mb-3">
                  {member.role}
                </p>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {member.bio}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>

      <div className="section-divider mt-24 sm:mt-32 max-w-4xl mx-auto" />
    </section>
  );
}
