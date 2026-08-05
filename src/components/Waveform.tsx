import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface WaveformProps {
  /** Stable seed so each track keeps the same silhouette when no peaks exist. */
  seed: string;
  /** Real normalised 0-1 peaks generated from the master at upload time. */
  peaks?: number[] | undefined;
  /** 0-100 played portion. */
  progress?: number;
  bars?: number;
  className?: string;
  onSeek?: ((percent: number) => void) | undefined;
  /** Reveal bars on parent hover only. */
  revealOnHover?: boolean;
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Resamples stored peaks down to the rendered bar count. */
function resample(peaks: number[], bars: number): number[] {
  return Array.from({ length: bars }, (_, i) => {
    const value = peaks[Math.floor((i / bars) * peaks.length)] ?? 0;
    const clamped = Math.max(0.14, Math.min(1, value));
    return Math.round(clamped * 10000) / 100;
  });
}

export function Waveform({
  seed,
  peaks,
  progress = 0,
  bars = 64,
  className,
  onSeek,
  revealOnHover = false,
}: WaveformProps) {
  const heights = useMemo(() => {
    if (peaks && peaks.length > 0) return resample(peaks, bars);
    let s = hash(seed) || 1;
    const rand = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
    return Array.from({ length: bars }, (_, i) => {
      const envelope = Math.sin((i / bars) * Math.PI) * 0.55 + 0.45;
      const raw = Math.max(0.14, Math.min(1, (0.35 + rand() * 0.65) * envelope));
      // Quantize to 2 decimals of percent so SSR and client emit identical
      // style strings (float precision differs between renderers).
      return Math.round(raw * 10000) / 100;
    });
  }, [seed, peaks, bars]);

  return (
    <div
      role={onSeek ? "slider" : undefined}
      aria-label={onSeek ? "Seek within track" : undefined}
      aria-valuenow={onSeek ? Math.round(progress) : undefined}
      onClick={
        onSeek
          ? (e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              onSeek(((e.clientX - rect.left) / rect.width) * 100);
            }
          : undefined
      }
      className={cn(
        "flex h-full w-full items-end gap-[2px]",
        onSeek && "cursor-pointer",
        revealOnHover &&
          "opacity-0 transition-opacity duration-500 group-hover:opacity-100",
        className
      )}
    >
      {heights.map((h, i) => {
        const played = (i / bars) * 100 <= progress;
        return (
          <span
            key={i}
            style={{ height: `${h}%` }}
            className={cn(
              "flex-1 rounded-full transition-colors duration-200",
              played ? "bg-primary" : "bg-muted-foreground/30"
            )}
          />
        );
      })}
    </div>
  );
}
