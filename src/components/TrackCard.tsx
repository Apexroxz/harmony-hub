import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Play, ShoppingBag, Download } from "lucide-react";
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
  const { isOnline, isOffline } = useAppMode();
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
          "group relative overflow-hidden rounded-3xl border border-border/40 bg-card/90 transition-all duration-300 hover:border-primary/50 hover:shadow-[0_8px_30px_rgba(0,0,0,0.6)] flex flex-col justify-between"
        )}
      >
        {/* Large Artwork with Gloss & Floating Play Trigger */}
        <div className="relative aspect-square overflow-hidden bg-surface">
          <img
            src={track.coverImage}
            alt={track.title}
            width={400}
            height={400}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-80" />

          {/* Quality & Price Tag Badges */}
          <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5 z-10">
            <Badge className="bg-black/75 backdrop-blur-md text-[10px] font-mono font-bold text-primary border border-white/10 px-2 py-0.5">
              {track.quality}
            </Badge>

            {isOnline && (
              <Badge
                className={cn(
                  "text-[10px] font-mono font-bold backdrop-blur-md border px-2 py-0.5",
                  purchased
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                    : "bg-black/75 text-foreground border-white/10"
                )}
              >
                {purchased ? "PURCHASED" : `$${price.toFixed(2)}`}
              </Badge>
            )}
          </div>

          {/* Minimal Play Trigger Button */}
          <Button
            size="icon"
            onClick={handlePlay}
            aria-label={`Play ${track.title}`}
            className={cn(
              "absolute bottom-3.5 right-3.5 h-11 w-11 rounded-full shadow-2xl transition-all duration-300 opacity-0 group-hover:opacity-100 group-hover:scale-100 scale-90 cursor-pointer",
              isCurrent && isPlaying
                ? "bg-primary text-primary-foreground opacity-100 scale-100 shadow-primary/30"
                : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/30"
            )}
          >
            <Play className="h-5 w-5 fill-current ml-0.5" />
          </Button>
        </div>

        {/* Typographic Metadata & Actions */}
        <div className="p-4 flex flex-col justify-between flex-1">
          <div>
            <Link
              to="/track/$id"
              params={{ id: track.id }}
              className="block truncate text-sm sm:text-base font-bold text-foreground hover:text-primary transition-colors"
            >
              {track.title}
            </Link>
            <p className="truncate text-xs text-muted-foreground mt-0.5">{track.artistName}</p>
          </div>

          <div className="mt-3.5 pt-3 border-t border-border/30 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="font-mono text-[11px] tabular-nums">{formatDuration(track.duration)}</span>

            {isOnline && showBuyButton && (
              <Button
                size="sm"
                variant={purchased ? "outline" : "default"}
                onClick={() => setBuyModalOpen(true)}
                className={cn(
                  "h-7 rounded-full px-3 text-[11px] font-bold gap-1 transition-all cursor-pointer",
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
