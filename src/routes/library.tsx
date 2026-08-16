import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState, useRef, useEffect, useMemo } from "react";
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
  Users,
  ListMusic,
  ListPlus,
  Plus,
  Edit3,
  Trash2,
  Sparkles,
  Folder,
  Check,
  Zap,
  Search,
  MoreVertical,
  X,
  ShieldCheck,
  HardDrive,
  AlertTriangle,
  Layers,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { useLibrary } from "@/lib/library";
import { usePlayer } from "@/lib/player";
import {
  useAppMode,
  type LocalTrack,
  type LocalAlbum,
  type LocalArtistGroup,
  type LocalFolderGroup,
  type LocalPlaylist,
} from "@/lib/mode";
import { PurchaseService } from "@/domain/music/purchases";
import { formatDuration, qualityLabel, type Track } from "@/domain/music/types";
import { QualityBadge } from "@/components/QualityBadge";
import { SmartPlaylistGenerator } from "@/components/SmartPlaylistGenerator";
import { PlaylistBackupModal } from "@/components/PlaylistBackupModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface LibrarySearchParams {
  tab?: string;
}

export const Route = createFileRoute("/library")({
  validateSearch: (search: Record<string, unknown>): LibrarySearchParams => {
    const rawTab = search["tab"];
    return {
      ...(typeof rawTab === "string" ? { tab: rawTab } : {}),
    };
  },
  head: () => ({
    meta: [
      { title: "Music Library & Local Player — Layam" },
      {
        name: "description",
        content: "Offline audiophile library, folders, albums, playlists, and high-res playback.",
      },
    ],
  }),
  component: LibraryPage,
});

type OfflinePrimaryTab = "tracks" | "albums" | "artists" | "playlists";
type OnlineTab = "purchased" | "liked" | "local" | "smart";

