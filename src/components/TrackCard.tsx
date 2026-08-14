import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Play, ShoppingBag, CheckCircle2, Download } from "lucide-react";
import { usePlayer } from "@/lib/player";
import { useAppMode } from "@/lib/mode";
import type { Track } from "@/domain/music/types";
import { formatDuration } from "@/domain/music/types";
import { isTrackPurchased } from "@/domain/music/purchases";
import { BuyTrackModal } from "@/components/BuyTrackModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TrackCardProps {
  track: Track;
  showBuyButton?: boolean;
}

export function TrackCard({ track, showBuyButton = true }: TrackCardProps) {
  const { currentTrack, isPlaying, playTrack } = usePlayer();
  const { isOnline } = useAppMode();
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const isCurrent = currentTrack?.id === track.id;
  const purchased = isTrackPurchased(track.id);
  const price = track.price ?? 1.49;

  const handlePlay = () => {
    playTrack(track);
  };

  return (
    <>
      <div
        className={cn(
          "group relative overflow-hidden rounded-2xl border border-border/40 bg-card transition-all duration-300 hover:border-primary/40 hover:shadow-[0_0_30px_var(--color-glow-soft)] flex flex-col justify-between"
        )}
      >
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img
            src={track.coverImage}
            alt={track.title}
            width={400}
            height={400}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />

          {/* Quality & Price Badges */}
          <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
            <Badge className="bg-black/70 backdrop-blur-md text-[10px] font-mono font-bold text-primary border-white/10">
              {track.quality}
            </Badge>
            {isOnline && (
              <Badge
                className={cn(
                  "text-[10px] font-mono font-bold backdrop-blur-md border",
                  purchased
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                    : "bg-black/70 text-foreground border-white/10"
                )}
              >
                {purchased ? "PURCHASED" : `$${price.toFixed(2)}`}
              </Badge>
            )}
          </div>

          {/* Play Trigger */}
          <Button
            size="icon"
            onClick={handlePlay}
            aria-label={`Play ${track.title}`}
            className={cn(
              "absolute bottom-3 right-3 h-11 w-11 rounded-full opacity-0 transition-all duration-300 group-hover:opacity-100 shadow-xl",
              isCurrent && isPlaying
                ? "bg-cyan text-primary-foreground opacity-100"
                : "bg-primary text-primary-foreground hover:scale-105"
            )}
          >
            <Play className="h-5 w-5 fill-current ml-0.5" />
          </Button>
        </div>

        <div className="p-4 flex flex-col justify-between flex-1">
          <div>
            <Link
              to="/track/$id"
              params={{ id: track.id }}
              className="block truncate text-base font-bold text-foreground hover:text-primary transition-colors"
            >
              {track.title}
            </Link>
            <p className="truncate text-xs text-muted-foreground mt-0.5">{track.artistName}</p>
          </div>

          <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="font-mono text-[11px]">{formatDuration(track.duration)}</span>

            {isOnline && showBuyButton && (
              <Button
                size="sm"
                variant={purchased ? "outline" : "default"}
                onClick={() => setBuyModalOpen(true)}
                className={cn(
                  "h-7 rounded-full px-2.5 text-[11px] font-bold gap-1 transition-all",
                  purchased
                    ? "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                )}
              >
                {purchased ? (
                  <>
                    <Download className="h-3 w-3" />
                    <span>Download</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-3 w-3" />
                    <span>Buy ${price.toFixed(2)}</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Direct Buy Master Modal */}
      <BuyTrackModal
        track={track}
        open={buyModalOpen}
        onClose={() => setBuyModalOpen(false)}
      />
    </>
  );
}
