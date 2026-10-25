import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  MessageSquare,
  Sparkles,
  Heart,
  Play,
  Pause,
  ShoppingBag,
  Gift,
  Crown,
  Share2,
  TrendingUp,
  Flame,
  Send,
  Users,
  Radio,
  Disc3,
  Repeat,
  CheckCircle2,
} from "lucide-react";
import { usePlayer } from "@/lib/player";
import { useAuth } from "@/lib/auth";
import { tracks, artists } from "@/domain/music/catalog";
import { formatDuration, type Track } from "@/domain/music/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Community & Live Activity Pulse — Layam" },
      {
        name: "description",
        content: "Real-time stream of studio releases, fan patronage boosts, and audio discussions.",
      },
    ],
  }),
  component: FeedPage,
});

export type ActivityType = "all" | "releases" | "patronage" | "discussions" | "purchases";

export interface ActivityItem {
  id: string;
  type: "release" | "patronage" | "discussion" | "purchase";
  actorName: string;
  actorHandle?: string | undefined;
  actorAvatar: string;
  targetArtistName?: string | undefined;
  targetArtistId?: string | undefined;
  track?: Track | null | undefined;
  timestampSeconds?: number | undefined;
  commentText?: string | undefined;
  amountUsd?: number | undefined;
  timeAgo: string;
  likes: number;
  reposts: number;
}

const INITIAL_ACTIVITIES: ActivityItem[] = [
  {
    id: "act-1",
    type: "release",
    actorName: "Neon Drifter",
    actorHandle: "@neondrifter",
    actorAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
    track: tracks[0],
    timeAgo: "12m ago",
    likes: 48,
    reposts: 14,
  },
  {
    id: "act-2",
    type: "patronage",
    actorName: "Liam Sterling",
    actorAvatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80",
    targetArtistName: "Solana Siren",
    targetArtistId: "solana-siren",
    amountUsd: 25.0,
    commentText: "Your analog sound design in Phantom Waves is unmatched. Direct support!",
    timeAgo: "34m ago",
    likes: 22,
    reposts: 5,
  },
  {
    id: "act-3",
    type: "discussion",
    actorName: "Maya Lin",
    actorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
    track: tracks[1],
    timestampSeconds: 28,
    commentText: "The 96kHz dynamic range here is mind-blowing. No brickwall compression!",
    timeAgo: "1h ago",
    likes: 19,
    reposts: 3,
  },
  {
    id: "act-4",
    type: "purchase",
    actorName: "Kaelen Voss",
    actorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
    track: tracks[2],
    amountUsd: 1.49,
    timeAgo: "2h ago",
    likes: 31,
    reposts: 8,
  },
];