function LibraryPage() {
  const search = useSearch({ from: "/library" });
  const {
    isOffline,
    localTracks,
    localAlbums,
    localArtistGroups,
    localFolders,
    localPlaylists,
    importLocalFiles,
    removeLocalTrack,
    updateLocalTrackMetadata,
    createPlaylist,
    deletePlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
  } = useAppMode();
  const { allTracks, likedIds } = useLibrary();
  const { currentTrack, isPlaying, playTrack, togglePlay, openConsole } = usePlayer();

  // Primary navigation tabs
  const [offlineTab, setOfflineTab] = useState<OfflinePrimaryTab>(
    ["tracks", "albums", "artists", "playlists"].includes(search.tab || "")
      ? (search.tab as OfflinePrimaryTab)
      : "tracks",
  );
  const [onlineTab, setOnlineTab] = useState<OnlineTab>("purchased");

  // Search & Filter state
  const [trackSearchQuery, setTrackSearchQuery] = useState("");

  // Modals & Tools state
  const [tagEditorOpen, setTagEditorOpen] = useState(false);
  const [duplicateCleanerOpen, setDuplicateCleanerOpen] = useState(false);
  const [smartMixOpen, setSmartMixOpen] = useState(false);
  const [storageManagerOpen, setStorageManagerOpen] = useState(false);
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [managePlaylist, setManagePlaylist] = useState<LocalPlaylist | null>(null);
  const [playlistTrackSearch, setPlaylistTrackSearch] = useState("");
  const [newPlaylistName, setNewPlaylistName] = useState("");

  // Tag Editor Form state
  const [selectedTrackForEdit, setSelectedTrackForEdit] = useState<LocalTrack | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editArtist, setEditArtist] = useState("");
  const [editAlbum, setEditAlbum] = useState("");
  const [editGenre, setEditGenre] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Duplicate Track Detection logic
  const duplicateGroups = useMemo(() => {
    const map = new Map<string, LocalTrack[]>();
    for (const track of localTracks) {
      const normTitle = track.title.toLowerCase().replace(/[^a-z0-9]/g, "");
      const normArtist = (track.artistName || track.artist || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      const key = `${normTitle}::${normArtist}`;
      const group = map.get(key) ?? [];
      group.push(track);
      map.set(key, group);
    }
    return Array.from(map.values()).filter((group) => group.length > 1);
  }, [localTracks]);

  // Storage Stats Calculation
  const storageStats = useMemo(() => {
    const totalBytes = localTracks.reduce((acc, t) => acc + (t.fileSizeBytes || 0), 0);
    const totalMb = Math.round((totalBytes / (1024 * 1024)) * 10) / 10;
    const formatCounts: Record<string, number> = {};
    for (const t of localTracks) {
      const fmt = t.quality || "FLAC";
      formatCounts[fmt] = (formatCounts[fmt] || 0) + 1;
    }
    return {
      totalTracks: localTracks.length,
      totalMb,
      formatCounts,
    };
  }, [localTracks]);

  const handleAutoCleanDuplicates = () => {
    let cleanedCount = 0;
    for (const group of duplicateGroups) {
      const sorted = [...group].sort((a, b) => {
        const aLossless = ["FLAC", "WAV", "AIFF", "ALAC"].includes(a.quality || "");
        const bLossless = ["FLAC", "WAV", "AIFF", "ALAC"].includes(b.quality || "");
        if (aLossless && !bLossless) return -1;
        if (!aLossless && bLossless) return 1;
        return (b.bitrate || 0) - (a.bitrate || 0);
      });

      for (let i = 1; i < sorted.length; i++) {
        const dupe = sorted[i];
        if (dupe) {
          removeLocalTrack(dupe.id);
          cleanedCount++;
        }
      }
    }
    setDuplicateCleanerOpen(false);
    toast.success(`Removed ${cleanedCount} duplicate track(s). Kept highest quality masters!`);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      toast.info(`Importing ${files.length} audio file(s)...`);
      await importLocalFiles(files);
      toast.success(`Import complete. ${files.length} audio file(s) indexed.`);
    }
    e.target.value = "";
  };

  const purchasedTracks = PurchaseService.getPurchasedTracks(allTracks);
  const likedTracks = allTracks.filter((track) => likedIds.includes(track.id));

  const handleStartEdit = (track: LocalTrack) => {
    setSelectedTrackForEdit(track);
    setEditTitle(track.title);
    setEditArtist(track.artistName);
    setEditAlbum(track.album || "");
    setEditGenre(track.genre || "");
    setTagEditorOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrackForEdit) return;
    updateLocalTrackMetadata(selectedTrackForEdit.id, {
      title: editTitle.trim() || selectedTrackForEdit.title,
      artistName: editArtist.trim() || selectedTrackForEdit.artistName,
      album: editAlbum.trim() || selectedTrackForEdit.album || "",
      genre: editGenre.trim() || selectedTrackForEdit.genre,
    });
    setTagEditorOpen(false);
    setSelectedTrackForEdit(null);
    toast.success("Track metadata updated successfully!");
  };

  // Filtered tracks for search
  const filteredLocalTracks = useMemo(() => {
    if (!trackSearchQuery.trim()) return localTracks;
    const q = trackSearchQuery.toLowerCase();
    return localTracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artistName.toLowerCase().includes(q) ||
        (t.album && t.album.toLowerCase().includes(q)),
    );
  }, [localTracks, trackSearchQuery]);

  // ── Render Track Row ──────────────────────────────────────────────────────────
  const renderTrackRow = (track: LocalTrack | Track, currentQueue: (LocalTrack | Track)[]) => {
    const isCurrent = currentTrack?.id === track.id;

    return (
      <div
        key={track.id}
        className={cn(
          "group flex items-center justify-between gap-4 rounded-2xl p-3 transition-all border",
          isCurrent
            ? "bg-emerald-500/10 border-emerald-500/30 shadow-sm"
            : "hover:bg-surface-raised/70 border-transparent hover:border-border/40",
        )}
      >
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-surface-raised border border-border/30">
            {track.coverImage ? (
              <img
                src={track.coverImage}
                alt={track.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary">
                <Music2 className="h-5 w-5" />
              </div>
            )}
            <button
              onClick={() => {
                if (isCurrent) {
                  togglePlay();
                } else {
                  playTrack(track as Track, currentQueue as Track[]);
                }
              }}
              className={cn(
                "absolute inset-0 flex items-center justify-center bg-black/60 transition-opacity cursor-pointer",
                isCurrent ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              )}
              aria-label={`Play ${track.title}`}
            >
              {isCurrent && isPlaying ? (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <span className="h-2.5 w-2.5 bg-current rounded-xs" />
                </div>
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                </div>
              )}
            </button>
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <h3
              onClick={() => playTrack(track as Track, currentQueue as Track[])}
              className={cn(
                "truncate font-bold text-sm cursor-pointer transition-colors",
                isCurrent ? "text-emerald-400" : "text-foreground group-hover:text-emerald-400",
              )}
            >
              {track.title}
            </h3>
            <p className="truncate text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <span>{track.artistName}</span>
              {(track as LocalTrack).album && (
                <>
                  <span>·</span>
                  <span className="text-muted-foreground/80">{(track as LocalTrack).album}</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex flex-col items-end">
            <div className="flex items-center gap-1.5">
              <Badge
                variant="outline"
                className={cn(
                  "border text-[10px] font-mono font-bold",
                  isOffline
                    ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                    : "border-primary/40 text-primary bg-primary/10",
                )}
              >
                {track.quality}
              </Badge>
              {track.sampleRate && (
                <span className="text-[10px] font-mono text-muted-foreground">
                  {track.sampleRate >= 96000 ? "24/96" : "16/44.1"}
                </span>
              )}
            </div>
            <span className="font-mono text-[10px] text-muted-foreground mt-0.5">
              {formatDuration(track.duration)}
            </span>
          </div>

          {isOffline && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Add to Playlist Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-emerald-400 rounded-full cursor-pointer"
                    title="Add to Offline Playlist"
                  >
                    <ListPlus className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 bg-card border-border/80 rounded-2xl p-2 shadow-2xl"
                >
                  <DropdownMenuLabel className="text-xs font-bold text-foreground">
                    Add to Playlist
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border/40" />
                  {localPlaylists.length === 0 ? (
                    <div className="p-2 text-xs text-muted-foreground text-center">
                      No playlists created yet.
                    </div>
                  ) : (
                    localPlaylists.map((pl) => {
                      const inPl = pl.trackIds.includes(track.id);
                      return (
                        <DropdownMenuItem
                          key={pl.id}
                          onClick={() => {
                            if (inPl) {
                              removeTrackFromPlaylist(pl.id, track.id);
                            } else {
                              addTrackToPlaylist(pl.id, track.id);
                            }
                          }}
                          className="flex items-center justify-between text-xs cursor-pointer rounded-xl py-2 px-2.5 hover:bg-surface-raised"
                        >
                          <span className="truncate">{pl.name}</span>
                          {inPl && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                        </DropdownMenuItem>
                      );
                    })
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full cursor-pointer"
                onClick={() => handleStartEdit(track as LocalTrack)}
                title="Edit ID3 Tags"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-full cursor-pointer"
                onClick={() => removeLocalTrack(track.id)}
                title="Remove from Local Library"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pb-36 pt-24 sm:px-6 lg:px-8">
        {/* ── Page Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider border",
                  isOffline
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : "bg-primary/10 text-primary border-primary/20",
                )}
              >
                {isOffline ? <WifiOff className="h-3 w-3" /> : <Library className="h-3 w-3" />}
                {isOffline ? "Offline Audiophile Player" : "Online Ecosystem Library"}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              {isOffline ? "Local Music Library" : "Your Music Collection"}
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Hidden File inputs */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              accept="audio/*,.flac,.wav,.mp3,.alac,.m4a,.aac,.ogg"
              className="hidden"
            />
            <input
              type="file"
              ref={folderInputRef}
              onChange={handleFileSelect}
              multiple
              // @ts-expect-error webkitdirectory is standard in browser inputs
              webkitdirectory=""
              className="hidden"
            />

            {/* Unified Add Music Dropdown */}
            {isOffline && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    Add Music
                    <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-52 bg-card border-border/80 rounded-2xl p-1.5 shadow-2xl"
                >
                  <DropdownMenuItem
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 text-xs font-semibold py-2.5 px-3 rounded-xl cursor-pointer hover:bg-surface-raised"
                  >
                    <Plus className="h-4 w-4 text-emerald-400" />
                    <span>Select Audio Files...</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => folderInputRef.current?.click()}
                    className="flex items-center gap-2 text-xs font-semibold py-2.5 px-3 rounded-xl cursor-pointer hover:bg-surface-raised"
                  >
                    <FolderOpen className="h-4 w-4 text-emerald-400" />
                    <span>Scan Local Folder...</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={openConsole}
              className="rounded-full text-xs font-bold gap-1.5 border-primary/40 text-primary hover:bg-primary/10 h-9 cursor-pointer"
            >
              <Sliders className="h-3.5 w-3.5" />
              Audio Console
            </Button>
          </div>
        </div>

        {/* ── Sub Navigation: 4 Core Tabs + Tools Menu ── */}
        <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-8 overflow-x-auto gap-3">
          {isOffline ? (
            <>
              {/* 4 Primary Offline Tabs */}
              <div className="flex items-center gap-2">
                {[
                  { id: "tracks" as const, label: `Tracks (${localTracks.length})`, icon: Music2 },
                  { id: "albums" as const, label: `Albums (${localAlbums.length})`, icon: Disc3 },
                  { id: "artists" as const, label: `Artists (${localArtistGroups.length})`, icon: Users },
                  { id: "playlists" as const, label: `Playlists (${localPlaylists.length})`, icon: ListMusic },
                ].map((tabItem) => (
                  <button
                    key={tabItem.id}
                    onClick={() => setOfflineTab(tabItem.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all shrink-0 cursor-pointer",
                      offlineTab === tabItem.id
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-sm"
                        : "text-muted-foreground hover:bg-surface-raised hover:text-foreground",
                    )}
                  >
                    <tabItem.icon className="h-3.5 w-3.5" />
                    {tabItem.label}
                  </button>
                ))}
              </div>

              {/* Tools Menu Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full text-xs font-bold gap-1.5 h-8 border-border/60 hover:bg-surface-raised cursor-pointer shrink-0 ml-auto"
                  >
                    <Sliders className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Tools</span>
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 bg-card border-border/80 rounded-2xl p-1.5 shadow-2xl"
                >
                  <DropdownMenuItem
                    onClick={() => {
                      if (localTracks.length > 0 && !selectedTrackForEdit) {
                        handleStartEdit(localTracks[0]!);
                      } else {
                        setTagEditorOpen(true);
                      }
                    }}
                    className="flex items-center gap-2 text-xs font-semibold py-2 px-3 rounded-xl cursor-pointer hover:bg-surface-raised"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Tag & Metadata Editor</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setDuplicateCleanerOpen(true)}
                    className="flex items-center justify-between text-xs font-semibold py-2 px-3 rounded-xl cursor-pointer hover:bg-surface-raised"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Duplicate Cleaner</span>
                    </div>
                    {duplicateGroups.length > 0 && (
                      <Badge className="bg-amber/20 text-amber border-amber/40 text-[10px] font-mono font-bold px-1.5 py-0">
                        {duplicateGroups.length}
                      </Badge>
                    )}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setSmartMixOpen(true)}
                    className="flex items-center gap-2 text-xs font-semibold py-2 px-3 rounded-xl cursor-pointer hover:bg-surface-raised"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span>Smart Mix Engine</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setStorageManagerOpen(true)}
                    className="flex items-center gap-2 text-xs font-semibold py-2 px-3 rounded-xl cursor-pointer hover:bg-surface-raised"
                  >
                    <HardDrive className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Storage Manager ({storageStats.totalMb} MB)</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-border/40" />

                  <DropdownMenuItem
                    onClick={() => setBackupModalOpen(true)}
                    className="flex items-center gap-2 text-xs font-semibold py-2 px-3 rounded-xl cursor-pointer hover:bg-surface-raised"
                  >
                    <Download className="h-3.5 w-3.5 text-primary" />
                    <span>M3U8 / JSON Backup</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              {[
                { id: "purchased" as const, label: `Purchased Masters (${purchasedTracks.length})`, icon: Download },
                { id: "liked" as const, label: `Liked Tracks (${likedTracks.length})`, icon: Heart },
                { id: "local" as const, label: `Local Files (${localTracks.length})`, icon: FolderOpen },
                { id: "smart" as const, label: "Smart Mix Generator", icon: Sparkles },
              ].map((tabItem) => (
                <button
                  key={tabItem.id}
                  onClick={() => setOnlineTab(tabItem.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all shrink-0 cursor-pointer",
                    onlineTab === tabItem.id
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "text-muted-foreground hover:bg-surface-raised hover:text-foreground",
                  )}
                >
                  <tabItem.icon className="h-3.5 w-3.5" />
                  {tabItem.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Offline Views ── */}
        {isOffline && (
          <div>
            {/* 1. Tracks View */}
            {offlineTab === "tracks" && (
              <div className="space-y-4">
                {localTracks.length > 0 && (
                  <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search tracks, artists, albums..."
                      value={trackSearchQuery}
                      onChange={(e) => setTrackSearchQuery(e.target.value)}
                      className="pl-9 rounded-full bg-card text-xs h-9"
                    />
                  </div>
                )}

                {localTracks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/60 p-12 text-center bg-card/30">
                    <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4 border border-emerald-500/30">
                      <Music2 className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">
                      Add your first songs to start your offline library.
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-md mt-2 mb-6 leading-relaxed">
                      Drop FLAC, WAV, ALAC, or MP3 files from your device to listen offline with full 10-band DSP equalization.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-full bg-emerald-500 text-white hover:bg-emerald-600 gap-2 text-xs font-bold px-5 h-9 cursor-pointer"
                      >
                        <Plus className="h-4 w-4" /> Select Audio Files
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => folderInputRef.current?.click()}
                        className="rounded-full text-xs font-bold gap-2 px-5 h-9 border-border/60 hover:bg-surface-raised cursor-pointer"
                      >
                        <FolderOpen className="h-4 w-4 text-emerald-400" /> Scan Local Folder
                      </Button>
                    </div>
                  </div>
                ) : filteredLocalTracks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/40 p-10 text-center text-muted-foreground text-xs">
                    No tracks matching &quot;{trackSearchQuery}&quot;.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {filteredLocalTracks.map((track) => renderTrackRow(track, filteredLocalTracks))}
                  </div>
                )}
              </div>
            )}

            {/* 2. Albums View */}
            {offlineTab === "albums" && (
              <div>
                {localAlbums.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/60 p-12 text-center bg-card/30">
                    <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4 border border-emerald-500/30">
                      <Disc3 className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">
                      Your imported albums will appear here.
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-sm mt-2 mb-5">
                      Audio files containing album metadata will automatically group into albums.
                    </p>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-full bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-bold gap-2"
                    >
                      <Plus className="h-4 w-4" /> Import Audio
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {localAlbums.map((album) => (
                      <div
                        key={album.name}
                        className="group rounded-2xl border border-border/40 bg-card p-4 hover:border-emerald-500/40 transition-all flex flex-col"
                      >
                        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted mb-3">
                          <img
                            src={album.coverImage}
                            alt={album.name}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <button
                            onClick={() => {
                              if (album.tracks[0]) playTrack(album.tracks[0], album.tracks);
                            }}
                            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            aria-label={`Play album ${album.name}`}
                          >
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl hover:scale-110 transition-transform">
                              <Play className="h-6 w-6 fill-current ml-0.5" />
                            </div>
                          </button>
                        </div>

                        <h3 className="font-bold text-sm text-foreground truncate group-hover:text-emerald-400 transition-colors">
                          {album.name}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate">{album.artistName}</p>
                        <span className="text-[10px] font-mono text-muted-foreground mt-1">
                          {album.trackCount} {album.trackCount === 1 ? "track" : "tracks"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. Artists View */}
            {offlineTab === "artists" && (
              <div>
                {localArtistGroups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/60 p-12 text-center bg-card/30">
                    <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4 border border-emerald-500/30">
                      <Users className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">
                      Artists from your local audio files will appear here.
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-sm mt-2 mb-5">
                      Local music will automatically group by artist.
                    </p>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-full bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-bold gap-2"
                    >
                      <Plus className="h-4 w-4" /> Import Audio
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {localArtistGroups.map((artist) => (
                      <div
                        key={artist.artistName}
                        className="rounded-2xl border border-border/40 bg-card p-5 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 font-bold text-base">
                            {artist.artistName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-sm text-foreground truncate">
                              {artist.artistName}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {artist.trackCount} local {artist.trackCount === 1 ? "track" : "tracks"}
                            </p>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => {
                            if (artist.tracks[0]) playTrack(artist.tracks[0], artist.tracks);
                          }}
                          className="rounded-full bg-emerald-500 text-white hover:bg-emerald-600 h-8 text-xs font-bold gap-1 shrink-0 cursor-pointer"
                        >
                          <Play className="h-3 w-3 fill-current" /> Play
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 4. Playlists View */}
            {offlineTab === "playlists" && (
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <Input
                    placeholder="New offline playlist name..."
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newPlaylistName.trim()) {
                        createPlaylist(newPlaylistName);
                        setNewPlaylistName("");
                      }
                    }}
                    className="max-w-xs rounded-full text-xs"
                  />
                  <Button
                    size="sm"
                    disabled={!newPlaylistName.trim()}
                    onClick={() => {
                      createPlaylist(newPlaylistName);
                      setNewPlaylistName("");
                    }}
                    className="rounded-full bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-bold gap-1 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Create Playlist
                  </Button>
                </div>

                {localPlaylists.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-border/60 p-12 text-center bg-card/30">
                    <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mx-auto mb-4 border border-emerald-500/30">
                      <ListMusic className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">
                      Create a playlist from your local music.
                    </h3>
                    <p className="text-xs text-muted-foreground mt-2 max-w-sm mx-auto">
                      Organize your local audio files into high-res playlists, workout sets, and custom mixes.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {localPlaylists.map((pl) => {
                      const plTracks = localTracks.filter((t) => pl.trackIds.includes(t.id));
                      return (
                        <div
                          key={pl.id}
                          className="rounded-3xl border border-border/40 bg-card p-5 flex flex-col justify-between shadow-lg"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2 text-emerald-400">
                                <ListMusic className="h-5 w-5" />
                                <h3 className="font-bold text-sm text-foreground truncate">
                                  {pl.name}
                                </h3>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setManagePlaylist(pl);
                                    setPlaylistTrackSearch("");
                                  }}
                                  className="h-7 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-full px-2 cursor-pointer"
                                >
                                  <Plus className="h-3 w-3 mr-0.5" /> Add Songs
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deletePlaylist(pl.id)}
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive rounded-full cursor-pointer"
                                  title="Delete Playlist"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mb-4">
                              {plTracks.length} {plTracks.length === 1 ? "track" : "tracks"} ·{" "}
                              {formatDuration(
                                plTracks.reduce((acc, t) => acc + (t.duration || 0), 0),
                              )}
                            </p>

                            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                              {plTracks.length === 0 && (
                                <p className="text-[11px] text-muted-foreground italic py-3 text-center">
                                  No songs added yet. Click &quot;Add Songs&quot; above to select local tracks.
                                </p>
                              )}
                              {plTracks.map((t) => (
                                <div
                                  key={t.id}
                                  className="flex items-center justify-between text-xs text-foreground/90 py-1 px-2 rounded-xl bg-surface/60 hover:bg-surface-raised transition-colors group"
                                >
                                  <span className="truncate flex-1 font-medium">{t.title}</span>
                                  <span className="text-[10px] font-mono text-muted-foreground mr-2 shrink-0">
                                    {t.quality}
                                  </span>
                                  <button
                                    onClick={() => removeTrackFromPlaylist(pl.id, t.id)}
                                    className="text-muted-foreground hover:text-destructive text-xs font-bold px-1 cursor-pointer"
                                    title="Remove track"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="mt-5 pt-3 border-t border-border/30 flex gap-2">
                            <Button
                              size="sm"
                              disabled={plTracks.length === 0}
                              onClick={() => {
                                if (plTracks[0]) playTrack(plTracks[0], plTracks);
                              }}
                              className="flex-1 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-bold gap-1.5 h-9 shadow-md shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
                            >
                              <Play className="h-3.5 w-3.5 fill-current" /> Play Playlist
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Online Views ── */}
        {!isOffline && (
          <div>
            {onlineTab === "purchased" && (
              <div>
                {purchasedTracks.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-border/60 p-12 text-center">
                    <Download className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <h3 className="text-base font-bold text-foreground">No Purchased Masters</h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto mb-5">
                      Buy lossless tracks in the Store to own perpetual 24-bit master downloads.
                    </p>
                    <Link to="/store">
                      <Button className="rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        Browse Music Store
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {purchasedTracks.map((track) => renderTrackRow(track, purchasedTracks))}
                  </div>
                )}
              </div>
            )}

            {onlineTab === "liked" && (
              <div>
                {likedTracks.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-border/60 p-12 text-center">
                    <Heart className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <h3 className="text-base font-bold text-foreground">No Liked Tracks</h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                      Tap the heart icon on any stream to add songs to your favorites.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {likedTracks.map((track) => renderTrackRow(track, likedTracks))}
                  </div>
                )}
              </div>
            )}

            {onlineTab === "local" && (
              <div className="space-y-1.5">
                {localTracks.map((track) => renderTrackRow(track, localTracks))}
              </div>
            )}

            {onlineTab === "smart" && (
              <div className="rounded-3xl border border-border/40 bg-card p-6">
                <SmartPlaylistGenerator />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Dialog 1: Manage Playlist Songs ── */}
      {managePlaylist && (
        <Dialog open={Boolean(managePlaylist)} onOpenChange={(open) => !open && setManagePlaylist(null)}>
          <DialogContent className="max-w-md bg-card border-border/80 rounded-3xl p-6 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <ListPlus className="h-4 w-4 text-emerald-400" />
                Add Tracks to &quot;{managePlaylist.name}&quot;
              </DialogTitle>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search local library songs..."
                  value={playlistTrackSearch}
                  onChange={(e) => setPlaylistTrackSearch(e.target.value)}
                  className="pl-9 rounded-2xl text-xs bg-surface"
                />
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                {localTracks
                  .filter((t) =>
                    playlistTrackSearch
                      ? t.title.toLowerCase().includes(playlistTrackSearch.toLowerCase()) ||
                        t.artistName.toLowerCase().includes(playlistTrackSearch.toLowerCase())
                      : true,
                  )
                  .map((track) => {
                    const isAdded = managePlaylist.trackIds.includes(track.id);
                    return (
                      <div
                        key={track.id}
                        onClick={() => {
                          if (isAdded) {
                            removeTrackFromPlaylist(managePlaylist.id, track.id);
                            setManagePlaylist((prev) =>
                              prev ? { ...prev, trackIds: prev.trackIds.filter((id) => id !== track.id) } : null,
                            );
                          } else {
                            addTrackToPlaylist(managePlaylist.id, track.id);
                            setManagePlaylist((prev) =>
                              prev ? { ...prev, trackIds: [...prev.trackIds, track.id] } : null,
                            );
                          }
                        }}
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer",
                          isAdded
                            ? "bg-emerald-500/10 border-emerald-500/30 text-foreground"
                            : "bg-surface/50 border-transparent hover:border-border/60 text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <img src={track.coverImage} alt="" className="h-8 w-8 rounded-lg object-cover shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-xs truncate text-foreground">{track.title}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{track.artistName}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-mono font-bold text-emerald-400">{track.quality}</span>
                          <div
                            className={cn(
                              "h-6 w-6 rounded-full flex items-center justify-center border transition-colors",
                              isAdded
                                ? "bg-emerald-500 border-emerald-500 text-white"
                                : "border-border/80 hover:border-emerald-500",
                            )}
                          >
                            {isAdded ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5 text-muted-foreground" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              <Button
                onClick={() => setManagePlaylist(null)}
                className="w-full rounded-full bg-emerald-500 text-white hover:bg-emerald-600 font-bold text-xs h-10 cursor-pointer"
              >
                Done
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Dialog 2: In-Place Tag Editor ── */}
      <Dialog open={tagEditorOpen} onOpenChange={setTagEditorOpen}>
        <DialogContent className="max-w-md bg-card border-border/80 rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-emerald-400" />
              Tag & Metadata Editor
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Modify track tags locally on your device without cloud modifications.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Select Track:</label>
              <select
                className="w-full rounded-xl border border-border/60 bg-surface px-3 py-2 text-xs text-foreground"
                value={selectedTrackForEdit?.id || ""}
                onChange={(e) => {
                  const t = localTracks.find((track) => track.id === e.target.value);
                  if (t) handleStartEdit(t);
                }}
              >
                <option value="">-- Choose local track --</option>
                {localTracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} — {t.artistName}
                  </option>
                ))}
              </select>
            </div>

            {selectedTrackForEdit && (
              <form onSubmit={handleSaveEdit} className="space-y-3.5 pt-1">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Track Title</label>
                  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="rounded-xl text-xs" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Artist Name</label>
                  <Input value={editArtist} onChange={(e) => setEditArtist(e.target.value)} className="rounded-xl text-xs" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Album</label>
                  <Input value={editAlbum} onChange={(e) => setEditAlbum(e.target.value)} className="rounded-xl text-xs" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Genre</label>
                  <Input value={editGenre} onChange={(e) => setEditGenre(e.target.value)} className="rounded-xl text-xs" />
                </div>

                <Button
                  type="submit"
                  className="w-full rounded-full bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-bold gap-1.5 h-9 mt-2 cursor-pointer"
                >
                  <Check className="h-4 w-4" /> Save Metadata
                </Button>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog 3: Duplicate Cleaner ── */}
      <Dialog open={duplicateCleanerOpen} onOpenChange={setDuplicateCleanerOpen}>
        <DialogContent className="max-w-lg bg-card border-border/80 rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Duplicate Track Cleaner
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Detect and clean redundant copies while preserving the highest-quality 24-bit masters.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            {duplicateGroups.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground rounded-2xl bg-surface/50 border border-border/40">
                <Check className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                <p className="font-bold text-foreground">Zero Duplicate Tracks Found</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Your offline library is completely clean and deduplicated.</p>
              </div>
            ) : (
              <>
                <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
                  {duplicateGroups.map((group, idx) => (
                    <div key={idx} className="p-3 rounded-2xl bg-surface-raised border border-border/40 space-y-2">
                      <p className="text-xs font-bold text-foreground">{group[0]?.title} — {group[0]?.artistName}</p>
                      <div className="space-y-1">
                        {group.map((t) => (
                          <div key={t.id} className="flex items-center justify-between text-[11px] text-muted-foreground bg-card/60 px-2 py-1 rounded-lg">
                            <span className="truncate">{t.title}</span>
                            <span className="font-mono text-[10px] text-emerald-400 font-bold">{t.quality} ({t.bitrate}kbps)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={handleAutoCleanDuplicates}
                  className="w-full rounded-full bg-emerald-500 text-white hover:bg-emerald-600 font-bold text-xs h-10 cursor-pointer"
                >
                  Clean Duplicates (Keep Highest Bitrate)
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog 4: Smart Mix Engine ── */}
      <Dialog open={smartMixOpen} onOpenChange={setSmartMixOpen}>
        <DialogContent className="max-w-2xl bg-card border-border/80 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Smart Mix Engine
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Generate dynamic mood and energy playlists from your local offline collection.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2">
            <SmartPlaylistGenerator />
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog 5: Storage Manager ── */}
      <Dialog open={storageManagerOpen} onOpenChange={setStorageManagerOpen}>
        <DialogContent className="max-w-md bg-card border-border/80 rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-emerald-400" />
              Offline Storage Manager
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              IndexedDB local storage allocation and file format breakdown.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-surface-raised border border-border/40 space-y-1">
                <span className="text-[10px] uppercase font-mono text-muted-foreground">Total Tracks</span>
                <p className="text-2xl font-black font-mono text-foreground">{storageStats.totalTracks}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-surface-raised border border-border/40 space-y-1">
                <span className="text-[10px] uppercase font-mono text-muted-foreground">Storage Used</span>
                <p className="text-2xl font-black font-mono text-emerald-400">{storageStats.totalMb} MB</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-raised border border-border/40 space-y-2">
              <span className="text-xs font-bold text-foreground block">Format Distribution:</span>
              <div className="flex flex-wrap gap-2">
                {Object.entries(storageStats.formatCounts).map(([fmt, count]) => (
                  <Badge key={fmt} variant="outline" className="text-xs font-mono border-emerald-500/30 text-emerald-400">
                    {fmt}: {count}
                  </Badge>
                ))}
              </div>
            </div>

            <Button
              onClick={() => setStorageManagerOpen(false)}
              className="w-full rounded-full bg-emerald-500 text-white hover:bg-emerald-600 font-bold text-xs h-9 cursor-pointer"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Playlist Backup Modal ── */}
      <PlaylistBackupModal open={backupModalOpen} onClose={() => setBackupModalOpen(false)} />
    </>
  );
}
