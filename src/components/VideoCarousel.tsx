"use client";

import {
  useMotionValue,
  animate,
  motion,
  useReducedMotion,
  type PanInfo,
} from "framer-motion";
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
    accentBg: "bg-cyan-brand",
    border: "border-cyan-brand/30",
    dot: "bg-cyan-brand",
    dotInactive: "bg-cyan-brand/20",
    arrow: "text-cyan-brand hover:bg-cyan-brand/10",
    overlay: "from-cyan-brand/5",
  },
  amber: {
    accent: "text-amber-brand",
    accentBg: "bg-amber-brand",
    border: "border-amber-brand/30",
    dot: "bg-amber-brand",
    dotInactive: "bg-amber-brand/20",
    arrow: "text-amber-brand hover:bg-amber-brand/10",
    overlay: "from-amber-brand/5",
  },
};

// Whippy spring — low damping for overshoot, high stiffness for snap
const SPRING = { stiffness: 500, damping: 28, mass: 0.6 };
const GAP = -40; // negative gap = cards overlap for tighter arc
const PEEK_RATIO = 0.65; // active card is 65% of container — more room for sides

export default function VideoCarousel({
  items,
  theme,
  heading,
}: VideoCarouselProps) {
  const reducedMotion = useReducedMotion();
  const colors = themeColors[theme];

  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [cardWidth, setCardWidth] = useState(0);
  const x = useMotionValue(0);

  // Calculate card width from container
  const measure = useCallback(() => {
    if (!containerRef.current) return 0;
    const w = containerRef.current.offsetWidth * PEEK_RATIO;
    setCardWidth(w);
    return w;
  }, []);

  // Get the x offset for a given index
  const getOffset = useCallback(
    (index: number, cw?: number) => {
      const w = cw || cardWidth;
      if (!containerRef.current || w === 0) return 0;
      const containerW = containerRef.current.offsetWidth;
      // Center the active card: offset = (containerW - cardW) / 2 - index * (cardW + gap)
      return (containerW - w) / 2 - index * (w + GAP);
    },
    [cardWidth],
  );

  // Snap to index
  const snapTo = useCallback(
    (index: number, velocity = 0) => {
      const clamped = Math.max(0, Math.min(items.length - 1, index));
      setActiveIndex(clamped);
      const target = getOffset(clamped);
      if (reducedMotion) {
        x.set(target);
      } else {
        animate(x, target, { ...SPRING, velocity });
      }
    },
    [getOffset, items.length, reducedMotion, x],
  );

  // Measure on mount + resize
  useEffect(() => {
    const cw = measure();
    if (cw > 0) {
      x.set(getOffset(activeIndex, cw));
    }

    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => {
      const newW = measure();
      if (newW > 0) {
        // Snap without animation on resize
        const target =
          (container.offsetWidth - newW) / 2 - activeIndex * (newW + GAP);
        x.set(target);
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Drag end handler
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const velocity = info.velocity.x;
    const offset = info.offset.x;
    // Determine direction: if flung fast or dragged far enough
    let newIndex = activeIndex;
    if (velocity < -300 || offset < -cardWidth * 0.25) {
      newIndex = activeIndex + 1;
    } else if (velocity > 300 || offset > cardWidth * 0.25) {
      newIndex = activeIndex - 1;
    }
    snapTo(newIndex, velocity);
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
        <h3 className="font-heading text-2xl font-bold text-white text-center mb-8">
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
        className="relative overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-white/20 rounded-xl"
      >
        {/* Track — tight perspective for dramatic depth */}
        <div style={{ perspective: 800, perspectiveOrigin: "50% 50%" }}>
          <motion.div
            className="flex"
            style={{ x, gap: GAP }}
            drag={reducedMotion ? false : "x"}
            dragDirectionLock
            dragMomentum={false}
            onDragEnd={handleDragEnd}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
          >
            {items.map((item, i) => (
              <CarouselCard
                key={item.title}
                item={item}
                offset={i - activeIndex}
                cardWidth={cardWidth}
                colors={colors}
                reducedMotion={!!reducedMotion}
              />
            ))}
          </motion.div>
        </div>

        {/* Arrow buttons — desktop only */}
        {activeIndex > 0 && (
          <button
            onClick={() => snapTo(activeIndex - 1)}
            className={`absolute left-3 top-1/2 -translate-y-1/2 hidden md:flex w-10 h-10 items-center justify-center rounded-full bg-charcoal-dark/80 backdrop-blur-sm border border-white/10 ${colors.arrow} transition-colors duration-200`}
            aria-label="Previous slide"
          >
            <ChevronLeft size={20} strokeWidth={2} />
          </button>
        )}
        {activeIndex < items.length - 1 && (
          <button
            onClick={() => snapTo(activeIndex + 1)}
            className={`absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex w-10 h-10 items-center justify-center rounded-full bg-charcoal-dark/80 backdrop-blur-sm border border-white/10 ${colors.arrow} transition-colors duration-200`}
            aria-label="Next slide"
          >
            <ChevronRight size={20} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Dot indicators */}
      <div
        className="flex justify-center gap-2 mt-6"
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

// ── Card ──────────────────────────────────────────────

interface CarouselCardProps {
  item: CarouselItem;
  offset: number; // distance from active: -2, -1, 0, 1, 2 etc.
  cardWidth: number;
  colors: (typeof themeColors)["cyan"];
  reducedMotion: boolean;
}

// Cylindrical arc — cards arranged as if on a curved surface
function get3DStyle(offset: number) {
  if (offset === 0)
    return { rotateY: 0, z: 0, scale: 1, opacity: 1, x: 0 };

  const direction = offset > 0 ? 1 : -1;
  const abs = Math.abs(offset);
  const distance = Math.min(abs, 4);

  // Aggressive rotation — immediate neighbors at 62deg, further cards up to 78deg
  const rotateY = direction * -(45 + 17 * Math.min(distance, 2));

  // Deep z-push — cards fall away fast
  const z = -300 * distance;

  // Pull side cards inward so they tuck behind center
  const xPull = direction * -60 * Math.min(distance, 2);

  // Strong scale drop — distant cards are clearly smaller
  const scale = Math.max(0.55, 1 - 0.15 * distance);

  // Heavy fade for depth cue
  const opacity = Math.max(0.15, 1 - 0.35 * distance);

  return { rotateY, z, scale, opacity, x: xPull };
}

function CarouselCard({
  item,
  offset,
  cardWidth,
  colors,
  reducedMotion,
}: CarouselCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isActive = offset === 0;

  // Play/pause video based on active state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isActive) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isActive]);

  const { rotateY, z, scale, opacity, x: xPull } = get3DStyle(offset);

  // Rotate around the near edge for cylindrical feel:
  // cards to the right rotate around their left edge, and vice versa
  const origin =
    offset === 0 ? "center" : offset > 0 ? "left center" : "right center";

  return (
    <motion.div
      className="relative aspect-video rounded-lg overflow-hidden flex-shrink-0 select-none"
      style={{
        width: cardWidth || "65%",
        transformStyle: "preserve-3d",
        transformOrigin: origin,
        zIndex: 10 - Math.abs(offset), // active card on top
      }}
      animate={{ rotateY, z, scale, opacity, x: xPull }}
      transition={
        reducedMotion ? { duration: 0 } : { type: "spring", ...SPRING }
      }
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
          <Video
            className="text-gray-700"
            size={48}
            strokeWidth={1}
          />
        </div>
      )}

      {/* Text overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none">
        {item.client && (
          <p className={`text-xs font-medium ${colors.accent} mb-0.5`}>
            {item.client}
          </p>
        )}
        <p className="text-sm font-semibold text-white">{item.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-400">{item.category}</span>
          {item.description && (
            <>
              <span className="text-gray-600">·</span>
              <span className="text-xs text-gray-400">{item.description}</span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
