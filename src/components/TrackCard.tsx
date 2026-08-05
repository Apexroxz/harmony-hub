import { Link } from "@tanstack/react-router";
import { Play, Lock, LockOpen } from "lucide-react";
import { usePlayer } from "@/lib/player";
import { useOwnership } from "@/hooks/useOwnership";
import type { Track } from "@/domain/music/types";
import { formatDuration } from "@/domain/music/types";
import { Button } from "@/components/ui/button";
import { QualityBadge } from "@/components/QualityBadge";
import { StorageBadge } from "@/components/StorageBadge";

import { cn } from "@/lib/utils";

interface TrackCardProps {
  track: Track;
  showStorage?: boolean;
}

export function TrackCard({ track, showStorage = true }: TrackCardProps) {
  const { currentTrack, isPlaying, playTrack } = usePlayer();
  const { tokenGated, locked } = useOwnership(track.id);
  const isCurrent = currentTrack?.id === track.id;

  const handlePlay = () => {
    if (locked) return;
    playTrack(track);
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/40 bg-card transition-all duration-300 hover:border-primary/40 hover:shadow-[0_0_30px_var(--color-glow-soft)]",
        locked && "opacity-80"
      )}
    >
      <div className="relative aspect-square overflow-hidden">
        <img
          src={track.coverImage}
          alt={track.title}
          width={400}
          height={400}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />

        {locked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/60 backdrop-blur-sm">
            <Lock className="h-8 w-8 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Connect wallet to unlock</span>
          </div>
        )}

        <Button
          size="icon"
          onClick={handlePlay}
          disabled={locked}
          className={cn(
            "absolute bottom-3 right-3 h-10 w-10 rounded-full opacity-0 transition-all duration-300 group-hover:opacity-100",
            isCurrent && isPlaying ? "bg-cyan text-primary-foreground" : "bg-primary text-primary-foreground",
            locked && "hidden"
          )}
        >
          <Play className="h-5 w-5 fill-current" />
        </Button>

        {tokenGated && (
          <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-background/80 px-2 py-1 text-xs font-medium text-primary backdrop-blur-sm">
            {locked ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
            {locked ? "Token gated" : "Unlocked"}
          </div>
        )}
      </div>

      <div className="p-4">
        <Link
          to="/track/$id"
          params={{ id: track.id }}
          className="block text-base font-semibold text-foreground hover:text-primary"
        >
          {track.title}
        </Link>
        <p className="mt-1 text-sm text-muted-foreground">{track.artistName}</p>

        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{formatDuration(track.duration)}</span>
          <div className="flex items-center gap-1.5">
            <QualityBadge spec={track} />
            {showStorage && <StorageBadge trackId={track.id} />}
          </div>
        </div>

      </div>
    </div>
  );
}
