import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Heart,
  Play,
  Pause,
  Repeat2,
  Radio,
  UploadCloud,
  ListPlus,
  Share2,
  Sparkles,
  ShoppingBag,
  Crown,
  Flame,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLibrary } from "@/lib/library";
import { usePlayer } from "@/lib/player";
import { formatDuration, formatNumber, type Track } from "@/domain/music/types";
import { FeedSkeleton, LoadError, EmptyState } from "@/components/CatalogState";
import { useOwnership } from "@/hooks/useOwnership";
import { QualityBadge } from "@/components/QualityBadge";
import { Waveform } from "@/components/Waveform";
import { ArtistAvatar, ArtistName } from "@/components/ArtistAvatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/stream")({
  head: () => ({
    meta: [
      { title: "Community Feed — Layam" },
      {
        name: "description",
        content: "Discover real-time drops, community fan activity, and lossless releases from creators.",
      },
      { property: "og:title", content: "Community Feed — Layam" },
      {
        property: "og:description",
        content: "Discover real-time drops, community fan activity, and lossless releases from creators.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StreamPage,
});

function relativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const days = Math.round((Date.now() - then) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  return months <= 1 ? "1 month ago" : `${months} months ago`;
}

type FeedFilter = "all" | "releases" | "purchases" | "exclusive";

function StreamPage() {
  const {
    allTracks,
    likedIds,
    repostedIds,
    toggleLike,
    toggleRepost,
    repostCounts,
    isLoading,
    error,
    refetch,
  } = useLibrary();
  const { playTrack } = usePlayer();
  const [filter, setFilter] = useState<FeedFilter>("all");

  const filteredTracks = allTracks.filter((track) => {
    if (filter === "releases") return true;
    if (filter === "purchases") return track.monetized || track.price;
    if (filter === "exclusive") return track.quality === "FLAC" || track.quality === "WAV";
    return true;
  });

  return (
    <div className="mx-auto max-w-3xl px-4 pb-40 pt-24 sm:px-6 sm:pt-28 lg:px-8">
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8 flex flex-wrap items-end justify-between gap-6"
      >
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider mb-1">
            <Radio className="h-4 w-4" />
            <span>Live Network</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Community Feed
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time lossless master drops, collector sales, and independent creator updates.
          </p>
        </div>

        <div className="flex gap-2">
          {allTracks.length > 0 && (
            <Button
              onClick={() => playTrack(allTracks[0], allTracks)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2 text-xs"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Play Stream
            </Button>
          )}
          <Button asChild variant="outline" className="border-border/60 text-xs">
            <Link to="/upload">
              <UploadCloud className="mr-1.5 h-3.5 w-3.5" />
              Post Track
            </Link>
          </Button>
        </div>
      </motion.header>

      {/* Feed Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 border-b border-border/40">
        {[
          { id: "all", label: "All Activity", icon: Flame },
          { id: "releases", label: "Master Drops", icon: Sparkles },
          { id: "purchases", label: "Store Activity", icon: ShoppingBag },
          { id: "exclusive", label: "Lossless Only", icon: Crown },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={filter === tab.id ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(tab.id as FeedFilter)}
            className={cn(
              "text-xs font-semibold gap-1.5 rounded-full",
              filter === tab.id
                ? "bg-primary text-primary-foreground"
                : "border-border/60 bg-glass text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <FeedSkeleton count={4} />
      ) : error ? (
        <LoadError
          message="We couldn't load the community feed."
          onRetry={() => refetch()}
        />
      ) : filteredTracks.length === 0 ? (
        <EmptyState
          title="No activity yet"
          description="Follow artists or post your first track to see live updates in the feed."
          actionLabel="Explore Store"
          actionTo="/store"
        />
      ) : (
        <ul className="space-y-6">
          {filteredTracks.map((track, i) => (
            <FeedItem
              key={track.id}
              track={track}
              index={i}
              queue={filteredTracks}
              liked={likedIds.includes(track.id)}
              reposted={repostedIds.includes(track.id)}
              repostCount={repostCounts[track.id] ?? 0}
              onLike={() => toggleLike(track.id)}
              onRepost={() => toggleRepost(track.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function FeedItem({
  track,
  index,
  queue,
  liked,
  reposted,
  repostCount,
  onLike,
  onRepost,
}: {
  track: Track;
  index: number;
  queue: Track[];
  liked: boolean;
  reposted: boolean;
  repostCount: number;
  onLike: () => void;
  onRepost: () => void;
}) {
  const { playTrack, togglePlay, currentTrack, isPlaying, progress, seek, addToQueue } = usePlayer();
  const { isLocked } = useOwnership(track.id);
  const isCurrent = currentTrack?.id === track.id;

  const handleShare = () => {
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(`${window.location.origin}/track/${track.id}`);
      toast.success("Link copied to clipboard!");
    }
  };

  return (
    <motion.li
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3) }}
      className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card p-5 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
    >
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <ArtistAvatar artistId={track.artistId} name={track.artistName} />
          <div>
            <ArtistName artistId={track.artistId} name={track.artistName} />
            <p className="text-[11px] text-muted-foreground">
              Published a {track.quality} release · {relativeDate(track.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <QualityBadge spec={track} />
          {track.monetized && (
            <Badge className="bg-primary/10 text-primary text-[10px] border border-primary/30">
              ${(track.price ?? 0).toFixed(2)} Store
            </Badge>
          )}
        </div>
      </div>

      {/* Main Track Row */}
      <div className="flex gap-4 items-center">
        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-muted">
          <img
            src={track.coverImage}
            alt={track.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
          <button
            onClick={() => (isCurrent ? togglePlay() : playTrack(track, queue))}
            className="absolute inset-0 flex items-center justify-center bg-black/40 text-white transition-opacity hover:bg-black/60"
            aria-label={isCurrent && isPlaying ? "Pause" : "Play"}
          >
            {isCurrent && isPlaying ? (
              <Pause className="h-7 w-7 fill-current" />
            ) : (
              <Play className="h-7 w-7 fill-current ml-0.5" />
            )}
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <Link
            to="/track/$id"
            params={{ id: track.id }}
            className="block truncate font-bold text-foreground hover:text-primary transition-colors text-base"
          >
            {track.title}
          </Link>
          <p className="text-xs text-muted-foreground mt-0.5">
            {track.genre} · {formatDuration(track.duration)} · {formatNumber(track.playCount)} streams
          </p>

          {/* Interactive Waveform / progress */}
          <div className="mt-2">
            {isCurrent ? (
              <Waveform
                peaks={track.waveform ?? []}
                progress={progress}
                onSeek={seek}
                className="h-8"
              />
            ) : (
              <div className="h-2 w-full rounded-full bg-surface-raised overflow-hidden">
                <div className="h-full bg-primary/20 w-1/3" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <button
            onClick={onLike}
            className={cn(
              "flex items-center gap-1.5 transition-colors hover:text-rose-400",
              liked && "text-rose-500 font-semibold"
            )}
          >
            <Heart className={cn("h-4 w-4", liked && "fill-current")} />
            <span>{formatNumber(track.likes + (liked ? 1 : 0))}</span>
          </button>

          <button
            onClick={onRepost}
            className={cn(
              "flex items-center gap-1.5 transition-colors hover:text-emerald-400",
              reposted && "text-emerald-400 font-semibold"
            )}
          >
            <Repeat2 className="h-4 w-4" />
            <span>{formatNumber(repostCount + (reposted ? 1 : 0))}</span>
          </button>

          <button
            onClick={() => {
              addToQueue(track);
              toast.success(`"${track.title}" added to queue`);
            }}
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <ListPlus className="h-4 w-4" />
            <span>Queue</span>
          </button>
        </div>

        <button
          onClick={handleShare}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <Share2 className="h-3.5 w-3.5" />
          <span>Share</span>
        </button>
      </div>
    </motion.li>
  );
}
