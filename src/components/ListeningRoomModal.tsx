import { useState, useEffect, useRef } from "react";
import {
  Users,
  Radio,
  Sparkles,
  Play,
  Pause,
  ThumbsUp,
  MessageSquare,
  Send,
  Plus,
  Flame,
  Zap,
  Heart,
  Crown,
  Share2,
  Lock,
  Volume2,
  Disc3,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { usePlayer } from "@/lib/player";
import { useAuth } from "@/lib/auth";
import { tracks } from "@/domain/music/catalog";
import { formatDuration, type Track } from "@/domain/music/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface RoomParticipant {
  id: string;
  name: string;
  avatar: string;
  isHost?: boolean;
  color?: string;
}

export interface ChatMessage {
  id: string;
  userName: string;
  avatar: string;
  text: string;
  timeAgo: string;
  isDj?: boolean;
}

export interface QueueCandidate {
  track: Track;
  votes: number;
  votedByMe?: boolean;
}

export interface ListeningRoomData {
  id: string;
  title: string;
  djName: string;
  djAvatar: string;
  genre: string;
  listenersCount: number;
  currentTrack: Track;
  isPrivate?: boolean;
  qualityBadge: string;
}

const INITIAL_CHAT: ChatMessage[] = [
  {
    id: "c-1",
    userName: "Solana Siren",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    text: "Welcome everyone to the 24-bit Synthwave room! Turn on 3D spatial for maximum depth.",
    timeAgo: "2m ago",
    isDj: true,
  },
  {
    id: "c-2",
    userName: "Alex Vance",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
    text: "The transient punch on this kick drum is insane.",
    timeAgo: "1m ago",
  },
  {
    id: "c-3",
    userName: "Elena R.",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
    text: "Just upvoted Phantom Waves for the next track!",
    timeAgo: "Just now",
  },
];

const INITIAL_QUEUE_VOTES: QueueCandidate[] = [
  { track: tracks[1] || tracks[0]!, votes: 14, votedByMe: false },
  { track: tracks[2] || tracks[0]!, votes: 9, votedByMe: false },
  { track: tracks[3] || tracks[0]!, votes: 6, votedByMe: false },
];

interface ListeningRoomModalProps {
  room: ListeningRoomData | null;
  open: boolean;
  onClose: () => void;
}

