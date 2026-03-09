"use client";

import ScrollReveal from "./ScrollReveal";
import { Marquee } from "./magicui/marquee";
import { Quote } from "lucide-react";

const testimonials = [
  {
    quote:
      "StreamStage captured the magic of our show in a way that truly honored the performers and the music.",
    name: "Amy Sky",
    role: "Juno-nominated Singer-Songwriter & Performer",
  },
  {
    quote:
      "Daniel and the team at Stream Stage have been remarkable collaborators, hence us going back to them again and again.",
    name: "Andrea Donaldson",
    role: "Artistic Director, Nightwood Theatre (Toronto)",
  },
  {
    quote:
      "Our families love being able to watch the performances live. The quality is outstanding every time.",
    name: "Andrew Tribe",
    role: "Director, Original Kids Theatre Company (London, ON)",
  },
  {
    quote:
      "Wow, just amazing! We had our wedding last fall and with the help of Stream Stage, our families from overseas were able to celebrate it with us.",
    name: "Alexis C.",
    role: "Happy Bride",
  },
  {
    quote:
      "StreamStage understood our brand instantly and delivered video content that exceeded our expectations.",
    name: "Sarah Higgins",
    role: "Founder, Cedar Nook Creative",
  },
  {
    quote:
      "They made the whole process seamless. From planning through final delivery, everything was professional and on time.",
    name: "Jan Arp",
    role: "Director, Holt Xchange",
  },
];

function TestimonialCard({
  quote,
  name,
  role,
}: {
  quote: string;
  name: string;
  role: string;
}) {
  return (
    <figure className="w-[320px] sm:w-[380px] shrink-0 p-6 rounded-xl bg-charcoal-dark/30 border border-white/5">
      <Quote
        className="text-cyan-brand/30 mb-3"
        size={20}
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <blockquote className="text-gray-300 text-sm leading-relaxed mb-4 italic">
        &ldquo;{quote}&rdquo;
      </blockquote>
      <figcaption>
        <cite className="not-italic">
          <span className="text-white text-sm font-medium block">{name}</span>
          <span className="text-gray-500 text-xs">{role}</span>
        </cite>
      </figcaption>
    </figure>
  );
}

export default function Testimonials() {
  return (
    <section className="py-16 sm:py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <ScrollReveal>
          <div className="text-center mb-10">
            <h2 className="text-gray-500 text-sm font-semibold tracking-widest uppercase">
              What People Say
            </h2>
          </div>
        </ScrollReveal>

        <div className="relative">
          {/* Fade edges */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-charcoal-deep to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-charcoal-deep to-transparent" />

          <Marquee pauseOnHover duration="45s">
            {testimonials.map((t) => (
              <TestimonialCard
                key={t.name}
                quote={t.quote}
                name={t.name}
                role={t.role}
              />
            ))}
          </Marquee>
        </div>
      </div>
    </section>
  );
}