function FeedPage() {
  const { user } = useAuth();
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer();
  const [filter, setFilter] = useState<ActivityType>("all");
  const [activities, setActivities] = useState<ActivityItem[]>(INITIAL_ACTIVITIES);
  const [newPostText, setNewPostText] = useState("");
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  const filteredActivities = useMemo(() => {
    if (filter === "all") return activities;
    if (filter === "releases") return activities.filter((a) => a.type === "release");
    if (filter === "patronage") return activities.filter((a) => a.type === "patronage");
    if (filter === "discussions") return activities.filter((a) => a.type === "discussion");
    if (filter === "purchases") return activities.filter((a) => a.type === "purchase");
    return activities;
  }, [activities, filter]);

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim()) return;

    const newActivity: ActivityItem = {
      id: `act-${Date.now()}`,
      type: "discussion",
      actorName: user?.name || "Audiophile Listener",
      actorAvatar:
        user?.avatarUrl ||
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      commentText: newPostText.trim(),
      track: currentTrack || tracks[0],
      timeAgo: "Just now",
      likes: 1,
      reposts: 0,
    };

    setActivities((prev) => [newActivity, ...prev]);
    setNewPostText("");
    toast.success("Broadcasted update to Layam Community Feed!");
  };

  const handleLike = (id: string) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

    setActivities((prev) =>
      prev.map((a) => (a.id === id ? { ...a, likes: a.likes + (likedIds.has(id) ? -1 : 1) } : a)),
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-36 pt-24 sm:px-6 lg:px-8">
      {/* ── Page Header ── */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs mb-1">
            <Sparkles className="h-4 w-4" />
            <span className="uppercase tracking-wider">LIVE COMMUNITY PULSE</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Community & Activity Feed
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-xl">
            Real-time feed of master releases, fan patronage boosts, and audiophile conversations.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap rounded-full bg-surface-raised p-1.5 border border-border/40">
          {[
            { id: "all" as const, label: "All Activity" },
            { id: "releases" as const, label: "Releases" },
            { id: "patronage" as const, label: "Fan Boosts" },
            { id: "discussions" as const, label: "Reactions" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer",
                filter === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ── Main Feed Stream (8 Cols) ── */}
        <div className="lg:col-span-8 space-y-6">
          {/* Post Composer Box */}
          <form
            onSubmit={handlePost}
            className="rounded-3xl border border-border/60 bg-card p-5 shadow-lg backdrop-blur-xl space-y-3"
          >
            <div className="flex items-start gap-3">
              <img
                src={
                  user?.avatarUrl ||
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                }
                alt="Avatar"
                className="h-10 w-10 rounded-full object-cover border border-border/60"
              />
              <Input
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                placeholder="Share a listening reaction or drop an update to the community..."
                className="rounded-2xl bg-surface text-xs h-12 border-border/60 focus-visible:ring-primary/40"
              />
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-border/30">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                {currentTrack ? (
                  <>
                    <Disc3 className="h-3.5 w-3.5 text-primary animate-spin" />
                    <span>Listening to: <strong>{currentTrack.title}</strong></span>
                  </>
                ) : (
                  <span>Broadcast to all Layam audiophiles</span>
                )}
              </span>

              <Button
                type="submit"
                size="sm"
                disabled={!newPostText.trim()}
                className="rounded-full bg-primary text-primary-foreground font-bold text-xs h-8 px-4 cursor-pointer gap-1.5"
              >
                <Send className="h-3.5 w-3.5" /> Post
              </Button>
            </div>
          </form>

          {/* Activity Cards List */}
          <div className="space-y-4">
            {filteredActivities.map((act) => {
              const isItemPlaying =
                isPlaying && currentTrack && act.track && currentTrack.id === act.track.id;

              return (
                <div
                  key={act.id}
                  className="rounded-3xl border border-border/50 bg-card p-6 shadow-md transition-all hover:border-primary/30 space-y-4"
                >
                  {/* Card Top Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={act.actorAvatar}
                        alt={act.actorName}
                        className="h-10 w-10 rounded-2xl object-cover border border-border/60 shadow-sm"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-foreground">{act.actorName}</span>
                          {act.actorHandle && (
                            <span className="text-xs text-muted-foreground">{act.actorHandle}</span>
                          )}
                          {act.type === "release" && (
                            <Badge className="bg-primary/15 text-primary border-primary/30 text-[9px] font-mono font-bold px-1.5 py-0">
                              NEW RELEASE
                            </Badge>
                          )}
                          {act.type === "patronage" && (
                            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[9px] font-mono font-bold px-1.5 py-0">
                              FAN BOOST
                            </Badge>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground">{act.timeAgo}</span>
                      </div>
                    </div>

                    {act.amountUsd && (
                      <span className="font-mono text-sm font-extrabold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                        +${act.amountUsd.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {/* Comment / Note text if present */}
                  {act.commentText && (
                    <p className="text-xs text-foreground/90 leading-relaxed bg-surface-raised/60 p-3 rounded-2xl border border-border/30">
                      "{act.commentText}"
                    </p>
                  )}

                  {/* Embedded Track Release Showcase */}
                  {act.track && (
                    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-surface/80 p-3.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative h-12 w-12 rounded-xl overflow-hidden shrink-0 border border-white/10">
                          <img
                            src={act.track.coverImage}
                            alt={act.track.title}
                            className="h-full w-full object-cover"
                          />
                          <button
                            onClick={() => {
                              if (isItemPlaying) togglePlay();
                              else playTrack(act.track!);
                            }}
                            className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            {isItemPlaying ? (
                              <Pause className="h-5 w-5 fill-current" />
                            ) : (
                              <Play className="h-5 w-5 fill-current ml-0.5" />
                            )}
                          </button>
                        </div>

                        <div className="min-w-0">
                          <Link
                            to="/track/$id"
                            params={{ id: act.track.id }}
                            className="text-xs font-bold text-foreground hover:text-primary transition-colors truncate block"
                          >
                            {act.track.title}
                          </Link>
                          <span className="text-[11px] text-muted-foreground block truncate">
                            {act.track.artistName}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] font-bold border-primary/40 text-primary px-2"
                        >
                          {act.track.quality}
                        </Badge>
                        <Button
                          size="sm"
                          onClick={() => {
                            if (isItemPlaying) togglePlay();
                            else playTrack(act.track!);
                          }}
                          className="rounded-full h-8 px-3 text-xs font-bold gap-1 bg-primary text-primary-foreground cursor-pointer"
                        >
                          {isItemPlaying ? (
                            <Pause className="h-3 w-3 fill-current" />
                          ) : (
                            <Play className="h-3 w-3 fill-current" />
                          )}
                          {isItemPlaying ? "Pause" : "Play"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Card Bottom Social Actions */}
                  <div className="flex items-center justify-between border-t border-border/30 pt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleLike(act.id)}
                        className={cn(
                          "flex items-center gap-1.5 transition-colors cursor-pointer",
                          likedIds.has(act.id)
                            ? "text-rose-400 font-bold"
                            : "hover:text-foreground",
                        )}
                      >
                        <Heart
                          className={cn("h-4 w-4", likedIds.has(act.id) && "fill-current")}
                        />
                        <span className="font-mono text-[11px]">{act.likes}</span>
                      </button>

                      <button
                        onClick={() => toast.success("Shared activity link to clipboard!")}
                        className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
                      >
                        <Repeat className="h-4 w-4" />
                        <span className="font-mono text-[11px]">{act.reposts}</span>
                      </button>
                    </div>

                    <span className="font-mono text-[10px] text-muted-foreground/60">
                      ID: {act.id}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Sidebar: Trending Creators & Top Patrons (4 Cols) ── */}
        <div className="lg:col-span-4 space-y-6">
          {/* Trending Creators Card */}
          <div className="rounded-3xl border border-border/50 bg-card p-6 shadow-lg">
            <div className="flex items-center gap-2 text-primary font-bold text-xs mb-4">
              <Flame className="h-4 w-4 text-orange" />
              <span className="uppercase tracking-wider">TOP TRENDING ARTISTS</span>
            </div>

            <div className="space-y-4">
              {artists.map((art, idx) => (
                <div key={art.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-muted-foreground w-4">
                      0{idx + 1}
                    </span>
                    <img
                      src={art.avatar}
                      alt={art.name}
                      className="h-10 w-10 rounded-full object-cover border border-border/60"
                    />
                    <div>
                      <Link
                        to="/artist/$id"
                        params={{ id: art.id }}
                        className="text-xs font-bold text-foreground hover:text-primary transition-colors block"
                      >
                        {art.name}
                      </Link>
                      <span className="text-[10px] text-muted-foreground">{art.handle}</span>
                    </div>
                  </div>

                  <Link to="/artist/$id" params={{ id: art.id }}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] font-bold rounded-full border-border/60"
                    >
                      View
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Platform Community Stats */}
          <div className="rounded-3xl border border-border/50 bg-surface-raised p-6 space-y-3">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Network Vital Statistics
            </h4>
            <div className="grid grid-cols-2 gap-3 pt-1 text-xs font-mono">
              <div className="rounded-2xl bg-card p-3 border border-border/40">
                <span className="text-[10px] text-muted-foreground block">Creator Share</span>
                <span className="font-extrabold text-emerald-400 text-base">85% Direct</span>
              </div>
              <div className="rounded-2xl bg-card p-3 border border-border/40">
                <span className="text-[10px] text-muted-foreground block">Audio Standard</span>
                <span className="font-extrabold text-primary text-base">24-Bit / 96k</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
