"use client";

import ScrollReveal from "./ScrollReveal";
import { Marquee } from "./magicui/marquee";
import { Quote } from "lucide-react";

const testimonials = [
  {
    quote:
      "Daniel and StreamStage reinvented the dance competition video model. Multiple camera angles, backstage glimpses, tight close ups, and crisp graphics give teachers, dancers, and parents a high quality twist.",
    name: "Kiri-Lyn Muir",
    role: "Director, Ultimate Dance Connection",
  },
  {
    quote:
      "Working with Kayla and Dan was a dream. Their artistic eyes capture the creative nuances and performance that audience members would receive if they were seeing the show live. Hands down the best experience we've ever had with a videographer.",
    name: "Christina Canella",
    role: "Founder, Artistic Movement Dance Studio",
  },
  {
    quote:
      "Working with Stream Stage was a very enjoyable experience. They are great communicators, highly skilled at audio and video production, and deliver on deadline.",
    name: "Amy Sky",
    role: "Juno-nominated Singer-Songwriter & Performer",
  },
  {
    quote:
      "Daniel and the team have been remarkable collaborators, hence us going back to them again and again. Warmth, genuine enthusiasm and a spirit of innovation paired with top notch professionalism.",
    name: "Andrea Donaldson",
    role: "Artistic Director, Nightwood Theatre",
  },
  {
    quote:
      "StreamStage captured our show beautifully. They were prepared, organized, and had a keen eye and attention to detail! Our families will treasure it for years to come.",
    name: "Andrew Tribe",
    role: "Artistic Director, Original Kids Theatre Company",
  },
  {
    quote:
      "Dan and Kayla are an amazing team! Everything was planned out, and they took all of the stress off. The final product is absolutely gorgeous. Husband and wife team for the win!",
    name: "Sarah Higgins",
    role: "Founder, Cedar Nook",
  },
  {
    quote:
      "Stream Stage has been an anchor collaborator for Holt XChange. End-to-end services with skill and passion for live broadcasting combined with unique artistic creativity that has elevated our show well beyond other events.",
    name: "Jan Arp",
    role: "Founding Managing Partner, Holt Xchange",
  },
  {
    quote:
      "If you ever need an amazing livestream with awesome sound, great angles, and a pro who knows how to pull it all together, get Stream Stage. They've got the tools, they've got the talent!",
    name: "Donovan Lenabat",
    role: "Choir Director, Alt Vox Rock Choir",
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
