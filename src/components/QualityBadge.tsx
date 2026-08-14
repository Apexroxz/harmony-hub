import { Sparkles, Disc3, Zap, Music2 } from "lucide-react";
import type { AudioSpec } from "@/domain/music/types";
import { isLossless, qualityLabel } from "@/domain/music/types";
import { classifyQualityTier } from "@/domain/music/quality-tier";
import { cn } from "@/lib/utils";

interface QualityBadgeProps {
  spec: AudioSpec;
  className?: string;
  withIcon?: boolean;
  showTier?: boolean;
}

export function QualityBadge({
  spec,
  className,
  withIcon = false,
  showTier = false,
}: QualityBadgeProps) {
  const { tier, tierLabel } = classifyQualityTier({
    format: spec.quality,
    bitrate: spec.bitrate,
    sampleRate: spec.sampleRate,
    bitDepth: spec.bitDepth,
  });

  let badgeStyle = "bg-surface text-muted-foreground border-border/60";
  let Icon = Music2;

  if (tier === "studio_master") {
    badgeStyle = "bg-amber/15 text-amber border-amber/40 shadow-sm shadow-amber/10";
    Icon = Sparkles;
  } else if (tier === "lossless") {
    badgeStyle = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    Icon = Disc3;
  } else if (tier === "high_quality") {
    badgeStyle = "bg-primary/15 text-primary border-primary/30";
    Icon = Zap;
  }

  return (
    <span
      title={`${tierLabel}: ${spec.quality} ${spec.bitrate}kbps ${spec.sampleRate ? `${spec.sampleRate}Hz` : ""}`}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[9px] sm:text-[10px] font-bold tracking-wider border uppercase select-none",
        badgeStyle,
        className
      )}
    >
      {withIcon && <Icon className="h-3 w-3" />}
      <span>{showTier ? tierLabel : qualityLabel(spec)}</span>
    </span>
  );
}
