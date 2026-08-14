import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
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
  Users,
  ListMusic,
  Plus,
  Edit3,
  Trash2,
  Sparkles,
  Folder,
  Check,
  Zap,
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
import { formatDuration, qualityLabel, type Track } from "@/domain/music/types";
import { QualityBadge } from "@/components/QualityBadge";
import { AudioConsoleModal } from "@/components/AudioConsoleModal";
import { TrackCard } from "@/components/TrackCard";
import { tracks as storeCatalogTracks } from "@/domain/music/catalog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface LibrarySearchParams {
  tab?: string;
}

export const Route = createFileRoute("/library")({
  validateSearch: (search: Record<string, unknown>): LibrarySearchParams => {
    return {
      tab: typeof search.tab === "string" ? search.tab : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Music Library & Local Player — Layam" },
      { name: "description", content: "Offline audiophile library, folders, albums, playlists, and purchased masters." },
    ],
  }),
  component: LibraryPage,
});

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
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer();

  const [offlineTab, setOfflineTab] = useState<"tracks" | "folders" | "albums" | "artists" | "playlists" | "tags" | "store">(
    (search.tab as any) || "tracks"
  );
  const [onlineTab, setOnlineTab] = useState<"purchased" | "liked" | "local">("purchased");
  const [consoleOpen, setConsoleOpen] = useState(false);

  // Playlist state
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);

  // Tag Editor state
  const [selectedTrackForEdit, setSelectedTrackForEdit] = useState<LocalTrack | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editArtist, setEditArtist] = useState("");
  const [editAlbum, setEditAlbum] = useState("");
  const [editGenre, setEditGenre] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (search.tab && ["tracks", "folders", "albums", "artists", "playlists", "tags", "store"].includes(search.tab)) {
      setOfflineTab(search.tab as any);
    }
  }, [search.tab]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await importLocalFiles(files);
    }
  };

  const getPurchasedTracks = (): Track[] => {
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

  const handleStartEdit = (track: LocalTrack) => {
    setSelectedTrackForEdit(track);
    setEditTitle(track.title);
    setEditArtist(track.artistName);
    setEditAlbum(track.album || "");
    setEditGenre(track.genre || "");
    setOfflineTab("tags");
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrackForEdit) return;
    updateLocalTrackMetadata(selectedTrackForEdit.id, {
      title: editTitle.trim() || selectedTrackForEdit.title,
      artistName: editArtist.trim() || selectedTrackForEdit.artistName,
      album: editAlbum.trim() || selectedTrackForEdit.album,
      genre: editGenre.trim() || selectedTrackForEdit.genre,
    });
    setSelectedTrackForEdit(null);
  };

  // ── Render Track Row ──────────────────────────────────────────────────────────
  const renderTrackRow = (track: LocalTrack | Track, currentQueue: (LocalTrack | Track)[]) => {
    const isCurrent = currentTrack?.id === track.id;

    return (
      <div
        key={track.id}
        className={cn(
          "group flex items-center justify-between gap-4 rounded-2xl p-3 transition-all border",
          isCurrent
            ? "bg-primary/10 border-primary/30 shadow-sm"
            : "hover:bg-surface-raised/70 border-transparent hover:border-border/40"
        )}
      >
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-surface-raised border border-border/30">
            {track.coverImage ? (
              <img src={track.coverImage} alt={track.title} className="h-full w-full object-cover" />
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
                isCurrent ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
              aria-label={`Play ${track.title}`}
            >
              {isCurrent && isPlaying ? (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <span className="h-2.5 w-2.5 bg-current rounded-xs" />
                </div>
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
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
                isCurrent ? "text-primary" : "text-foreground group-hover:text-primary"
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
              {(track as LocalTrack).folderPath && (
                <>
                  <span>·</span>
                  <span className="font-mono text-[10px] text-muted-foreground/60">
                    📁 {(track as LocalTrack).folderPath}
                  </span>
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
                    : "border-primary/40 text-primary bg-primary/10"
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
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full"
                onClick={() => handleStartEdit(track as LocalTrack)}
                title="Edit ID3 Tags"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-full"
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
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider border",
                  isOffline
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : "bg-primary/10 text-primary border-primary/20"
                )}
              >
                {isOffline ? <WifiOff className="h-3 w-3" /> : <Library className="h-3 w-3" />}
                {isOffline ? "Audiophile Local Player" : "Online Ecosystem Library"}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              {isOffline ? "Local Music Library" : "Your Music Collection"}
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Import file inputs */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              accept="audio/*,.flac,.wav,.mp3,.alac,.m4a,.aac"
              className="hidden"
            />
            <input
              type="file"
              ref={folderInputRef}
              onChange={handleFileSelect}
              multiple
              // @ts-ignore
              webkitdirectory=""
              className="hidden"
            />

            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full text-xs font-bold gap-1.5 border-border/60 bg-glass"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Audio Files
            </Button>

            <Button
              size="sm"
              onClick={() => folderInputRef.current?.click()}
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold gap-1.5 shadow-md shadow-primary/20"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              Scan Folder
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setConsoleOpen(true)}
              className="rounded-full text-xs font-bold gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
            >
              <Sliders className="h-3.5 w-3.5" />
              Audio Console
            </Button>
          </div>
        </div>

        {/* ── Sub Navigation Tabs ── */}
        <div className="flex items-center gap-2 border-b border-border/40 pb-4 mb-8 overflow-x-auto">
          {isOffline ? (
            <>
              {[
                { id: "tracks", label: `Tracks (${localTracks.length})`, icon: Music2 },
                { id: "folders", label: `Folders (${localFolders.length})`, icon: FolderOpen },
                { id: "albums", label: `Albums (${localAlbums.length})`, icon: Disc3 },
                { id: "artists", label: `Artists (${localArtistGroups.length})`, icon: Users },
                { id: "playlists", label: `Playlists (${localPlaylists.length})`, icon: ListMusic },
                { id: "tags", label: "Tag Editor", icon: Edit3 },
                { id: "store", label: "Buy Store Masters", icon: ShoppingBag },
              ].map((tabItem) => (
                <button
                  key={tabItem.id}
                  onClick={() => setOfflineTab(tabItem.id as any)}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all shrink-0",
                    offlineTab === tabItem.id
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-sm"
                      : "text-muted-foreground hover:bg-surface-raised hover:text-foreground"
                  )}
                >
                  <tabItem.icon className="h-3.5 w-3.5" />
                  {tabItem.label}
                </button>
              ))}
            </>
          ) : (
            <>
              {[
                { id: "purchased", label: `Purchased Masters (${purchasedTracks.length})`, icon: Download },
                { id: "liked", label: `Liked Tracks (${likedTracks.length})`, icon: Heart },
                { id: "local", label: `Local Files (${localTracks.length})`, icon: FolderOpen },
              ].map((tabItem) => (
                <button
                  key={tabItem.id}
                  onClick={() => setOnlineTab(tabItem.id as any)}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all shrink-0",
                    onlineTab === tabItem.id
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "text-muted-foreground hover:bg-surface-raised hover:text-foreground"
                  )}
                >
                  <tabItem.icon className="h-3.5 w-3.5" />
                  {tabItem.label}
                </button>
              ))}
            </>
          )}
        </div>

        {/* ── Offline Views ── */}
        {isOffline && (
          <div>
            {/* 1. Tracks View */}
            {offlineTab === "tracks" && (
              <div>
                {localTracks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/60 p-12 text-center">
                    <Music2 className="h-10 w-10 text-muted-foreground mb-3" />
                    <h3 className="text-lg font-bold text-foreground">No local tracks imported</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-5">
                      Drop FLAC, WAV, ALAC, or MP3 files from your device to listen offline with full 10-band DSP equalization.
                    </p>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-full bg-emerald-500 text-white hover:bg-emerald-600 gap-2 text-xs font-bold"
                    >
                      <Plus className="h-3.5 w-3.5" /> Select Local Audio Files
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {localTracks.map((track) => renderTrackRow(track, localTracks))}
                  </div>
                )}
              </div>
            )}

            {/* 2. Folders View */}
            {offlineTab === "folders" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {localFolders.map((folder) => (
                  <div
                    key={folder.folderPath}
                    className="rounded-2xl border border-border/40 bg-card p-5 hover:border-emerald-500/40 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2.5 text-emerald-400 mb-2">
                        <Folder className="h-5 w-5 fill-emerald-500/20" />
                        <span className="font-bold text-sm text-foreground truncate">
                          {folder.folderPath}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {folder.trackCount} {folder.trackCount === 1 ? "track" : "tracks"} indexed
                      </p>

                      <div className="mt-4 space-y-1">
                        {folder.tracks.slice(0, 3).map((t) => (
                          <div key={t.id} className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                            <span className="h-1 w-1 rounded-full bg-emerald-400" />
                            {t.title}
                          </div>
                        ))}
                        {folder.tracks.length > 3 && (
                          <span className="text-[10px] text-muted-foreground/70 pl-2.5">
                            +{folder.tracks.length - 3} more...
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-border/30 flex items-center justify-between">
                      <Button
                        size="sm"
                        onClick={() => playTrack(folder.tracks[0], folder.tracks)}
                        className="rounded-full bg-emerald-500 text-white hover:bg-emerald-600 h-8 text-xs font-bold gap-1.5 w-full"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" /> Play Folder
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 3. Albums View */}
            {offlineTab === "albums" && (
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
                        onClick={() => playTrack(album.tracks[0], album.tracks)}
                        className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
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

            {/* 4. Artists View */}
            {offlineTab === "artists" && (
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
                        <h3 className="font-bold text-sm text-foreground truncate">{artist.artistName}</h3>
                        <p className="text-xs text-muted-foreground">
                          {artist.trackCount} local {artist.trackCount === 1 ? "track" : "tracks"}
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => playTrack(artist.tracks[0], artist.tracks)}
                      className="rounded-full bg-emerald-500 text-white hover:bg-emerald-600 h-8 text-xs font-bold gap-1 shrink-0"
                    >
                      <Play className="h-3 w-3 fill-current" /> Play
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* 5. Playlists View */}
            {offlineTab === "playlists" && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <Input
                    placeholder="New offline playlist name..."
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    className="max-w-xs rounded-full text-xs"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      createPlaylist(newPlaylistName);
                      setNewPlaylistName("");
                    }}
                    className="rounded-full bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-bold gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Create Playlist
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {localPlaylists.map((pl) => {
                    const plTracks = localTracks.filter((t) => pl.trackIds.includes(t.id));
                    return (
                      <div
                        key={pl.id}
                        className="rounded-2xl border border-border/40 bg-card p-5 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-emerald-400">
                              <ListMusic className="h-5 w-5" />
                              <h3 className="font-bold text-sm text-foreground">{pl.name}</h3>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deletePlaylist(pl.id)}
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mb-4">
                            {plTracks.length} {plTracks.length === 1 ? "track" : "tracks"}
                          </p>

                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {plTracks.map((t) => (
                              <div
                                key={t.id}
                                className="flex items-center justify-between text-xs text-muted-foreground py-0.5"
                              >
                                <span className="truncate">{t.title}</span>
                                <button
                                  onClick={() => removeTrackFromPlaylist(pl.id, t.id)}
                                  className="text-muted-foreground hover:text-destructive text-[10px] pl-2"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="mt-5 pt-3 border-t border-border/30">
                          <Button
                            size="sm"
                            disabled={plTracks.length === 0}
                            onClick={() => playTrack(plTracks[0], plTracks)}
                            className="w-full rounded-full bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-bold gap-1.5 h-8"
                          >
                            <Play className="h-3 w-3 fill-current" /> Play Playlist
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 6. Tag Editor View */}
            {offlineTab === "tags" && (
              <div className="max-w-xl rounded-3xl border border-border/40 bg-card p-6 sm:p-8">
                <h3 className="text-lg font-bold text-foreground mb-1">Local Tag & Metadata Editor</h3>
                <p className="text-xs text-muted-foreground mb-6">
                  Select any track to modify title, artist, album, and genre tags without touching cloud servers.
                </p>

                <div className="mb-4">
                  <label className="text-xs font-semibold text-muted-foreground block mb-2">
                    Select Track:
                  </label>
                  <select
                    className="w-full rounded-xl border border-border/60 bg-surface-raised px-3 py-2 text-xs text-foreground"
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
                  <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Track Title</label>
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Artist Name</label>
                      <Input
                        value={editArtist}
                        onChange={(e) => setEditArtist(e.target.value)}
                        className="rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Album Title</label>
                      <Input
                        value={editAlbum}
                        onChange={(e) => setEditAlbum(e.target.value)}
                        className="rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Genre</label>
                      <Input
                        value={editGenre}
                        onChange={(e) => setEditGenre(e.target.value)}
                        className="rounded-xl text-xs"
                      />
                    </div>

                    <div className="pt-3">
                      <Button
                        type="submit"
                        className="w-full rounded-full bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-bold gap-1.5 h-10"
                      >
                        <Check className="h-4 w-4" /> Save Metadata
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* 7. Buy Store Masters View (Direct Offline Acquisition) */}
            {offlineTab === "store" && (
              <div>
                <div className="rounded-3xl border border-border/40 bg-card p-6 sm:p-8 mb-8">
                  <div className="flex items-center gap-2 text-primary text-xs font-bold mb-1">
                    <ShoppingBag className="h-4 w-4" />
                    <span>ONLINE MUSIC STORE · DIRECT OFFLINE DOWNLOAD</span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground">Get New Masters for Your Offline Player</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                    Buy high-resolution DRM-free master tracks directly from creators. Once purchased, tracks are instantly downloaded and added directly into your Local Offline Library under <code className="text-foreground font-mono">Downloads/Purchased</code>.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {storeCatalogTracks.map((t) => (
                    <TrackCard key={t.id} track={t} />
                  ))}
                </div>
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
                  <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/60 p-12 text-center">
                    <ShoppingBag className="h-10 w-10 text-muted-foreground mb-3" />
                    <h3 className="text-lg font-bold text-foreground">No purchased masters yet</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-5">
                      Purchase DRM-free 24-bit masters directly from independent creators in the Store. 85% goes straight to the artist.
                    </p>
                    <Link to="/store">
                      <Button className="rounded-full bg-primary text-primary-foreground font-bold text-xs gap-1.5 shadow-md">
                        <ShoppingBag className="h-3.5 w-3.5" /> Explore DRM-Free Store
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
                  <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/60 p-12 text-center">
                    <Heart className="h-10 w-10 text-muted-foreground mb-3" />
                    <h3 className="text-lg font-bold text-foreground">No liked tracks</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mt-1">
                      Like tracks across the platform to build your streaming collection.
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
          </div>
        )}
      </div>

      {/* Audio Console Modal */}
      <AudioConsoleModal open={consoleOpen} onClose={() => setConsoleOpen(false)} />
    </>
  );
}
