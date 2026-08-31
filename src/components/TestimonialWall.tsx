"use client";

import { useRef, useState } from "react";
import ScrollReveal from "./ScrollReveal";
import { Marquee } from "./magicui/marquee";
import { Quote, Volume2, VolumeX } from "lucide-react";

/* Director + client quotes. Sources: 2026 kiosk testimonial film (word-level
   transcript), 2026-08-31 Zoom testimonial interview (7 Attitudes), and the
   long-standing site testimonials. One voice per card — never composite. */

export interface WallQuote {
  quote: string;
  name: string;
  title: string;
  featured?: boolean; // short punchy quotes get the big-type treatment
  clip?: string; // 9:16 clip of the director saying this exact quote
}

const QUOTES: WallQuote[] = [
  {
    quote:
      "The service with Daniel is amazing. I don't have to worry about anything, Daniel takes care of it all. The quality is fantastic. You're not only getting the full stage, he sets up different cameras at different angles.",
    name: "Nicole",
    title: "Stagecoach Canada",
  },
  {
    quote: "Take the leap. You won't be disappointed, and you'll be a repeat customer for sure.",
    name: "Nicole",
    title: "Stagecoach Canada",
    clip: "/testimonials/nicole.mp4",
    featured: true,
  },
  {
    quote:
      "I really felt that you had it all handled and taken care of. There's so much going on on recital day, and that was one thing I didn't even have to think about.",
    name: "Mandy",
    title: "Ancaster Dance Arts",
    clip: "/testimonials/mandy.mp4",
  },
  {
    quote: "The turnaround was amazing. I couldn't believe it.",
    name: "Mandy",
    title: "Ancaster Dance Arts",
    featured: true,
  },
  {
    quote:
      "The one-minute promo video you made was absolutely perfect. It captured everything, it had the parents' testimony in the background. Everybody was so happy when they saw that come out. It just elevated our brand so much.",
    name: "Tiffany",
    title: "Caledonia School of Dance",
    clip: "/testimonials/tiffany.mp4",
  },
  {
    quote:
      "Having the raw footage too was absolutely worth it. I look at that probably once a week just to say, what can I pull out today and post. It was very, very valuable.",
    name: "Tiffany",
    title: "Caledonia School of Dance",
  },
  {
    quote: "It was seamless. It was fun.",
    name: "Tiffany",
    title: "Caledonia School of Dance",
    featured: true,
  },
  {
    quote:
      "The speed in which the material was returned, the digital link, how easy it is to just click the link and then your options are there.",
    name: "Alana Colver",
    title: "Lindsay Dance School",
    clip: "/testimonials/alana.mp4",
  },
  {
    quote:
      "On the day of our recital, Daniel showed up, and I asked him if he had anything he needed from me. He said, nope. And just went right to work.",
    name: "Alana Colver",
    title: "Lindsay Dance School",
  },
  {
    quote:
      "Going with a professional video company just streamlines the whole experience. From start to finish, every aspect of it is taken care of. You realize it's totally worth the time, the effort, and the money.",
    name: "Alana Colver",
    title: "Lindsay Dance School",
  },
  {
    quote:
      "One of our dance moms, probably five minutes later, messaged me saying: this video is awesome. She saw the difference immediately. Your footage is just phenomenal. They're going to look back when they're 40, 50 years old and go, look at me.",
    name: "Kerry Moore",
    title: "Kerry Moore School of Dance",
    clip: "/testimonials/kerry.mp4",
  },
  {
    quote: "I've never seen our show look so good.",
    name: "Kerry Moore",
    title: "Kerry Moore School of Dance",
    featured: true,
  },
  {
    quote:
      "It's all branded for my studio and it looks beautiful, and he sets it all up. Selling the digital merchandise is so easy and problem-free for a studio director. I would highly recommend that.",
    name: "Laura Ramsey",
    title: "Grand River Academy of Dance",
    clip: "/testimonials/laura.mp4",
  },
  {
    quote:
      "He's very kind and caring, and you can tell that he genuinely cares about the success of your event and your business.",
    name: "Laura Ramsey",
    title: "Grand River Academy of Dance",
  },
  {
    quote:
      "If you go into business with Daniel for your events, I assure you, you are getting a person with integrity who will respect your business and deliver the best possible package. You absolutely would not be disappointed.",
    name: "Laura Ramsey",
    title: "Grand River Academy of Dance",
  },
  {
    quote:
      "With StreamStage, I don't have to do anything. They send me a link, I send it to my customers, and that's it. I don't have to follow up, I don't have to put pictures in myself, I don't have to edit the video.",
    name: "Tiffany Caron",
    title: "7 Attitudes",
  },
  {
    quote:
      "The portal was definitely a hit this year. The background matched our under-the-water theme, purple to match our studio colors. It wasn't even something we asked for — StreamStage did it on their own.",
    name: "Tiffany Caron",
    title: "7 Attitudes",
  },
  {
    quote:
      "Anytime I email, they answer right away. When I say I've got a show running, I've got a link right away. I provide deadlines and it's always before the deadlines. You're going to be in good hands — all that worry you have, it's going to be gone.",
    name: "Tiffany Caron",
    title: "7 Attitudes",
  },
  {
    quote:
      "Daniel and StreamStage reinvented the dance competition video model. Multiple camera angles, backstage glimpses, tight close ups, and crisp graphics give teachers, dancers, and parents a high quality twist.",
    name: "Kiri-Lyn Muir",
    title: "Ultimate Dance Connection",
  },
  {
    quote:
      "Working with Kayla and Dan was a dream. Their artistic eyes capture the creative nuances and performance that audience members would receive if they were seeing the show live. Hands down the best experience we've ever had with a videographer.",
    name: "Christina Canella",
    title: "Artistic Movement Dance Studio",
  },
  {
    quote:
      "Both Dan and Kayla are knowledgeable about the dance world and were easy to work with when creating our vision. The content showcased our brand and studio values incredibly well.",
    name: "Lainy Zimmer",
    title: "Footprints Dance Centre",
  },
  {
    quote: "So it's so valuable to have someone come and do it for you.",
    name: "Tiffany",
    title: "Caledonia School of Dance",
    featured: true,
  },
];

