"use client";

import ScrollReveal from "./ScrollReveal";
import VideoCarousel, { type CarouselItem } from "./VideoCarousel";
import { Radio, Film, Share2, Video } from "lucide-react";
import { BorderBeam } from "./magicui/border-beam";

const services = [
  {
    icon: Radio,
    title: "Livestreaming",
    description:
      "Multi-camera live broadcast for competitions, recitals, and showcases. Your audience watches from anywhere.",
  },
  {
    icon: Video,
    title: "Videography & Editing",
    description:
      "Full video production from capture to final cut. Highlight reels, archives, and promo content.",
  },
  {
    icon: Film,
    title: "Promotional Videos",
    description:
      "Cinematic promos that capture the energy of your studio, company, or production.",
  },
  {
    icon: Share2,
    title: "Social Content",
    description:
      "Short-form content for Instagram, TikTok, and YouTube. Built to drive engagement and enrollment.",
  },
];

const R2 = "https://pub-626d1637ca4c4f34a7916019aaa3efce.r2.dev";

const portfolioVertical: CarouselItem[] = [
  {
    videoSrc: `${R2}/streamstage/udc-burl-hilite.mp4`,
    title: "Burlington Brings the Heat",
    client: "UDC",
    category: "Competition Highlight",
  },
  {
    videoSrc: `${R2}/streamstage/udc-london-hilite.mp4`,
    title: "London Steals the Show",
    client: "UDC",
    category: "Competition Highlight",
  },
  {
    videoSrc: `${R2}/streamstage/jj-lhl-hilite.mp4`,
    title: "Light Heavy Light Highlights",
    client: "JJ Dance Arts",
    category: "Show Highlight",
  },
  {
    videoSrc: `${R2}/streamstage/udc-promo26-portrait.mp4`,
    title: "Season 26 Is Coming",
    client: "UDC",
    category: "Promo",
  },
  {
    videoSrc: `${R2}/streamstage/generations-hilite.mp4`,
    title: "Every Generation, Every Beat",
    client: "Generations",
    category: "Recital Highlight",
  },
  {
    videoSrc: `${R2}/streamstage/hsm-final.mp4`,
    title: "High School Musical Live!",
    client: "Paul Penna",
    category: "Show Highlight",
  },
  {
    videoSrc: `${R2}/streamstage/shuffle-hilite.mp4`,
    title: "Shuffle Into the Spotlight",
    client: "Shuffle Dance",
    category: "Recital Highlight",
  },
  {
    videoSrc: `${R2}/streamstage/revolutions-dance.mp4`,
    title: "Revolutions in Motion",
    client: "Revolutions Dance",
    category: "Recital Highlight",
  },
  {
    videoSrc: `${R2}/streamstage/lds-hilite.mp4`,
    title: "Lindsay Lights Up the Stage",
    client: "Lindsay Dance Studio",
    category: "Recital Highlight",
  },
  {
    videoSrc: `${R2}/streamstage/lds-show-ab.mp4`,
    title: "Double Feature, Double Energy",
    client: "Lindsay Dance Studio",
    category: "Recital Highlight",
  },
  {
    videoSrc: `${R2}/streamstage/jj-showcase-hilite.mp4`,
    title: "Showcase Showstopper",
    client: "JJ Dance Arts",
    category: "Showcase Highlight",
  },
];

const portfolioHorizontal: CarouselItem[] = [
  {
    videoSrc: `${R2}/streamstage/udc-synergy.mp4`,
    title: "Synergy in Motion",
    client: "UDC",
    category: "Showcase",
  },
  {
    videoSrc: `${R2}/streamstage/udc-promo26-landscape.mp4`,
    title: "Season 26 — The Hype Reel",
    client: "UDC",
    category: "Promo",
  },
  {
    videoSrc: `${R2}/streamstage/bruno-epk.mp4`,
    title: "Bruno: Behind the Curtain",
    client: "Bruno",
    category: "EPK",
  },
  {
    videoSrc: `${R2}/streamstage/jcs-tw-final.mp4`,
    title: "Jesus Christ Superstar",
    client: "Theatre Woodstock",
    category: "Show Film",
  },
  {
    videoSrc: `${R2}/streamstage/jcs-trailer.mp4`,
    title: "Superstar — The Trailer",
    client: "Theatre Woodstock",
    category: "Trailer",
  },
  {
    videoSrc: `${R2}/streamstage/dolly-promo.mp4`,
    title: "Backwoods Barbie Takes the Stage",
    client: "Backwoods Barbie",
    category: "Promo",
  },
  {
    videoSrc: `${R2}/streamstage/cdte25-promo.mp4`,
    title: "High-Energy Moves, One Stage",
    client: "Dance Attack",
    category: "Promo",
  },
  {
    videoSrc: `${R2}/streamstage/wsdy-4k.mp4`,
    title: "Where Stars Dance Young",
    client: "WSDY",
    category: "Showcase",
  },
  {
    videoSrc: `${R2}/streamstage/hfn-2025.mp4`,
    title: "Hope for Nicole 2025",
    client: "HFN",
    category: "Event Film",
  },
];

export default function DanceMedia() {
  return (
    <section id="dance-media" className="py-16 sm:py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <ScrollReveal>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block text-cyan-brand text-sm font-semibold tracking-widest uppercase mb-4">
              Dance & Stage Media
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
              Your Performance, Elevated
            </h2>
            <p className="text-lg text-gray-400 leading-relaxed">
              From multi-camera livestreams to cinematic highlight reels, we
              bring the stage to every screen.
            </p>
          </div>
        </ScrollReveal>

        {/* Services grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {services.map((service, i) => (
            <ScrollReveal key={service.title} delay={i * 0.1}>
              <div className="group relative p-6 rounded-xl bg-charcoal-dark/50 border border-white/5 hover:border-cyan-brand/30 transition-all duration-300 h-full overflow-hidden">
                <BorderBeam
                  size={60}
                  duration={10 + i * 2}
                  delay={i * 1.5}
                  colorFrom="#4EC5D4"
                  colorTo="#3BA3B0"
                  borderWidth={1}
                />
                <div className="w-12 h-12 rounded-lg bg-cyan-brand/10 flex items-start justify-center mb-4 group-hover:bg-cyan-brand/20 transition-colors duration-300">
                  <service.icon
                    className="text-cyan-brand"
                    size={24}
                    strokeWidth={1.5}
                  />
                </div>
                <h3 className="font-heading text-lg font-semibold text-white mb-2">
                  {service.title}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {service.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Portfolio carousels — side by side on desktop */}
        <div className="grid lg:grid-cols-[2fr_3fr] gap-6 lg:gap-10">
          <div className="overflow-hidden h-full">
            <ScrollReveal className="h-full">
              <VideoCarousel items={portfolioVertical} theme="cyan" heading="Reels & Highlights" orientation="vertical" />
            </ScrollReveal>
          </div>

          <div className="overflow-hidden h-full">
            <ScrollReveal delay={0.1} className="h-full">
              <VideoCarousel items={portfolioHorizontal} theme="cyan" heading="Promos & Showcases" orientation="horizontal" />
            </ScrollReveal>
          </div>
        </div>

      </div>

      <div className="section-divider mt-16 sm:mt-20 max-w-4xl mx-auto" />
    </section>
  );
}
