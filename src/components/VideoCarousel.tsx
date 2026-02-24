"use client";

import { motion, useReducedMotion, animate, useMotionValue } from "framer-motion";
import { Video, ChevronLeft, ChevronRight } from "lucide-react";
import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type KeyboardEvent,
} from "react";

export interface CarouselItem {
  videoSrc?: string;
  posterSrc?: string;
  title: string;
  client?: string;
  category: string;
  description?: string;
}

interface VideoCarouselProps {
  items: CarouselItem[];
  theme: "cyan" | "amber";
  heading?: string;
}

const themeColors = {
  cyan: {
    accent: "text-cyan-brand",
    dot: "bg-cyan-brand",
    dotInactive: "bg-cyan-brand/20",
    arrow: "text-cyan-brand hover:bg-cyan-brand/10",
  },
  amber: {
    accent: "text-amber-brand",
    dot: "bg-amber-brand",
    dotInactive: "bg-amber-brand/20",
    arrow: "text-amber-brand hover:bg-amber-brand/10",
  },
};

// Whip spring — snappy with overshoot
const SPRING = { stiffness: 300, damping: 22, mass: 0.8 };

export default function VideoCarousel({
  items,
  theme,
  heading,
}: VideoCarouselProps) {
  const reducedMotion = useReducedMotion();
  const colors = themeColors[theme];
  const count = items.length;

  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [radius, setRadius] = useState(0);
  const [cardW, setCardW] = useState(0);

  // Animated rotation angle of the drum
  const drumAngle = useMotionValue(0);

  // Angle between each card on the cylinder
  const sliceAngle = 360 / count;

  // Calculate cylinder radius from card width so cards don't overlap too much
  const measure = useCallback(() => {
    if (!containerRef.current) return;
    const containerW = containerRef.current.offsetWidth;
    // Smaller cards — ~30% of container so more of the cylinder is visible
    const cw = containerW * 0.30;
    setCardW(cw);
    // Tighter radius — cards closer together, more visible around the drum
    const r = Math.max((count * (cw + 20)) / (2 * Math.PI), cw * 0.8);
    setRadius(r);
    return r;
  }, [count]);

  // Snap drum to show given index at front
  const snapTo = useCallback(
    (index: number) => {
      // Wrap-around: allow infinite rotation
      const clamped = ((index % count) + count) % count;
      setActiveIndex(clamped);
      const target = -(clamped * sliceAngle);
      // Find shortest rotation path
      const current = drumAngle.get();
      const diff = target - (current % 360);
      const shortDiff =
        ((diff % 360) + 540) % 360 - 180; // shortest path
      const finalTarget = current + shortDiff;

      if (reducedMotion) {
        drumAngle.set(finalTarget);
      } else {
        animate(drumAngle, finalTarget, SPRING);
      }
    },
    [count, sliceAngle, drumAngle, reducedMotion],
  );

  // Measure on mount + resize
  useEffect(() => {
    measure();
    drumAngle.set(0);

    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => measure());
    ro.observe(container);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swipe detection
  const dragStartX = useRef(0);
  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX;
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    const dx = e.clientX - dragStartX.current;
    if (Math.abs(dx) > 50) {
      snapTo(activeIndex + (dx < 0 ? 1 : -1));
    }
  };

  // Keyboard nav
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      snapTo(activeIndex + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      snapTo(activeIndex - 1);
    }
  };

  return (
    <div className="mb-20">
      {heading && (
        <h3 className="font-heading text-2xl font-bold text-white text-center mb-12 relative z-10">
          {heading}
        </h3>
      )}

      <div
        ref={containerRef}
        role="region"
        aria-roledescription="carousel"
        aria-label={heading || "Video carousel"}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        className="relative outline-none focus-visible:ring-2 focus-visible:ring-white/20 rounded-xl touch-pan-y"
        style={{ perspective: 1200 }}
      >
        {/* The 3D drum — all cards sit on this rotating cylinder */}
        <motion.div
          className="relative mx-auto"
          style={{
            width: cardW || "30%",
            aspectRatio: "16/9",
            transformStyle: "preserve-3d",
            rotateY: drumAngle,
          }}
        >
          {items.map((item, i) => (
            <CylinderCard
              key={item.title}
              item={item}
              index={i}
              activeIndex={activeIndex}
              sliceAngle={sliceAngle}
              radius={radius}
              colors={colors}
              count={count}
            />
          ))}
        </motion.div>

        {/* Arrow buttons */}
        <button
          onClick={() => snapTo(activeIndex - 1)}
          className={`absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 flex w-10 h-10 items-center justify-center rounded-full bg-charcoal-dark/80 backdrop-blur-sm border border-white/10 ${colors.arrow} transition-colors duration-200 z-20`}
          aria-label="Previous slide"
        >
          <ChevronLeft size={20} strokeWidth={2} />
        </button>
        <button
          onClick={() => snapTo(activeIndex + 1)}
          className={`absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 flex w-10 h-10 items-center justify-center rounded-full bg-charcoal-dark/80 backdrop-blur-sm border border-white/10 ${colors.arrow} transition-colors duration-200 z-20`}
          aria-label="Next slide"
        >
          <ChevronRight size={20} strokeWidth={2} />
        </button>
      </div>

      {/* Dot indicators */}
      <div
        className="flex justify-center gap-2 mt-10"
        role="tablist"
        aria-label="Carousel navigation"
      >
        {items.map((item, i) => (
          <button
            key={item.title}
            role="tab"
            aria-selected={i === activeIndex}
            aria-label={`Go to slide ${i + 1}: ${item.title}`}
            onClick={() => snapTo(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === activeIndex
                ? `w-6 ${colors.dot}`
                : `w-2 ${colors.dotInactive}`
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Cylinder Card ─────────────────────────────────────

interface CylinderCardProps {
  item: CarouselItem;
  index: number;
  activeIndex: number;
  sliceAngle: number;
  radius: number;
  colors: (typeof themeColors)["cyan"];
  count: number;
}

function CylinderCard({
  item,
  index,
  activeIndex,
  sliceAngle,
  radius,
  colors,
  count,
}: CylinderCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isActive = index === activeIndex;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isActive) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isActive]);

  // Each card is rotated to its slot on the cylinder, then pushed out by radius
  const cardAngle = index * sliceAngle;

  // Calculate visual distance from front for opacity
  const rawDist = Math.abs(index - activeIndex);
  const dist = Math.min(rawDist, count - rawDist); // wrap-around distance

  return (
    <div
      className="absolute inset-0 rounded-xl overflow-hidden"
      style={{
        transform: `rotateY(${cardAngle}deg) translateZ(${radius}px)`,
        backfaceVisibility: "hidden",
        opacity: dist === 0 ? 1 : Math.max(0.4, 1 - dist * 0.15),
      }}
    >
      {/* Video or placeholder */}
      {item.videoSrc ? (
        <video
          ref={videoRef}
          src={item.videoSrc}
          poster={item.posterSrc}
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-charcoal-dark to-charcoal-mid flex items-center justify-center border border-white/5">
          <Video className="text-gray-700" size={48} strokeWidth={1} />
        </div>
      )}

      {/* Text overlay — contained within card bounds */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
        {item.client && (
          <p className={`text-[10px] font-medium ${colors.accent} mb-0.5 truncate`}>
            {item.client}
          </p>
        )}
        <p className="text-xs font-semibold text-white truncate">{item.title}</p>
        <p className="text-[10px] text-gray-400 truncate mt-0.5">{item.category}</p>
      </div>
    </div>
  );
}
