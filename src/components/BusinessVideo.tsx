"use client";

import ScrollReveal from "./ScrollReveal";
import VideoCarousel, { type CarouselItem } from "./VideoCarousel";
import {
  Monitor,
  Sparkles,
  Megaphone,
  ClipboardList,
} from "lucide-react";
import { BorderBeam } from "./magicui/border-beam";

const services = [
  {
    icon: Monitor,
    title: "Hybrid Events",
    description:
      "Live + virtual event production. Multi-camera, switched, and streamed beyond the room.",
  },
  {
    icon: Sparkles,
    title: "Social Highlights",
    description:
      "Short, punchy content for social media. Reels, stories, and clips that convert.",
  },
  {
    icon: Megaphone,
    title: "Promotional Content",
    description:
      "Brand videos, product launches, and marketing content with cinematic quality.",
  },
  {
    icon: ClipboardList,
    title: "Planning & Strategy",
    description:
      "Video strategy from concept to delivery. We handle the creative so you focus on your business.",
  },
];

const R2 = "https://pub-626d1637ca4c4f34a7916019aaa3efce.r2.dev";

const portfolioVertical: CarouselItem[] = [
  {
    videoSrc: `${R2}/streamstage/sgc-reel-1.mp4`,
    title: "Strength Meets Style",
    client: "SGC Fitness",
    category: "Social Reel",
  },
  {
    videoSrc: `${R2}/streamstage/sgc-reel-2.mp4`,
    title: "No Limits, All Gains",
    client: "SGC Fitness",
    category: "Social Reel",
  },
  {
    videoSrc: `${R2}/streamstage/embro-reel-1.mp4`,
    title: "Horsepower & Heart",
    client: "Embro Tractor Pull",
    category: "Event Reel",
  },
  {
    videoSrc: `${R2}/streamstage/embro-reel-2.mp4`,
    title: "Dirt, Diesel & Glory",
    client: "Embro Tractor Pull",
    category: "Event Reel",
  },
  {
    videoSrc: `${R2}/streamstage/embro-reel-4.mp4`,
    title: "Full Throttle Friday",
    client: "Embro Tractor Pull",
    category: "Event Reel",
  },
  {
    videoSrc: `${R2}/streamstage/embro-reel-5.mp4`,
    title: "Pull for the Win",
    client: "Embro Tractor Pull",
    category: "Event Reel",
  },
];

const portfolioHorizontal: CarouselItem[] = [
  {
    videoSrc: `${R2}/streamstage/we-are-wellness.mp4`,
    title: "Wellness, Amplified",
    client: "Uvalux",
    category: "Brand",
  },
  {
    videoSrc: `${R2}/streamstage/yfc-banquet-final.mp4`,
    title: "Community Champions",
    client: "YFC Woodstock",
    category: "Event",
  },
  {
    videoSrc: `${R2}/streamstage/csod-1min.mp4`,
    title: "One Minute, One Studio",
    client: "Caledonia Dance",
    category: "Promo",
  },
  {
    videoSrc: `${R2}/streamstage/burger-battle.mp4`,
    title: "Burger Battle Showdown",
    client: "United Way Oxford",
    category: "Event",
  },
  {
    videoSrc: `${R2}/streamstage/local-love.mp4`,
    title: "Local Love Stories",
    client: "United Way Oxford",
    category: "Campaign",
  },
];

export default function BusinessVideo() {
  return (
    <section id="business-video" className="py-16 sm:py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <ScrollReveal>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block text-amber-brand text-sm font-semibold tracking-widest uppercase mb-4">
              Business Video
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
              Full-Stack Video for Your Business
            </h2>
            <p className="text-lg text-gray-400 leading-relaxed">
              Professional video production that drives real results — from
              events to social content.
            </p>
          </div>
        </ScrollReveal>

        {/* Services grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {services.map((service, i) => (
            <ScrollReveal key={service.title} delay={i * 0.1}>
              <div className="group relative p-6 rounded-xl bg-charcoal-dark/50 border border-white/5 hover:border-amber-brand/30 transition-all duration-300 h-full overflow-hidden">
                <BorderBeam
                  size={60}
                  duration={10 + i * 2}
                  delay={i * 1.5}
                  colorFrom="#F59E0B"
                  colorTo="#D97706"
                  borderWidth={1}
                />
                <div className="w-12 h-12 rounded-lg bg-amber-brand/10 flex items-start justify-center mb-4 group-hover:bg-amber-brand/20 transition-colors duration-300">
                  <service.icon
                    className="text-amber-brand"
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
              <VideoCarousel items={portfolioVertical} theme="amber" heading="Reels & Highlights" orientation="vertical" />
            </ScrollReveal>
          </div>

          <div className="overflow-hidden h-full">
            <ScrollReveal delay={0.1} className="h-full">
              <VideoCarousel items={portfolioHorizontal} theme="amber" heading="Client Work" orientation="horizontal" />
            </ScrollReveal>
          </div>
        </div>

      </div>

      <div className="section-divider mt-16 sm:mt-20 max-w-4xl mx-auto" />
    </section>
  );
}
