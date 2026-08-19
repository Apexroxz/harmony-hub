import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Play, Pause, ShoppingBag, Download, Check } from "lucide-react";
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
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer();
  const { isOnline, isOffline, saveTrackOffline, removeDownloadedTrack, isTrackDownloaded } =
    useAppMode();
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const isCurrent = currentTrack?.id === track.id;
  const purchased = isTrackPurchased(track.id);
  const isSaved = isTrackDownloaded(track.id);
  const price = track.price ?? 1.49;

  const handlePlay = () => {
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track);
    }
  };

  return (
    <>
      <div
        className={cn(
          "group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#101114]/90 transition-all duration-300 hover:border-white/20 hover:bg-[#14161a] hover:shadow-[0_12px_32px_rgba(0,0,0,0.6)] flex flex-col justify-between backdrop-blur-md",
          isCurrent && "border-primary/50 shadow-[0_0_24px_rgba(255,107,0,0.12)] ring-1 ring-primary/30",
        )}
      >
        {/* Artwork Section with Subtle Vinyl Glow */}
        <div className="relative aspect-square overflow-hidden bg-surface rounded-t-2xl">
          <img
            src={track.coverImage}
            alt={track.title}
            width={400}
            height={400}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-70 group-hover:opacity-90 transition-opacity" />

          {/* Streamlined Single High-Res Audio Badge */}
          <div className="absolute left-2.5 top-2.5 z-20">
            <Badge className="bg-black/70 backdrop-blur-md text-[9px] font-mono font-bold text-primary/90 border border-white/10 px-2 py-0.5 shadow-sm">
              {track.format || track.quality || "LOSSLESS"}
            </Badge>
          </div>

          {/* Playing Equalizer Animation */}
          {isCurrent && isPlaying && (
            <div className="absolute bottom-2.5 left-2.5 flex items-end gap-0.5 z-20 bg-black/80 backdrop-blur-md px-2 py-1 rounded-full border border-primary/40">
              <span className="h-2 w-0.5 bg-primary animate-pulse rounded-full" />
              <span className="h-3.5 w-0.5 bg-primary animate-pulse delay-75 rounded-full" />
              <span className="h-1.5 w-0.5 bg-primary animate-pulse delay-150 rounded-full" />
              <span className="h-2.5 w-0.5 bg-primary animate-pulse delay-100 rounded-full" />
            </div>
          )}

          {/* Play Trigger Button */}
          <Button
            size="icon"
            onClick={handlePlay}
            aria-label={`Play ${track.title}`}
            className={cn(
              "absolute bottom-2.5 right-2.5 h-10 w-10 rounded-full shadow-xl transition-all duration-300 z-20 cursor-pointer",
              isCurrent && isPlaying
                ? "bg-primary text-primary-foreground opacity-100 scale-100 shadow-primary/30"
                : "bg-white text-black opacity-0 group-hover:opacity-100 hover:scale-105 shadow-black/40",
            )}
          >
            {isCurrent && isPlaying ? (
              <Pause className="h-4 w-4 fill-current" />
            ) : (
              <Play className="h-4 w-4 fill-current ml-0.5" />
            )}
          </Button>
        </div>

        {/* Clean Typographic Footer */}
        <div className="p-3.5 flex flex-col justify-between flex-1">
          <div>
            <Link
              to="/track/$id"
              params={{ id: track.id }}
              className="block truncate text-sm font-bold text-foreground hover:text-primary transition-colors tracking-tight"
            >
              {track.title}
            </Link>
            <p className="truncate text-xs text-muted-foreground mt-0.5 font-medium">
              {track.artistName}
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between gap-2 text-xs">
            <span className="font-mono text-[10px] text-muted-foreground/80 font-medium">
              {formatDuration(track.duration)}
            </span>

            {/* Subtle Action (Save / Price) */}
            <div className="flex items-center gap-1">
              {isOffline ? (
                <button
                  type="button"
                  onClick={() => {
                    if (isSaved) {
                      removeDownloadedTrack(track.id);
                    } else {
                      saveTrackOffline(track);
                    }
                  }}
                  className={cn(
                    "flex items-center gap-1 h-6 px-2 text-[10px] font-mono font-medium rounded-md transition-colors cursor-pointer",
                    isSaved
                      ? "text-emerald-400 bg-emerald-950/40 border border-emerald-500/30"
                      : "text-muted-foreground hover:text-foreground bg-white/[0.04] hover:bg-white/[0.08]"
                  )}
                >
                  {isSaved ? <Check className="h-2.5 w-2.5" /> : <Download className="h-2.5 w-2.5" />}
                  {isSaved ? "Saved" : "Save"}
                </button>
              ) : (
                showBuyButton &&
                !purchased && (
                  <button
                    type="button"
                    onClick={() => setBuyModalOpen(true)}
                    className="flex items-center gap-1 h-6 px-2 text-[10px] font-mono font-medium text-muted-foreground hover:text-foreground bg-white/[0.04] hover:bg-white/[0.08] rounded-md transition-colors cursor-pointer border border-transparent hover:border-white/10"
                  >
                    <ShoppingBag className="h-2.5 w-2.5" />
                    <span>${price.toFixed(2)}</span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Buy Master Modal */}
      {showBuyButton && (
        <BuyTrackModal
          track={track}
          open={buyModalOpen}
          onClose={() => setBuyModalOpen(false)}
        />
      )}
    </>
  );
}
