"use client";

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

// Auto-rotation speed in degrees per second
const AUTO_ROTATE_SPEED = 6;
// After manual nav, pause auto-rotation for this many ms before resuming
const PAUSE_AFTER_NAV_MS = 3000;

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
  const colors = themeColors[theme];
  const count = items.length;

  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [radius, setRadius] = useState(0);
  const [cardW, setCardW] = useState(0);
  const [unmutedIndex, setUnmutedIndex] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Continuous rotation angle (degrees)
  const angleRef = useRef(0);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef(0);
  const pauseUntilRef = useRef(0);
  // For forcing re-render on each frame
  const [renderAngle, setRenderAngle] = useState(0);

  const sliceAngle = 360 / count;

  // Calculate cylinder radius from card width
  const measure = useCallback(() => {
    if (!containerRef.current) return;
    const containerW = containerRef.current.offsetWidth;
    const ratio = isVertical
      ? (containerW < 500 ? 0.35 : containerW < 900 ? 0.25 : 0.18)
      : (containerW < 500 ? 0.5 : containerW < 900 ? 0.38 : 0.26);
    const cw = containerW * ratio;
    setCardW(cw);
    const gap = containerW < 640 ? 10 : 20;
    // Use minimum effective item count so carousels with fewer items
    // have the same visual spread as larger ones
    const minVertical = 10;
    const minHorizontal = 8;
    if (isVertical) {
      const effective = Math.max(count, minVertical);
      const r = Math.max((effective * (cw + gap)) / (2 * Math.PI), cw * 0.8);
      setRadius(r);
    } else {
      const effective = Math.max(count, minHorizontal);
      const circumference = effective * (cw + gap);
      const r = Math.max(circumference / (2 * Math.PI), cw * 1.0);
      setRadius(r);
    }
  }, [count, isVertical]);

  // Auto-rotation loop
  useEffect(() => {
    const tick = (time: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      // Only rotate if not paused
      if (time > pauseUntilRef.current) {
        angleRef.current += AUTO_ROTATE_SPEED * dt;
        setRenderAngle(angleRef.current);

        // Update active index based on current angle
        const normalized = ((angleRef.current % 360) + 360) % 360;
        const frontIndex = Math.round(normalized / sliceAngle) % count;
        setActiveIndex(frontIndex);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [count, sliceAngle]);

  // Measure on mount + resize
  useEffect(() => {
    measure();
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(container);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // IntersectionObserver — track if carousel is on screen
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const io = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin: "600px" },
    );
    io.observe(container);
    return () => io.disconnect();
  }, []);

  // Snap to a specific card index (manual navigation)
  const snapTo = useCallback(
    (index: number) => {
      const clamped = ((index % count) + count) % count;
      setActiveIndex(clamped);
      setUnmutedIndex(null);
      muteGlobal();

      // Set angle to show this card at front
      const targetAngle = clamped * sliceAngle;
      // Find shortest rotation path from current angle
      const current = angleRef.current % 360;
      let diff = targetAngle - current;
      // Shortest path
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      angleRef.current += diff;
      setRenderAngle(angleRef.current);

      // Pause auto-rotation briefly
      pauseUntilRef.current = performance.now() + PAUSE_AFTER_NAV_MS;
    },
    [count, sliceAngle],
  );

  // Handle unmute toggle
  const handleToggleMute = useCallback(
    (index: number, videoEl: HTMLVideoElement) => {
      if (unmutedIndex === index) {
        videoEl.muted = true;
        setUnmutedIndex(null);
        globalUnmutedVideo = null;
        globalMuteListener = null;
      } else {
        muteGlobal();
        videoEl.muted = false;
        setUnmutedIndex(index);
        globalUnmutedVideo = videoEl;
        globalMuteListener = () => setUnmutedIndex(null);
      }
    },
    [unmutedIndex],
  );

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
        <h3 className="font-heading text-2xl font-bold text-white text-center mb-12 relative z-10 px-4">
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
          style={{ perspective: 1000 }}
        >
          {/* The 3D drum — auto-rotating */}
          <div
            className="relative mx-auto"
            style={{
              width: cardW || "50%",
              aspectRatio: isVertical ? "9/16" : "16/9",
              transformStyle: "preserve-3d",
              transform: `rotateY(${-renderAngle}deg)`,
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
                isCarouselVisible={isVisible}
              />
            ))}
          </div>

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
  isCarouselVisible: boolean;
}

/** Generate poster URL from video URL */
function posterFromVideo(src: string): string {
  if (!src) return "";
  return src.replace(/\.mp4$/, "_poster.jpg");
}

function CylinderCard({
  item,
  index,
  activeIndex,
  sliceAngle,
  radius,
  count,
  isUnmuted,
  onToggleMute,
  isCarouselVisible,
}: CylinderCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isActive = index === activeIndex;

  const rawDist = Math.abs(index - activeIndex);
  const dist = Math.min(rawDist, count - rawDist);
  // Only load src when carousel is on screen, play active + 1 neighbor
  const shouldLoad = isCarouselVisible;
  const shouldPlay = isCarouselVisible && dist <= 1;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (shouldPlay) {
      video.play().catch(() => {});
      if (!isActive && !video.muted) video.muted = true;
    } else {
      video.pause();
    }
  }, [isActive, shouldPlay]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isUnmuted;
  }, [isUnmuted]);

  const handleClick = () => {
    if (!isActive || !videoRef.current) return;
    onToggleMute(index, videoRef.current);
  };

  // Mute when exiting fullscreen
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onFsChange = () => {
      if (!document.fullscreenElement && !video.muted) {
        video.muted = true;
        onToggleMute(index, video);
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, [index, onToggleMute]);

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

  const poster = item.posterSrc
    || (item.videoSrc ? posterFromVideo(item.videoSrc) : undefined);

  return (
    <div
      className="absolute inset-0 rounded-2xl md:rounded-3xl overflow-hidden"
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
            src={shouldLoad ? item.videoSrc : undefined}
            poster={poster}
            preload={shouldLoad ? (dist <= 2 ? "auto" : "metadata") : "none"}
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
    </div>
  );
}
