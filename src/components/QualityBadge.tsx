import { Waves } from "lucide-react";
import type { AudioSpec } from "@/domain/music/types";
import { isLossless, qualityLabel } from "@/domain/music/types";
import { cn } from "@/lib/utils";

interface QualityBadgeProps {
  spec: AudioSpec;
  className?: string;
  withIcon?: boolean;
}

export function QualityBadge({ spec, className, withIcon = false }: QualityBadgeProps) {
  const lossless = isLossless(spec);
  return (
    <span
      title={lossless ? "Lossless master" : "Compressed stream"}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
        lossless ? "bg-primary/15 text-primary" : "bg-surface-raised text-muted-foreground",
        className
      )}
    >
      {withIcon && <Waves className="h-3 w-3" />}
      {qualityLabel(spec)}
    </span>
  );
}