export function ListeningRoomModal({ room, open, onClose }: ListeningRoomModalProps) {
  const { user } = useAuth();
  const { isPlaying, playTrack, togglePlay } = usePlayer();
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_CHAT);
  const [chatInput, setChatInput] = useState("");
  const [queueVotes, setQueueVotes] = useState<QueueCandidate[]>(INITIAL_QUEUE_VOTES);
  const [flyingEmojis, setFlyingEmojis] = useState<{ id: number; emoji: string; x: number }[]>([]);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  if (!room) return null;

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      userName: user?.name || "Audiophile Listener",
      avatar:
        user?.avatarUrl ||
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      text: chatInput.trim(),
      timeAgo: "Just now",
    };

    setMessages((prev) => [...prev, newMsg]);
    setChatInput("");
    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleReaction = (emoji: string) => {
    const id = Date.now() + Math.random();
    const x = Math.floor(Math.random() * 80) + 10;
    setFlyingEmojis((prev) => [...prev, { id, emoji, x }]);
    setTimeout(() => {
      setFlyingEmojis((prev) => prev.filter((item) => item.id !== id));
    }, 1500);
  };

  const handleVote = (trackId: string) => {
    setQueueVotes((prev) =>
      prev.map((item) => {
        if (item.track.id === trackId) {
          const delta = item.votedByMe ? -1 : 1;
          return { ...item, votes: item.votes + delta, votedByMe: !item.votedByMe };
        }
        return item;
      }),
    );
    toast.success("Vote recorded for next track in DJ queue!");
  };

  const handleTuneIn = () => {
    playTrack(room.currentTrack);
    toast.success(`Synchronized to ${room.title} stream!`, {
      description: `Playing ${room.currentTrack.title} at ${room.qualityBadge}`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col rounded-3xl border border-primary/30 bg-card p-0 shadow-2xl backdrop-blur-2xl">
        {/* Room Top Header */}
        <div className="flex items-center justify-between border-b border-border/40 p-5 bg-surface-raised/80">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={room.djAvatar}
                alt={room.djName}
                className="h-11 w-11 rounded-2xl object-cover border border-primary/40 shadow-sm"
              />
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                <Crown className="h-2.5 w-2.5" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-foreground truncate">
                  {room.title}
                </h2>
                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[9px] font-mono font-bold px-1.5 py-0">
                  LIVE SYNC
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Host DJ: <strong className="text-foreground">{room.djName}</strong> · {room.genre}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="font-mono text-xs font-bold border-primary/40 text-primary gap-1 px-2.5 py-1"
            >
              <Users className="h-3 w-3" />
              {room.listenersCount} listening
            </Badge>

            <Button
              size="sm"
              onClick={handleTuneIn}
              className="rounded-full bg-primary text-primary-foreground font-bold text-xs h-8 px-4 gap-1.5 cursor-pointer shadow-md"
            >
              <Radio className="h-3.5 w-3.5" /> Sync Audio
            </Button>
          </div>
        </div>

        {/* Room Main Stage Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
          {/* Left Stage & DJ Player (7 Cols) */}
          <div className="md:col-span-7 p-6 border-b md:border-b-0 md:border-r border-border/40 flex flex-col justify-between space-y-6 overflow-y-auto relative">
            {/* Flying Animated Reactions Area */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
              {flyingEmojis.map((e) => (
                <div
                  key={e.id}
                  style={{ left: `${e.x}%` }}
                  className="absolute bottom-10 text-3xl animate-bounce transition-transform duration-1000 opacity-90"
                >
                  {e.emoji}
                </div>
              ))}
            </div>

            {/* Main Active Track Showcase */}
            <div className="rounded-3xl border border-border/60 bg-surface/90 p-5 shadow-lg flex items-center gap-4 relative overflow-hidden">
              <div className="relative h-20 w-20 rounded-2xl overflow-hidden shrink-0 border border-white/10 shadow-md">
                <img
                  src={room.currentTrack.coverImage}
                  alt={room.currentTrack.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                  <Disc3 className="h-8 w-8 text-primary animate-spin" />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-mono font-bold text-primary tracking-wider uppercase block">
                  SYNCHRONIZED BROADCAST
                </span>
                <h3 className="text-base font-extrabold text-foreground truncate">
                  {room.currentTrack.title}
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  {room.currentTrack.artistName}
                </p>

                <div className="mt-2 flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="font-mono text-[9px] font-bold border-primary/40 text-primary py-0 px-1.5"
                  >
                    {room.qualityBadge}
                  </Badge>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {formatDuration(room.currentTrack.duration)}
                  </span>
                </div>
              </div>
            </div>

            {/* Real-time Crowd Reactions Bar */}
            <div className="rounded-2xl border border-border/40 bg-surface-raised p-3 flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
                Drop Live Reaction:
              </span>
              <div className="flex items-center gap-2">
                {["🔥", "⚡", "💖", "🚀", "🎧", "💃"].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className="text-lg hover:scale-125 transition-transform active:scale-95 cursor-pointer bg-card/80 h-9 w-9 rounded-xl flex items-center justify-center border border-border/40 hover:border-primary/50"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Collaborative DJ Queue & Track Voting */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  <span>Up Next Crowd Voting</span>
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  Highest votes play next
                </span>
              </div>

              <div className="space-y-2">
                {queueVotes.map((item) => (
                  <div
                    key={item.track.id}
                    className="flex items-center justify-between p-3 rounded-2xl border border-border/40 bg-card hover:bg-surface transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={item.track.coverImage}
                        alt={item.track.title}
                        className="h-9 w-9 rounded-xl object-cover"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-foreground truncate">
                          {item.track.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {item.track.artistName}
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant={item.votedByMe ? "default" : "outline"}
                      onClick={() => handleVote(item.track.id)}
                      className={cn(
                        "h-7 text-xs font-bold gap-1 rounded-xl px-3 cursor-pointer",
                        item.votedByMe && "bg-primary text-primary-foreground",
                      )}
                    >
                      <ThumbsUp className="h-3 w-3" />
                      <span>{item.votes}</span>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Live Room Chat Stream (5 Cols) */}
          <div className="md:col-span-5 flex flex-col justify-between bg-surface/40 h-[460px]">
            {/* Chat Stream */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
              <div className="text-center py-2">
                <span className="text-[10px] font-mono text-muted-foreground bg-surface-raised px-2.5 py-1 rounded-full border border-border/30">
                  Room Chat connected to {room.listenersCount} listeners
                </span>
              </div>

              {messages.map((m) => (
                <div key={m.id} className="flex items-start gap-2.5">
                  <img
                    src={m.avatar}
                    alt={m.userName}
                    className="h-7 w-7 rounded-xl object-cover border border-border/50 shrink-0 mt-0.5"
                  />
                  <div className="min-w-0 flex-1 bg-card/80 p-2.5 rounded-2xl border border-border/30 shadow-xs">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-foreground text-[11px] truncate">
                          {m.userName}
                        </span>
                        {m.isDj && (
                          <Badge className="bg-primary text-primary-foreground text-[8px] font-bold px-1 py-0">
                            HOST DJ
                          </Badge>
                        )}
                      </div>
                      <span className="text-[9px] text-muted-foreground font-mono">{m.timeAgo}</span>
                    </div>
                    <p className="text-foreground/90 leading-relaxed text-[11px]">{m.text}</p>
                  </div>
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Composer */}
            <form
              onSubmit={handleSendChat}
              className="p-3 border-t border-border/40 bg-surface-raised/90 flex items-center gap-2"
            >
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Message the room..."
                className="h-9 rounded-xl bg-card text-xs border-border/60"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!chatInput.trim()}
                className="h-9 w-9 rounded-xl bg-primary text-primary-foreground shrink-0 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
