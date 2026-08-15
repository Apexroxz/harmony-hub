import { useState, useMemo, useEffect } from "react";
import { MessageSquare, Heart, Send, Sparkles, Play, Clock } from "lucide-react";
import { formatDuration, type Track } from "@/domain/music/types";
import { usePlayer } from "@/lib/player";
import { useAuth } from "@/lib/auth";
import {
  getCommentsForTrack,
  addCommentToTrack,
  likeTrackComment,
  type TrackComment,
} from "@/lib/comments";
import { Waveform } from "@/components/Waveform";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WaveformCommentsProps {
  track: Track;
}

export function WaveformComments({ track }: WaveformCommentsProps) {
  const { user } = useAuth();
  const { currentTrack, currentTime, duration, progress, isPlaying, playTrack, seek } =
    usePlayer();

  const isCurrent = currentTrack?.id === track.id;
  const trackDuration = duration || track.duration || 180;
  const activeCurrentTime = isCurrent ? currentTime : 0;
  const activeProgress = isCurrent ? progress : 0;

  const [comments, setComments] = useState<TrackComment[]>(() => getCommentsForTrack(track.id));
  const [commentText, setCommentText] = useState("");
  const [hoveredComment, setHoveredComment] = useState<TrackComment | null>(null);

  // Sync comments if track changes
  useEffect(() => {
    setComments(getCommentsForTrack(track.id));
  }, [track.id]);

  // Find currently active popup comment matching the playback time
  const activePopupComment = useMemo(() => {
    if (!isCurrent || !isPlaying) return null;
    return comments.find((c) => Math.abs(activeCurrentTime - c.timestampSeconds) <= 1.8) ?? null;
  }, [comments, isCurrent, isPlaying, activeCurrentTime]);

  const handleSeekToTimestamp = (seconds: number) => {
    if (!isCurrent) {
      playTrack(track);
    }
    seek(seconds / trackDuration);
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const postTimestamp = isCurrent ? activeCurrentTime : 0;
    const authorName = user?.name || "Audiophile Listener";
    const authorAvatar =
      user?.avatarUrl ||
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80";

    const newComment = addCommentToTrack(
      track.id,
      postTimestamp,
      commentText.trim(),
      authorName,
      authorAvatar,
    );

    setComments((prev) =>
      [...prev, newComment].sort((a, b) => a.timestampSeconds - b.timestampSeconds),
    );
    setCommentText("");
    toast.success(`Comment pinned at ${formatDuration(postTimestamp)}!`);
  };

  const handleLike = (commentId: string) => {
    likeTrackComment(track.id, commentId);
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, likes: c.likes + 1 } : c)),
    );
  };

  return (
    <div className="space-y-6">
      {/* ── Interactive Waveform with Timestamp Pins ── */}
      <div className="relative rounded-3xl border border-border/50 bg-card/80 p-6 backdrop-blur-xl shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Waveform Timeline · {comments.length} Timestamped Reactions
            </span>
          </div>
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {formatDuration(activeCurrentTime)} / {formatDuration(trackDuration)}
          </span>
        </div>

        {/* Waveform Scrubber Box */}
        <div className="relative h-14 w-full my-4 flex items-center">
          <Waveform
            seed={track.id}
            peaks={track.waveform}
            progress={activeProgress}
            onSeek={(pct) => {
              if (!isCurrent) playTrack(track);
              seek(pct);
            }}
            className="h-12 w-full"
          />

          {/* Timestamped Avatar Comment Pins */}
          {comments.map((c) => {
            const leftPercent = Math.min(100, Math.max(0, (c.timestampSeconds / trackDuration) * 100));
            const isPinActive = activePopupComment?.id === c.id;

            return (
              <div
                key={c.id}
                style={{ left: `${leftPercent}%` }}
                onMouseEnter={() => setHoveredComment(c)}
                onMouseLeave={() => setHoveredComment(null)}
                onClick={() => handleSeekToTimestamp(c.timestampSeconds)}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group cursor-pointer z-20"
              >
                <div
                  className={cn(
                    "h-6 w-6 rounded-full border-2 overflow-hidden shadow-lg transition-transform duration-200",
                    isPinActive
                      ? "border-primary scale-125 ring-4 ring-primary/30"
                      : "border-white/80 hover:scale-115 hover:border-primary",
                  )}
                >
                  <img
                    src={c.userAvatar}
                    alt={c.userName}
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* Hover Tooltip Preview */}
                <div className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30 min-w-[160px] max-w-[240px] rounded-2xl border border-border/80 bg-background/95 p-2.5 text-left shadow-2xl backdrop-blur-md">
                  <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground mb-1">
                    <span className="text-foreground truncate">{c.userName}</span>
                    <span className="font-mono text-primary">{formatDuration(c.timestampSeconds)}</span>
                  </div>
                  <p className="text-xs text-foreground/90 line-clamp-2 leading-tight">
                    {c.content}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Broadcast Floating Comment Card while Playing */}
        {activePopupComment && (
          <div className="mt-2 flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <img
              src={activePopupComment.userAvatar}
              alt={activePopupComment.userName}
              className="h-8 w-8 rounded-full border border-primary/50 object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-foreground truncate">
                  {activePopupComment.userName}
                </span>
                <Badge className="bg-primary/20 text-primary border-primary/30 text-[9px] font-mono px-1.5 py-0">
                  {formatDuration(activePopupComment.timestampSeconds)}
                </Badge>
              </div>
              <p className="text-xs text-foreground/90 truncate mt-0.5">
                {activePopupComment.content}
              </p>
            </div>
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
          </div>
        )}

        {/* Add Timestamped Comment Form */}
        <form onSubmit={handlePostComment} className="mt-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={`Drop a reaction at ${formatDuration(activeCurrentTime)}...`}
              className="rounded-full bg-surface-raised pl-4 pr-20 text-xs border-border/60 focus-visible:ring-primary/40 h-10"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
              {formatDuration(activeCurrentTime)}
            </span>
          </div>

          <Button
            type="submit"
            size="sm"
            disabled={!commentText.trim()}
            className="rounded-full bg-primary text-primary-foreground font-bold text-xs h-10 px-4 cursor-pointer gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Post</span>
          </Button>
        </form>
      </div>

      {/* ── Chronological Comment Stream ── */}
      <div className="rounded-3xl border border-border/40 bg-card p-6">
        <h4 className="text-sm font-bold text-foreground mb-4">
          All Listener Comments ({comments.length})
        </h4>

        {comments.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No reactions dropped yet. Be the first to pin a comment to the waveform!
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="flex items-start justify-between py-3.5 gap-3 group transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <img
                    src={comment.userAvatar}
                    alt={comment.userName}
                    className="h-8 w-8 rounded-full border border-border/60 object-cover shrink-0 mt-0.5"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">{comment.userName}</span>
                      <button
                        onClick={() => handleSeekToTimestamp(comment.timestampSeconds)}
                        className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-full border border-primary/20 transition-colors cursor-pointer"
                        title="Seek playback to this timestamp"
                      >
                        <Play className="h-2.5 w-2.5 fill-current" />
                        {formatDuration(comment.timestampSeconds)}
                      </button>
                      <span className="text-[10px] text-muted-foreground">{comment.createdAt}</span>
                    </div>
                    <p className="text-xs text-foreground/90 mt-1 leading-relaxed break-words">
                      {comment.content}
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleLike(comment.id)}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-rose-400 gap-1 rounded-full shrink-0"
                >
                  <Heart className="h-3 w-3 fill-current opacity-60 group-hover:opacity-100" />
                  <span className="font-mono text-[10px]">{comment.likes}</span>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
