import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useCallback } from "react";
import { Library, Music2, Heart, Download, FolderOpen, Play, Upload, ShoppingBag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLibrary } from "@/lib/library";
import { usePlayer } from "@/lib/player";
import { formatDuration, qualityLabel, type Track, type AudioFormat } from "@/domain/music/types";
import { QualityBadge } from "@/components/QualityBadge";
import { Button } from "@/components/ui/button";
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
  const [tab, setTab] = useState<"Purchased" | "Local Files" | "Liked">("Purchased");
  const [localFiles, setLocalFiles] = useState<Track[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { allTracks, likedIds } = useLibrary();
  const player = usePlayer();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const newTracks: Track[] = files.map((file, i) => ({
      id: `local-${Date.now()}-${i}`,
      title: file.name.replace(/\.[^.]+$/, ""),
      artistId: "local",
      artistName: "Local File",
      coverImage: "",
      audioUrl: URL.createObjectURL(file),
      duration: 0,
      genre: "Local",
      quality: file.name.endsWith(".flac") ? "FLAC" as AudioFormat : file.name.endsWith(".wav") ? "WAV" as AudioFormat : "MP3" as AudioFormat,
      bitrate: 320,
      sampleRate: 44100,
      playCount: 0,
      likes: 0,
      comments: 0,
      createdAt: new Date().toISOString().split("T")[0],
    }));
    setLocalFiles(prev => [...prev, ...newTracks]);
    toast.success(`${files.length} file(s) loaded`);
  };

  const playTrack = (track: Track) => {
    player.play(track);
  };

  const getPurchasedTracks = () => {
    try {
      const stored = sessionStorage.getItem("layam_purchases");
      if (!stored) return [];
      const purchaseIds = JSON.parse(stored) as string[];
      return allTracks.filter(track => purchaseIds.includes(track.id));
    } catch {
      return [];
    }
  };

  const purchasedTracks = getPurchasedTracks();
  const likedTracks = allTracks.filter(track => likedIds.includes(track.id));

  const renderTrackRow = (track: Track, index: number) => (
    <div
      key={track.id}
      className="group flex items-center gap-4 rounded-xl p-3 hover:bg-surface-raised/50 transition-colors"
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
          onClick={() => playTrack(track)}
          className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <Play className="h-6 w-6 text-white fill-current" />
        </button>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <h3 className="truncate font-medium text-foreground">{track.title}</h3>
        <p className="truncate text-sm text-muted-foreground">{track.artistName}</p>
      </div>

      <div className="hidden sm:flex items-center gap-3">
        <QualityBadge spec={track} />
        <span className="text-sm font-mono text-muted-foreground w-12 text-right">
          {track.duration > 0 ? formatDuration(track.duration) : "--:--"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 pb-32 pt-24 sm:px-6 lg:px-8">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Your Library</h1>
        <p className="mt-2 text-muted-foreground text-lg">Your collection of purchased, liked, and local music.</p>
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        {(["Purchased", "Local Files", "Liked"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-5 py-2.5 rounded-full text-sm font-medium transition-all",
              tab === t
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-surface-raised text-muted-foreground hover:bg-surface-raised/80 hover:text-foreground"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-border/60 bg-surface-raised/30 p-2 sm:p-6 shadow-sm min-h-[400px]">
        {tab === "Purchased" && (
          <div className="flex flex-col gap-1">
            {purchasedTracks.length > 0 ? (
              purchasedTracks.map(renderTrackRow)
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-raised text-muted-foreground">
                  <ShoppingBag className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold">No purchased tracks yet.</h3>
                <p className="mt-2 text-muted-foreground max-w-sm mb-6">Support independent artists by purchasing their lossless tracks.</p>
                <Button asChild className="bg-primary text-primary-foreground hover:opacity-90">
                  <Link to="/store">Explore Store</Link>
                </Button>
              </div>
            )}
          </div>
        )}

        {tab === "Local Files" && (
          <div className="flex flex-col gap-1">
            <div className="mb-6 flex justify-between items-center px-3">
              <h2 className="text-lg font-medium">Local Audio Files</h2>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                accept="audio/*"
                className="hidden"
              />
              <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                Load Files
              </Button>
            </div>
            
            {localFiles.length > 0 ? (
              localFiles.map(renderTrackRow)
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border/60 rounded-2xl m-3">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-raised text-muted-foreground">
                  <FolderOpen className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold">Drop or browse audio files from your device.</h3>
                <p className="mt-2 text-muted-foreground max-w-sm mb-6">Play your personal high-quality collection right here.</p>
                <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Browse Files
                </Button>
              </div>
            )}
          </div>
        )}

        {tab === "Liked" && (
          <div className="flex flex-col gap-1">
            {likedTracks.length > 0 ? (
              likedTracks.map(renderTrackRow)
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-raised text-muted-foreground">
                  <Heart className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold">No liked tracks yet.</h3>
                <p className="mt-2 text-muted-foreground max-w-sm mb-6">Heart tracks to save them here for quick access.</p>
                <Button asChild className="bg-primary text-primary-foreground hover:opacity-90">
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
