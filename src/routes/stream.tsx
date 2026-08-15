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
  Activity,
  Disc3,
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
      { title: "Live Lossless Feed — Layam" },
      {
        name: "description",
        content:
          "Discover real-time drops, community fan activity, and 24-bit master releases from independent creators.",
      },
      { property: "og:title", content: "Live Lossless Feed — Layam" },
      {
        property: "og:description",
        content:
          "Discover real-time drops, community fan activity, and 24-bit master releases from independent creators.",
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
    <div className="mx-auto max-w-4xl px-4 pb-40 pt-24 sm:px-6 sm:pt-28 lg:px-8">
      {/* ── Top Elevated Master Feed Banner ── */}
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8 rounded-[2rem] border border-white/[0.08] bg-gradient-to-b from-[#141518] to-[#0c0d0f] p-6 sm:p-8 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative overflow-hidden"
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative z-10 flex flex-wrap items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-mono font-bold text-primary tracking-wider uppercase">
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              <span>Direct Master Network · Real-Time Lossless Feed</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              Live Stream Pulse
            </h1>
            <p className="max-w-xl text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Real-time 24-bit master drops, transparent artist purchases, and high-fidelity
              community activity streamed straight from studio mixing desks.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {allTracks.length > 0 && allTracks[0] && (
              <Button
                onClick={() => playTrack(allTracks[0]!, allTracks)}
                className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-extrabold gap-2 text-xs h-10 px-5 shadow-xl shadow-primary/25 cursor-pointer tap-active"
              >
                <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                Play All Masters
              </Button>
            )}
            <Button
              asChild
              variant="outline"
              className="rounded-full border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-xs h-10 px-5 font-bold text-foreground"
            >
              <Link to="/upload">
                <UploadCloud className="mr-1.5 h-3.5 w-3.5 text-primary" />
                Post Master
              </Link>
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Feed Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 border-b border-white/[0.06]">
        {[
          { id: "all", label: "All Master Activity", icon: Flame },
          { id: "releases", label: "Studio Drops", icon: Sparkles },
          { id: "purchases", label: "Store Activity", icon: ShoppingBag },
          { id: "exclusive", label: "24-Bit FLAC/WAV", icon: Crown },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={filter === tab.id ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(tab.id as FeedFilter)}
            className={cn(
              "text-xs font-bold gap-1.5 rounded-full h-9 px-4 transition-all cursor-pointer tap-active",
              filter === tab.id
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "border-white/[0.08] bg-[#121316] text-muted-foreground hover:text-foreground hover:bg-white/[0.05]",
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
        <LoadError message="We couldn't load the community feed." onRetry={() => refetch()} />
      ) : filteredTracks.length === 0 ? (
        <EmptyState
          title="No activity yet"
          hint="Follow artists or post your first track to see live updates in the feed."
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
  const { playTrack, togglePlay, currentTrack, isPlaying, progress, seek, addToQueue } =
    usePlayer();
  const { locked } = useOwnership(track.id);
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
      className={cn(
        "group relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#121316]/90 p-6 transition-all duration-500 hover:border-primary/40 hover:bg-[#15171b] hover:shadow-[0_15px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl",
        isCurrent && "border-primary/50 ring-1 ring-primary/20 shadow-[0_0_30px_rgba(255,107,0,0.1)]",
      )}
    >
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <ArtistAvatar artistId={track.artistId} name={track.artistName} />
          <div>
            <ArtistName artistId={track.artistId} name={track.artistName} />
            <p className="text-[11px] text-muted-foreground font-mono">
              Published a {track.quality} master · {relativeDate(track.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <QualityBadge spec={track} />
          {track.monetized && (
            <Badge className="bg-primary/10 text-primary text-[10px] font-mono font-bold border border-primary/30 px-2 py-0.5">
              ${(track.price ?? 0).toFixed(2)} Store
            </Badge>
          )}
        </div>
      </div>

      {/* Main Track Row with Tactile Vinyl Micro-disc and Waveform */}
      <div className="flex gap-5 items-center">
        {/* Cover Art with Vinyl Slide Out on Hover */}
        <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl bg-[#080808] border border-white/[0.08] shadow-lg">
          <img
            src={track.coverImage}
            alt={track.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <button
            onClick={() => (isCurrent ? togglePlay() : playTrack(track, queue))}
            className="absolute inset-0 flex items-center justify-center bg-black/50 text-white transition-all hover:bg-black/65 cursor-pointer tap-active"
            aria-label={isCurrent && isPlaying ? "Pause" : "Play"}
          >
            {isCurrent && isPlaying ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                <Pause className="h-5 w-5 fill-current" />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                <Play className="h-5 w-5 fill-current ml-0.5" />
              </div>
            )}
          </button>
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <Link
            to="/track/$id"
            params={{ id: track.id }}
            className="block truncate font-extrabold text-foreground hover:text-primary transition-colors text-base sm:text-lg tracking-tight"
          >
            {track.title}
          </Link>
          <p className="text-xs text-muted-foreground font-medium">
            {track.genre} · {formatDuration(track.duration)} · {formatNumber(track.playCount)}{" "}
            streams
          </p>

          {/* Interactive Waveform / progress */}
          <div className="pt-1">
            {isCurrent ? (
              <Waveform
                peaks={track.waveform ?? []}
                progress={progress}
                onSeek={seek}
                className="h-9"
              />
            ) : (
              <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full bg-primary/30 w-1/4 rounded-full" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-5 pt-3.5 border-t border-white/[0.06] flex items-center justify-between text-xs text-muted-foreground font-semibold">
        <div className="flex items-center gap-5">
          <button
            onClick={onLike}
            className={cn(
              "flex items-center gap-1.5 transition-colors hover:text-rose-400 cursor-pointer tap-active",
              liked && "text-rose-500 font-bold",
            )}
          >
            <Heart className={cn("h-4 w-4", liked && "fill-current")} />
            <span>{formatNumber(track.likes + (liked ? 1 : 0))}</span>
          </button>

          <button
            onClick={onRepost}
            className={cn(
              "flex items-center gap-1.5 transition-colors hover:text-emerald-400 cursor-pointer tap-active",
              reposted && "text-emerald-400 font-bold",
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
            className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer tap-active"
          >
            <ListPlus className="h-4 w-4" />
            <span>Queue</span>
          </button>
        </div>

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer tap-active"
        >
          <Share2 className="h-3.5 w-3.5" />
          <span>Share Master</span>
        </button>
      </div>
    </motion.li>
  );
}
