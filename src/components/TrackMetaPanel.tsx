/**
 * TrackMetaPanel — displays MusicBrainz-enriched metadata for a track.
 * Used in the expanded player overlay and the track detail page.
 */
import { useMetaEnricher } from "@/hooks/useMetaEnricher";
import type { Track } from "@/domain/music/types";
import { cn } from "@/lib/utils";
import { BookOpen, Loader2 } from "lucide-react";

interface TrackMetaPanelProps {
  track: Track;
  className?: string;
}

export function TrackMetaPanel({ track, className }: TrackMetaPanelProps) {
  const { meta, status } = useMetaEnricher(track);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Artist thumbnail from TheAudioDB */}
      {meta.artistThumb && (
        <div className="flex items-center gap-3">
          <img
            src={meta.artistThumb}
            alt={track.artistName}
            className="h-12 w-12 rounded-full object-cover ring-1 ring-border/30"
          />
          <div>
            <p className="text-sm font-semibold text-foreground">{track.artistName}</p>
            {meta.releaseYear && (
              <p className="text-xs text-muted-foreground">Released {meta.releaseYear}</p>
            )}
          </div>
        </div>
      )}

      {/* Artist bio */}
      {meta.bio && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <BookOpen className="h-3 w-3" />
            Artist Bio
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-5">
            {meta.bio}
          </p>
        </div>
      )}

      {/* Fanart backdrop */}
      {meta.fanart && (
        <div className="overflow-hidden rounded-xl">
          <img
            src={meta.fanart}
            alt={`${track.artistName} fanart`}
            className="w-full object-cover opacity-60"
          />
        </div>
      )}

      {/* Loading state */}
      {status === "loading" && !meta.bio && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Fetching metadata…
        </div>
      )}

      {/* Empty state */}
      {status === "done" && !meta.bio && !meta.artistThumb && (
        <p className="text-xs text-muted-foreground italic">
          No additional metadata found.
        </p>
      )}
    </div>
  );
}
