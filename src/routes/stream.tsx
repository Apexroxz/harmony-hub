import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Heart, Play, Pause, Repeat2, Radio, UploadCloud, ListPlus, Share2 } from "lucide-react";
import { useLibrary } from "@/lib/library";
import { usePlayer } from "@/lib/player";
import { formatDuration, formatNumber, type Track } from "@/domain/music/types";
import { FeedSkeleton, LoadError, EmptyState } from "@/components/CatalogState";
import { useOwnership } from "@/hooks/useOwnership";
import { QualityBadge } from "@/components/QualityBadge";
import { Waveform } from "@/components/Waveform";
import { ArtistAvatar, ArtistName } from "@/components/ArtistAvatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/stream")({
  head: () => ({
    meta: [
      { title: "Your Stream — SonicChain" },
      {
        name: "description",
        content: "The newest uploads and reposts from the artists you follow, in lossless quality.",
      },
      { property: "og:title", content: "Your Stream — SonicChain" },
      {
        property: "og:description",
        content: "The newest uploads and reposts from the artists you follow, in lossless quality.",
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

  return (
    <div className="mx-auto max-w-3xl px-4 pb-40 pt-24 sm:px-6 sm:pt-28 lg:px-8">
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mb-10 flex flex-wrap items-end justify-between gap-6"
      >
        <div>
          <div className="flex items-center gap-2 text-primary">
            <Radio className="h-4 w-4" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em]">
              Your stream
            </span>
          </div>
          <h1 className="mt-3 text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
            Latest from
            <br />
            <span className="text-gradient">your feed</span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
            New uploads and reposts, newest first — mastered audio, straight from the artists.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              const first = allTracks[0];
              if (first) playTrack(first, allTracks);
            }}
            className="rounded-full border-border/60"
          >
            <Play className="mr-2 h-4 w-4 fill-current" />
            Play all
          </Button>
          <Button asChild className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
            <Link to="/upload">
              <UploadCloud className="mr-2 h-4 w-4" />
              Upload
            </Link>
          </Button>
        </div>
      </motion.header>

      {isLoading ? (
        <FeedSkeleton />
      ) : error ? (
        <LoadError message="We couldn't load your stream." onRetry={refetch} />
      ) : allTracks.length === 0 ? (
        <EmptyState
          title="Nothing in your stream yet"
          hint="Upload a track to get the feed moving."
        />
      ) : (
        <div className="flex flex-col gap-4 sm:gap-5">
          {allTracks.map((track, i) => (
            <FeedItem
              key={track.id}
              track={track}
              index={i}
              queue={allTracks}
              liked={likedIds.includes(track.id)}
              reposted={repostedIds.includes(track.id)}
              repostCount={repostCounts[track.id] ?? 0}
              onLike={() => toggleLike(track.id)}
              onRepost={() => toggleRepost(track.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface FeedItemProps {
  track: Track;
  index: number;
  queue: Track[];
  liked: boolean;
  reposted: boolean;
  repostCount: number;
  onLike: () => void;
  onRepost: () => void;
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
}: FeedItemProps) {
  const { playTrack, togglePlay, currentTrack, isPlaying, progress, seek, addToQueue } = usePlayer();
  const { locked } = useOwnership(track.id);
  const isCurrent = currentTrack?.id === track.id;
  const active = isCurrent && isPlaying;

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.05, 0.3), ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-border/50 bg-card/70 p-4 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:bg-card sm:p-5",
        isCurrent && "border-primary/50 shadow-[0_0_40px_var(--color-glow-soft)]"
      )}
    >
      <div className="flex items-center gap-3">
        <ArtistAvatar artistId={track.artistId} name={track.artistName} size="sm" />
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <ArtistName artistId={track.artistId} name={track.artistName} className="text-sm" />
          <span>
            {track.uploaderId ? "uploaded" : "posted"} · {relativeDate(track.createdAt)}
          </span>
        </div>
      </div>

      <div className="mt-4 flex gap-4 sm:gap-5">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl sm:h-28 sm:w-28">
          <img
            src={track.coverImage}
            alt={`${track.title} cover art`}
            width={224}
            height={224}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <motion.div whileTap={{ scale: 0.9 }} className="absolute inset-0 flex items-center justify-center">
            <Button
              size="icon"
              disabled={locked}
              aria-label={active ? `Pause ${track.title}` : `Play ${track.title}`}
              onClick={() => (isCurrent ? togglePlay() : playTrack(track, queue))}
              className={cn(
                "h-11 w-11 rounded-full bg-primary text-primary-foreground shadow-[0_0_24px_var(--color-glow)] transition-all duration-300 hover:bg-primary/90",
                active ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
              )}
            >
              {active ? (
                <Pause className="h-5 w-5 fill-current" />
              ) : (
                <Play className="h-5 w-5 fill-current" />
              )}
            </Button>
          </motion.div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <Link
            to="/track/$id"
            params={{ id: track.id }}
            className="block truncate text-lg font-semibold tracking-tight text-foreground transition-colors hover:text-primary sm:text-xl"
          >
            {track.title}
          </Link>

          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-surface-raised px-2 py-0.5">{track.genre}</span>
            <QualityBadge spec={track} withIcon />
            <span className="font-mono">{formatDuration(track.duration)}</span>
          </div>

          {/* Waveform: static bar until hover / playing */}
          <div className="relative mt-3 h-10">
            <div
              className={cn(
                "absolute inset-0 transition-opacity duration-300",
                isCurrent ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
            >
              <Waveform
                seed={track.id}
                peaks={track.waveform}
                progress={isCurrent ? progress : 0}
                bars={56}
                onSeek={isCurrent ? seek : undefined}
              />
            </div>
            <div
              className={cn(
                "absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-muted/40 transition-opacity duration-300",
                isCurrent ? "opacity-0" : "opacity-100 group-hover:opacity-0"
              )}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                style={{ width: `${isCurrent ? progress : 0}%` }}
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <button
              onClick={onLike}
              aria-label="Like track"
              className={cn(
                "flex items-center gap-1.5 transition-colors hover:text-primary",
                liked && "text-primary"
              )}
            >
              <motion.span whileTap={{ scale: 1.3 }} className="inline-flex">
                <Heart className={cn("h-4 w-4", liked && "fill-current")} />
              </motion.span>
              {formatNumber(track.likes + (liked ? 1 : 0))}
            </button>
            <button
              onClick={onRepost}
              aria-label="Repost track"
              className={cn(
                "flex items-center gap-1.5 transition-colors hover:text-primary",
                reposted && "text-primary"
              )}
            >
              <Repeat2 className="h-4 w-4" />
              {formatNumber(repostCount + (reposted ? 1 : 0))}
            </button>
            <button
              onClick={() => addToQueue(track)}
              aria-label="Add to queue"
              className="flex items-center gap-1.5 transition-colors hover:text-primary"
            >
              <ListPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Queue</span>
            </button>
            <span className="hidden items-center gap-1.5 sm:flex">
              <Share2 className="h-3.5 w-3.5" />
              {formatNumber(track.playCount)} plays
            </span>
            {active && <span className="font-medium text-primary">Now playing</span>}
          </div>
        </div>
      </div>
    </motion.article>
  );
}
