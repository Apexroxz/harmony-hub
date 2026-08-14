import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import {
  Library,
  Music2,
  Heart,
  Download,
  FolderOpen,
  Play,
  Upload,
  ShoppingBag,
  WifiOff,
  Disc3,
  Sliders,
} from "lucide-react";
import { toast } from "sonner";
import { useLibrary } from "@/lib/library";
import { usePlayer } from "@/lib/player";
import { useAppMode, type LocalTrack } from "@/lib/mode";
import { formatDuration, qualityLabel, type Track, type AudioFormat } from "@/domain/music/types";
import { QualityBadge } from "@/components/QualityBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Your Library — Layam" },
      { name: "description", content: "Your purchased tracks, local files, and liked music." },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const { isOffline } = useAppMode();
  const [tab, setTab] = useState<"Purchased" | "Local Files" | "Liked">(
    isOffline ? "Local Files" : "Purchased"
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { allTracks, likedIds } = useLibrary();
  const { localTracks, importLocalFiles } = useAppMode();
  const { playTrack } = usePlayer();

  useEffect(() => {
    if (isOffline) {
      setTab("Local Files");
    }
  }, [isOffline]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await importLocalFiles(files);
    }
  };

  const getPurchasedTracks = () => {
    try {
      const stored = sessionStorage.getItem("layam_purchases");
      if (!stored) return [];
      const purchaseIds = JSON.parse(stored) as string[];
      return allTracks.filter((track) => purchaseIds.includes(track.id));
    } catch {
      return [];
    }
  };

  const purchasedTracks = getPurchasedTracks();
  const likedTracks = allTracks.filter((track) => likedIds.includes(track.id));

  const renderTrackRow = (track: Track | LocalTrack) => (
    <div
      key={track.id}
      className="group flex items-center gap-4 rounded-xl p-3 hover:bg-surface-raised/60 transition-colors"
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-raised">
        {track.coverImage ? (
          <img src={track.coverImage} alt={track.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary">
            <Music2 className="h-5 w-5" />
          </div>
        )}
        <button
          onClick={() => playTrack(track as Track, (tab === "Local Files" ? localTracks : tab === "Purchased" ? purchasedTracks : likedTracks) as Track[])}
          className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100"
          aria-label={`Play ${track.title}`}
        >
          <Play className="h-5 w-5 text-white fill-current" />
        </button>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <h3 className="truncate font-semibold text-sm text-foreground">{track.title}</h3>
        <p className="truncate text-xs text-muted-foreground">
          {track.artistName}
          {(track as LocalTrack).album && ` · ${(track as LocalTrack).album}`}
        </p>
      </div>

      <div className="hidden sm:flex items-center gap-3">
        <QualityBadge spec={track} />
        {(track as LocalTrack).folderPath && (
          <Badge variant="outline" className="text-[10px] border-border/40 text-muted-foreground hidden md:inline-flex">
            {(track as LocalTrack).folderPath}
          </Badge>
        )}
        <span className="text-xs font-mono text-muted-foreground w-12 text-right">
          {track.duration > 0 ? formatDuration(track.duration) : "--:--"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => playTrack(track as Track)}
          className="h-8 w-8 text-muted-foreground hover:text-primary"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 pb-36 pt-24 sm:px-6 lg:px-8">
      {/* ── Offline Banner ── */}
      {isOffline && (
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-emerald-400">
          <div className="flex items-center gap-3">
            <WifiOff className="h-5 w-5" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">Offline Engine Active</p>
              <p className="text-xs text-emerald-400/80">
                Playing local audio masters & offline purchases. Zero internet required.
              </p>
            </div>
          </div>
          <Badge className="bg-emerald-500 text-black font-bold text-[10px]">LOCAL ONLY</Badge>
        </div>
      )}

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Your Library</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Universal player hub for local FLAC/MP3 files, DRM-free purchases, and liked songs.
          </p>
        </div>

        {tab === "Local Files" && (
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              accept="audio/*,.flac,.wav,.aiff,.m4a"
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2 text-xs rounded-full shadow-md"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              Scan / Import Audio Files
            </Button>
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-border/40 pb-4">
        {(["Local Files", "Purchased", "Liked"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-bold transition-all",
              tab === t
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-surface-raised text-muted-foreground hover:bg-surface-raised/80 hover:text-foreground"
            )}
          >
            {t === "Local Files" ? `📁 Local Files (${localTracks.length})` : t === "Purchased" ? `🛍️ Purchased (${purchasedTracks.length})` : `❤️ Liked (${likedTracks.length})`}
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-border/40 bg-card p-4 sm:p-6 shadow-sm min-h-[420px]">
        {/* ── Local Files Tab ── */}
        {tab === "Local Files" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-3 border-b border-border/30 px-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {localTracks.length} Offline Tracks Available
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => playTrack(localTracks[0] as Track, localTracks as Track[])}
                disabled={localTracks.length === 0}
                className="text-xs text-primary font-bold gap-1"
              >
                <Play className="h-3 w-3 fill-current" />
                Play All Local
              </Button>
            </div>

            {localTracks.length > 0 ? (
              <div className="divide-y divide-border/20">{localTracks.map(renderTrackRow)}</div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-raised text-muted-foreground">
                  <FolderOpen className="h-8 w-8" />
                </div>
                <h3 className="text-base font-bold text-foreground">No local files imported yet</h3>
                <p className="mt-1 text-xs text-muted-foreground max-w-sm mb-6">
                  Drop your lossless FLAC, WAV, or MP3 files from your device to listen completely offline.
                </p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2 text-xs rounded-full"
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                  Select Audio Files
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── Purchased Tab ── */}
        {tab === "Purchased" && (
          <div className="space-y-2">
            {purchasedTracks.length > 0 ? (
              <div className="divide-y divide-border/20">{purchasedTracks.map(renderTrackRow)}</div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-raised text-muted-foreground">
                  <ShoppingBag className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-base font-bold text-foreground">No purchased tracks yet</h3>
                <p className="mt-1 text-xs text-muted-foreground max-w-sm mb-6">
                  Support independent artists in the Direct Store to unlock DRM-free bit-perfect master downloads.
                </p>
                <Button asChild className="bg-primary text-primary-foreground font-bold hover:opacity-90 rounded-full text-xs">
                  <Link to="/store">Explore Store</Link>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── Liked Tab ── */}
        {tab === "Liked" && (
          <div className="space-y-2">
            {likedTracks.length > 0 ? (
              <div className="divide-y divide-border/20">{likedTracks.map(renderTrackRow)}</div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-raised text-muted-foreground">
                  <Heart className="h-8 w-8 text-rose-400" />
                </div>
                <h3 className="text-base font-bold text-foreground">No liked tracks yet</h3>
                <p className="mt-1 text-xs text-muted-foreground max-w-sm mb-6">
                  Tap the heart icon on any release to save it to your favorites.
                </p>
                <Button asChild className="bg-primary text-primary-foreground font-bold hover:opacity-90 rounded-full text-xs">
                  <Link to="/">Discover Music</Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
