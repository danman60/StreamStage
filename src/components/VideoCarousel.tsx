"use client";

import { motion, useReducedMotion, animate, useMotionValue } from "framer-motion";
import { Video, ChevronLeft, ChevronRight, Volume2, VolumeX, Maximize } from "lucide-react";
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
  orientation?: "horizontal" | "vertical";
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

// Global: only one video can be unmuted at a time across all carousels
let globalUnmutedVideo: HTMLVideoElement | null = null;
let globalMuteListener: (() => void) | null = null;

function muteGlobal() {
  if (globalUnmutedVideo) {
    globalUnmutedVideo.muted = true;
    globalUnmutedVideo = null;
  }
  if (globalMuteListener) {
    globalMuteListener();
    globalMuteListener = null;
  }
}

export default function VideoCarousel({
  items,
  theme,
  heading,
  orientation = "horizontal",
}: VideoCarouselProps) {
  const isVertical = orientation === "vertical";
  const reducedMotion = useReducedMotion();
  const colors = themeColors[theme];
  const count = items.length;

  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [radius, setRadius] = useState(0);
  const [cardW, setCardW] = useState(0);
  const [unmutedIndex, setUnmutedIndex] = useState<number | null>(null);

  // Animated rotation angle of the drum
  const drumAngle = useMotionValue(0);

  // Angle between each card on the cylinder
  const sliceAngle = 360 / count;

  // Calculate cylinder radius from card width
  const measure = useCallback(() => {
    if (!containerRef.current) return;
    const containerW = containerRef.current.offsetWidth;
    // Slightly smaller to prevent clipping between side-by-side carousels
    const ratio = isVertical
      ? (containerW < 500 ? 0.35 : containerW < 900 ? 0.25 : 0.18)
      : (containerW < 500 ? 0.5 : containerW < 900 ? 0.38 : 0.26);
    const cw = containerW * ratio;
    setCardW(cw);
    const gap = containerW < 640 ? 10 : 20;
    // Vertical: natural cylinder radius (scales with count)
    // Landscape: fixed radius from card width so all carousels match regardless of item count
    const r = isVertical
      ? Math.max((count * (cw + gap)) / (2 * Math.PI), cw * 0.8)
      : cw * 1.2;
    setRadius(r);
    return r;
  }, [count, isVertical]);

  // Snap drum to show given index at front
  const snapTo = useCallback(
    (index: number) => {
      const clamped = ((index % count) + count) % count;
      setActiveIndex(clamped);
      // Mute when navigating away
      setUnmutedIndex(null);
      muteGlobal();

      const target = -(clamped * sliceAngle);
      const current = drumAngle.get();
      const diff = target - (current % 360);
      const shortDiff =
        ((diff % 360) + 540) % 360 - 180;
      const finalTarget = current + shortDiff;

      if (reducedMotion) {
        drumAngle.set(finalTarget);
      } else {
        animate(drumAngle, finalTarget, SPRING);
      }
    },
    [count, sliceAngle, drumAngle, reducedMotion],
  );

  // Handle unmute toggle from a card
  const handleToggleMute = useCallback(
    (index: number, videoEl: HTMLVideoElement) => {
      if (unmutedIndex === index) {
        // Mute it
        videoEl.muted = true;
        setUnmutedIndex(null);
        globalUnmutedVideo = null;
        globalMuteListener = null;
      } else {
        // Mute any previously unmuted video globally
        muteGlobal();
        // Unmute this one
        videoEl.muted = false;
        setUnmutedIndex(index);
        globalUnmutedVideo = videoEl;
        globalMuteListener = () => setUnmutedIndex(null);
      }
    },
    [unmutedIndex],
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
    <div className="mb-20 flex flex-col h-full">
      {heading && (
        <h3 className="font-heading text-2xl font-bold text-white text-center mb-12 relative z-10">
          {heading}
        </h3>
      )}

      <div className="flex-1 flex flex-col justify-center">
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
        style={{ perspective: 800 }}
      >
        {/* The 3D drum */}
        <motion.div
          className="relative mx-auto"
          style={{
            width: cardW || "50%",
            aspectRatio: isVertical ? "9/16" : "16/9",
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
              isVertical={isVertical}
              isUnmuted={unmutedIndex === i}
              onToggleMute={handleToggleMute}
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
  isVertical: boolean;
  isUnmuted: boolean;
  onToggleMute: (index: number, videoEl: HTMLVideoElement) => void;
}

/** Inject Cloudinary video optimizations into the URL */
function optimizeSrc(src: string, isVertical: boolean): string {
  if (!src.includes("res.cloudinary.com")) return src;
  const maxH = isVertical ? 1080 : 1080;
  return src.replace(
    "/video/upload/",
    `/video/upload/q_auto:good,f_auto,h_${maxH},c_limit/`,
  );
}

/** Generate a poster thumbnail from a Cloudinary video URL */
function posterFromVideo(src: string, isVertical: boolean): string {
  if (!src.includes("res.cloudinary.com")) return "";
  const maxH = isVertical ? 480 : 360;
  // Extract frame at 1 second, serve as auto-format image
  return src
    .replace("/video/upload/", `/video/upload/so_1,h_${maxH},c_limit,f_auto,q_auto/`)
    .replace(/\.\w+$/, ".jpg");
}

function CylinderCard({
  item,
  index,
  activeIndex,
  sliceAngle,
  radius,
  colors,
  count,
  isVertical,
  isUnmuted,
  onToggleMute,
}: CylinderCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isActive = index === activeIndex;

  // Load active + 2 neighbors to avoid black screens on swipe
  const rawDist = Math.abs(index - activeIndex);
  const dist = Math.min(rawDist, count - rawDist);
  const shouldLoad = dist <= 2;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isActive) {
      video.play().catch(() => {});
    } else {
      video.pause();
      // Mute if navigated away while unmuted
      if (!video.muted) video.muted = true;
    }
  }, [isActive]);

  // Sync muted state from parent
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isUnmuted;
  }, [isUnmuted]);

  const handleClick = () => {
    if (!isActive || !videoRef.current) return;
    onToggleMute(index, videoRef.current);
  };

  const handleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (video.requestFullscreen) {
      video.requestFullscreen();
    } else if ((video as HTMLVideoElement & { webkitEnterFullscreen?: () => void }).webkitEnterFullscreen) {
      (video as HTMLVideoElement & { webkitEnterFullscreen: () => void }).webkitEnterFullscreen();
    }
  };

  const cardAngle = index * sliceAngle;

  const videoSrc = item.videoSrc && shouldLoad
    ? optimizeSrc(item.videoSrc, isVertical)
    : undefined;

  // Auto-generate poster from Cloudinary video (always load for instant thumbnails)
  const poster = item.posterSrc
    || (item.videoSrc ? posterFromVideo(item.videoSrc, isVertical) : undefined);

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
        <>
          <video
            ref={videoRef}
            src={videoSrc}
            poster={poster}
            preload={isActive ? "auto" : dist <= 1 ? "metadata" : "none"}
            muted
            loop
            playsInline
            onClick={handleClick}
            className="absolute inset-0 w-full h-full object-cover cursor-pointer"
          />
          {/* Controls on active card */}
          {isActive && (
            <div className="absolute top-2 right-2 flex gap-1.5 z-10">
              <button
                onClick={handleClick}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-sm text-white/80 hover:text-white transition-colors"
                aria-label={isUnmuted ? "Mute" : "Unmute"}
              >
                {isUnmuted ? (
                  <Volume2 size={14} strokeWidth={2} />
                ) : (
                  <VolumeX size={14} strokeWidth={2} />
                )}
              </button>
              <button
                onClick={handleFullscreen}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-sm text-white/80 hover:text-white transition-colors"
                aria-label="Fullscreen"
              >
                <Maximize size={14} strokeWidth={2} />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-charcoal-dark to-charcoal-mid flex items-center justify-center border border-white/5">
          <Video className="text-gray-700" size={48} strokeWidth={1} />
        </div>
      )}

      {/* Text overlay */}
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