function ClipPlayer({ src, name }: { src: string; name: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  return (
    <button
      type="button"
      onClick={() => {
        const v = ref.current;
        if (!v) return;
        const next = !muted;
        setMuted(next);
        v.muted = next;
        if (!next) {
          v.currentTime = 0;
          v.play();
        }
      }}
      className="relative shrink-0 w-[130px] self-stretch rounded-lg overflow-hidden bg-black/40 border border-white/10 group/clip cursor-pointer"
      aria-label={`Play ${name}'s testimonial with sound`}
    >
      <video
        ref={ref}
        src={src}
        muted
        loop
        autoPlay
        playsInline
        preload="metadata"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/60 p-1.5 text-white/80 group-hover/clip:text-cyan-brand transition-colors">
        {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
      </span>
    </button>
  );
}

function WallCard({ q }: { q: WallQuote }) {
  const width = q.clip
    ? q.featured
      ? "w-[400px] sm:w-[430px]"
      : "w-[460px] sm:w-[520px]"
    : q.featured
      ? "w-[280px] sm:w-[300px]"
      : "w-[340px] sm:w-[400px]";
  return (
    <figure
      className={`shrink-0 p-5 rounded-xl bg-charcoal-dark/60 border border-white/5 flex gap-4 transition-colors hover:border-cyan-brand/20 ${width}`}
    >
      {q.clip && <ClipPlayer src={q.clip} name={q.name} />}
      <div className="flex flex-col justify-between flex-1 min-w-0">
        <div>
          <Quote size={18} className="text-cyan-brand/30 mb-3" aria-hidden="true" />
          <blockquote
            className={`text-gray-300 leading-relaxed italic ${
              q.featured ? "font-heading text-lg text-white not-italic font-semibold" : "text-sm"
            }`}
          >
            &ldquo;{q.quote}&rdquo;
          </blockquote>
        </div>
        <figcaption className="mt-4 pt-3 border-t border-white/5">
          <cite className="not-italic">
            <span className="font-heading font-semibold text-cyan-brand text-sm block">
              {q.name}
            </span>
            <span className="text-gray-500 text-xs">{q.title}</span>
          </cite>
        </figcaption>
      </div>
    </figure>
  );
}

export default function TestimonialWall({
  heading = "What Studio Directors Say",
  subheading = "Real quotes from the directors we work with, in their own words.",
}: {
  heading?: string;
  subheading?: string;
}) {
  const mid = Math.ceil(QUOTES.length / 2);
  const rowA = QUOTES.slice(0, mid);
  const rowB = QUOTES.slice(mid);

  return (
    <section className="relative left-1/2 -translate-x-1/2 w-screen py-4">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <ScrollReveal>
          <h2 className="font-heading text-2xl font-semibold text-white mb-2">
            {heading}
          </h2>
          <p className="text-base text-gray-500 mb-8">{subheading}</p>
        </ScrollReveal>
      </div>

      <div className="relative space-y-4">
        {/* Fade edges */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 sm:w-32 z-10 bg-gradient-to-r from-charcoal-deep to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 sm:w-32 z-10 bg-gradient-to-l from-charcoal-deep to-transparent" />

        <Marquee pauseOnHover duration="80s" className="[--gap:1rem] items-stretch">
          {rowA.map((q, i) => (
            <WallCard key={`a-${i}`} q={q} />
          ))}
        </Marquee>
        <Marquee pauseOnHover reverse duration="70s" className="[--gap:1rem] items-stretch">
          {rowB.map((q, i) => (
            <WallCard key={`b-${i}`} q={q} />
          ))}
        </Marquee>
      </div>
    </section>
  );
}
