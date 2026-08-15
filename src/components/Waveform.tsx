import { useMemo, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface WaveformProps {
  /** Stable seed so each track keeps the same silhouette when no peaks exist. */
  seed?: string;
  /** Real normalised 0-1 peaks generated from the master at upload time. */
  peaks?: number[] | undefined;
  /** 0-100 played portion. */
  progress?: number;
  /** Total duration in seconds for hover timestamp display. */
  duration?: number;
  bars?: number;
  className?: string;
  onSeek?: ((percent: number) => void) | undefined;
  /** Reveal bars on parent hover only. */
  revealOnHover?: boolean;
  /** Glowing aesthetic style. */
  variant?: "default" | "neon" | "minimal";
}

function hash(str = "layam-waveform"): number {
  let h = 2166136261;
  const safeStr = typeof str === "string" && str.length > 0 ? str : "layam-waveform";
  for (let i = 0; i < safeStr.length; i++) {
    h ^= safeStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Resamples stored peaks down to the rendered bar count. */
function resample(peaks: number[], bars: number): number[] {
  return Array.from({ length: bars }, (_, i) => {
    const value = peaks[Math.floor((i / bars) * peaks.length)] ?? 0;
    const clamped = Math.max(0.18, Math.min(1, value));
    return Math.round(clamped * 10000) / 100;
  });
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function Waveform({
  seed = "layam-audio",
  peaks,
  progress = 0,
  duration = 180,
  bars = 80,
  className,
  onSeek,
  revealOnHover = false,
  variant = "neon",
}: WaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverPercent, setHoverPercent] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const heights = useMemo(() => {
    if (peaks && Array.isArray(peaks) && peaks.length > 0) {
      return resample(peaks, bars);
    }
    let s = hash(seed || "layam-audio") || 1;
    const rand = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
    return Array.from({ length: bars }, (_, i) => {
      const envelope = Math.sin((i / bars) * Math.PI) * 0.65 + 0.35;
      const harmonic = Math.sin((i / bars) * Math.PI * 4) * 0.15;
      const raw = Math.max(0.18, Math.min(1, (0.35 + rand() * 0.65 + harmonic) * envelope));
      return Math.round(raw * 10000) / 100;
    });
  }, [seed, peaks, bars]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;
      const clientX = e.clientX;
      const percent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      setHoverPercent(percent);

      if (isDragging && onSeek) {
        onSeek(percent);
      }
    },
    [isDragging, onSeek],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!onSeek || !containerRef.current) return;
      setIsDragging(true);
      const rect = containerRef.current.getBoundingClientRect();
      const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      onSeek(percent);
      containerRef.current.setPointerCapture(e.pointerId);
    },
    [onSeek],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      setIsDragging(false);
      try {
        if (containerRef.current?.hasPointerCapture(e.pointerId)) {
          containerRef.current.releasePointerCapture(e.pointerId);
        }
      } catch {
        // ignore
      }
    },
    [],
  );

  const handlePointerLeave = useCallback(() => {
    if (!isDragging) {
      setHoverPercent(null);
    }
  }, [isDragging]);

  const hoverTime = hoverPercent !== null ? (hoverPercent / 100) * duration : 0;

  return (
    <div
      ref={containerRef}
      role={onSeek ? "slider" : undefined}
      aria-label={onSeek ? "Seek within track" : undefined}
      aria-valuenow={onSeek ? Math.round(progress) : undefined}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      className={cn(
        "group relative flex h-7 sm:h-9 w-full items-end gap-[1.5px] sm:gap-[2px] py-1 cursor-pointer select-none transition-all duration-300",
        revealOnHover && "opacity-60 transition-opacity duration-500 hover:opacity-100",
        className,
      )}
    >
      {/* Background Micro Glow Track */}
      <div className="absolute inset-x-0 bottom-1 h-1 rounded-full bg-white/[0.04] backdrop-blur-sm pointer-events-none" />

      {/* Floating Hover Time Capsule */}
      <AnimatePresence>
        {hoverPercent !== null && onSeek && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: -24, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            style={{ left: `${hoverPercent}%` }}
            className="pointer-events-none absolute -top-1 -translate-x-1/2 z-30 flex items-center gap-1 rounded-full border border-primary/40 bg-black/90 px-2.5 py-0.5 shadow-[0_4px_20px_rgba(0,0,0,0.8),0_0_12px_rgba(249,115,22,0.4)] backdrop-blur-md"
          >
            <span className="font-mono text-[10px] font-bold text-primary tabular-nums">
              {formatTime(hoverTime)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* High-Precision Aesthetic Waveform Bars */}
      {heights.map((h, i) => {
        const barPercent = (i / bars) * 100;
        const played = barPercent <= progress;
        const isHovered = hoverPercent !== null && barPercent <= hoverPercent;

        return (
          <div
            key={i}
            style={{ height: `${h}%` }}
            className={cn(
              "relative flex-1 min-w-[1px] rounded-full transition-all duration-150 ease-out origin-bottom",
              played
                ? "bg-gradient-to-t from-primary via-amber-400 to-amber-300 shadow-[0_0_8px_rgba(249,115,22,0.4)]"
                : isHovered
                ? "bg-white/40"
                : "bg-white/[0.14] group-hover:bg-white/[0.22]",
            )}
          >
            {/* Luminous Tip on Active Played Head */}
            {played && i === Math.floor((progress / 100) * bars) && (
              <span className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-white shadow-[0_0_10px_#f97316,0_0_20px_#f97316] animate-pulse" />
            )}
          </div>
        );
      })}

      {/* Subtle Ghost Scrubber Line on Hover */}
      {hoverPercent !== null && (
        <div
          style={{ left: `${hoverPercent}%` }}
          className="pointer-events-none absolute inset-y-0 w-px bg-white/50 -translate-x-1/2 z-20 shadow-[0_0_8px_rgba(255,255,255,0.8)]"
        />
      )}
    </div>
  );
}
