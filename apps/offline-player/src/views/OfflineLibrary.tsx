import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Music2,
  Disc3,
  Users,
  ListMusic,
  Play,
  Pause,
  Search,
  Trash2,
  Plus,
  Edit2,
  Check,
  X,
  UploadCloud,
  FolderOpen,
  Volume2,
  Heart,
  FileText,
  Sliders,
  Sparkles,
  WifiOff,
  HardDrive,
  Layers,
  ArrowRight,
  Disc,
} from "lucide-react";
import { BrandLogo } from "@layam/design-system";
import { usePlayer } from "@/lib/player";
import { useLocalVault } from "../providers/LocalVaultProvider";
import {
  OfflineService,
  LocalLyricsService,
  LocalFavoritesService,
  LocalHistoryService,
  type LocalTrack,
  type StoredTrackLyrics,
} from "@layam/storage-core";

type PrimaryTab = "dashboard" | "tracks" | "albums" | "artists" | "playlists" | "favorites";

interface ImportProgressState {
  isImporting: boolean;
  current: number;
  total: number;
  filename: string;
  stage: string;
}

function formatSeconds(secs: number): string {
  if (isNaN(secs) || secs < 0) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export function OfflineLibrary() {
  const {
    currentTrack,
    isPlaying,
    playTrack,
    togglePlay,
    openConsole,
  } = usePlayer();

  console.log("LIBRARY PLAYER STATE", {
    currentTrack,
    isPlaying,
  });

  const {
    localTracks,
    localAlbums,
    localArtistGroups,
    localPlaylists,
    importLocalFiles,
    removeLocalTrack,
    createPlaylist,
    deletePlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    updateTrackTags,
  } = useLocalVault();

  const [activeTab, setActiveTab] = useState<PrimaryTab>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  // Unified Toggle/Play logic
  const handleTrackClick = (track: LocalTrack, trackList?: LocalTrack[]) => {
    console.log("TRACK CLICKED", track);
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      playTrack(track, trackList || localTracks);
    }
    console.log("AFTER PLAY CALL");
  };

  // Hidden inputs for header & hero actions
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Favorites state
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    LocalFavoritesService.getAllFavoriteIds().then((ids) => {
      setFavoriteIds(new Set(ids));
    });
  }, []);

  const handleToggleFavorite = async (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isFav = await LocalFavoritesService.toggleFavorite(trackId);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (isFav) next.add(trackId);
      else next.delete(trackId);
      return next;
    });
  };

  // Import Progress State
  const [importProgress, setImportProgress] = useState<ImportProgressState | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Tag editing state
  const [editingTrack, setEditingTrack] = useState<LocalTrack | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editArtist, setEditArtist] = useState("");
  const [editAlbum, setEditAlbum] = useState("");

  // Add to Playlist modal state
  const [playlistTrack, setPlaylistTrack] = useState<LocalTrack | null>(null);

  // Lyrics Modal state
  const [lyricsTrack, setLyricsTrack] = useState<LocalTrack | null>(null);
  const [currentLyrics, setCurrentLyrics] = useState<StoredTrackLyrics | null>(null);

  // File Handlers
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setImportProgress({
        isImporting: true,
        current: 0,
        total: files.length,
        filename: "Scanning audio files...",
        stage: "Reading file headers",
      });
      await importLocalFiles(files);
      setImportProgress(null);
    }
    e.target.value = "";
  };

  // Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      setImportProgress({
        isImporting: true,
        current: 0,
        total: files.length,
        filename: "Importing dropped files...",
        stage: "Extracting lossless PCM stream",
      });
      await importLocalFiles(files);
      setImportProgress(null);
    }
  };

  // Telemetry Metrics Calculation
  const totalSizeBytes = useMemo(() => {
    return localTracks.reduce((acc, t) => acc + (t.fileSizeBytes || 15 * 1024 * 1024), 0);
  }, [localTracks]);

  const storageUsedMb = useMemo(() => {
    return (totalSizeBytes / (1024 * 1024)).toFixed(1);
  }, [totalSizeBytes]);

  const storageUsedGb = useMemo(() => {
    return (totalSizeBytes / (1024 * 1024 * 1024)).toFixed(2);
  }, [totalSizeBytes]);

  const formatsSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of localTracks) {
      const fmt = t.format || "FLAC";
      counts[fmt] = (counts[fmt] || 0) + 1;
    }
    return counts;
  }, [localTracks]);

  // Filtered tracks
  const filteredTracks = useMemo(() => {
    if (!searchQuery.trim()) return localTracks;
    const q = searchQuery.toLowerCase();
    return localTracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.artistName || "").toLowerCase().includes(q) ||
        (t.album || "").toLowerCase().includes(q) ||
        (t.format || "").toLowerCase().includes(q)
    );
  }, [localTracks, searchQuery]);

  const favoriteTracks = useMemo(() => {
    return localTracks.filter((t) => favoriteIds.has(t.id));
  }, [localTracks, favoriteIds]);

  const recentTracks = useMemo(() => {
    return localTracks.slice(0, 6);
  }, [localTracks]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative mx-auto max-w-7xl px-4 py-6 pb-40 sm:px-6 lg:px-8"
    >
      {/* Hidden file inputs */}
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
        // @ts-expect-error webkitdirectory standard
        webkitdirectory=""
        className="hidden"
      />

      {/* ── Viewport Drag & Drop Overlay ── */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#090a0c]/92 p-6 backdrop-blur-md pointer-events-none">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#16181e] text-[#e59e38] border border-[#e59e38]/40 mb-4 shadow-[0_0_24px_rgba(229,158,56,0.2)]">
            <UploadCloud className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-[#f2f3f5] tracking-wide">Drop Music Files to Import</h3>
          <p className="text-xs text-[#9ba1ad] mt-1 font-mono uppercase tracking-wider">
            FLAC • WAV • ALAC • MP3 • AAC
          </p>
        </div>
      )}

      {/* ── Import Progress Modal ── */}
      {importProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050608]/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#111216] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#e59e38] animate-pulse" />
                <h3 className="text-xs font-mono font-bold tracking-widest text-[#e59e38] uppercase">
                  Building Audio Vault
                </h3>
              </div>
              <span className="text-xs font-mono font-semibold text-[#9ba1ad] tabular-nums">
                {Math.round((importProgress.current / Math.max(importProgress.total, 1)) * 100)}%
              </span>
            </div>

            <div className="relative h-2 w-full overflow-hidden rounded-full bg-[#060708] border border-white/[0.06] mb-4">
              <div
                style={{
                  width: `${Math.min(100, (importProgress.current / Math.max(importProgress.total, 1)) * 100)}%`,
                }}
                className="h-full bg-gradient-to-r from-[#e59e38] to-amber-300 transition-all duration-150"
              />
            </div>
            <p className="text-xs font-medium text-[#f2f3f5] truncate">{importProgress.filename}</p>
            <p className="text-[10px] text-[#6b7280] font-mono mt-1">{importProgress.stage}</p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 1. ORIGINAL OFFLINE HARDWARE CONSOLE HERO BANNER                       */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-3xl border border-[#e59e38]/30 bg-gradient-to-br from-[#16181e] via-[#0c0d10] to-[#090a0c] p-6 sm:p-10 mb-8 shadow-2xl">
        <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-[#e59e38]/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#e59e38]/40 bg-[#e59e38]/15 px-3.5 py-1 text-xs font-bold text-[#e59e38] mb-4">
            <WifiOff className="h-3.5 w-3.5" />
            <span className="tracking-wide">OFFLINE AUDIOPHILE CONSOLE · ZERO NETWORK ACTIVE</span>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-[#f2f3f5] sm:text-4xl">
            Hi-Fi Local Player & <br />
            <span className="text-[#e59e38]">DSP Audio Console</span>
          </h1>

          <p className="mt-3 text-xs sm:text-sm text-[#9ba1ad] leading-relaxed">
            Direct bit-perfect hardware playback from your local device storage. Supports uncompressed 24-bit/192kHz FLAC, WAV, and ALAC with real-time 10-band parametric equalization.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => folderInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl bg-[#e59e38] px-4 py-2.5 text-xs font-bold text-[#090a0c] hover:bg-[#f0ab4d] active:bg-[#d48d2a] shadow-lg shadow-[#e59e38]/20 transition-colors cursor-pointer"
            >
              <FolderOpen className="h-4 w-4 stroke-[2.5]" />
              Scan Music Folder
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#16181e] px-4 py-2.5 text-xs font-semibold text-[#f2f3f5] hover:bg-[#1e2027] transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4 text-[#e59e38]" />
              Add Audio Files
            </button>

            <button
              onClick={openConsole}
              className="inline-flex items-center gap-2 rounded-xl border border-[#e59e38]/40 bg-[#e59e38]/10 px-4 py-2.5 text-xs font-bold text-[#e59e38] hover:bg-[#e59e38]/20 transition-colors cursor-pointer"
            >
              <Sliders className="h-4 w-4" />
              Open Audio Console
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 2. AUDIOPHILE HARDWARE STATS & TELEMETRY CARDS                         */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 mb-8">
        {/* Track Count */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0c0d10] p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#9ba1ad] font-semibold">Local Tracks</p>
            <Music2 className="h-4 w-4 text-[#e59e38]" />
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#f2f3f5]">{localTracks.length}</p>
          <p className="text-[10px] sm:text-[11px] text-[#6b7280] mt-1 font-mono">Indexed in local vault</p>
        </div>

        {/* Albums */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0c0d10] p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#9ba1ad] font-semibold">Local Albums</p>
            <Disc3 className="h-4 w-4 text-[#e59e38]" />
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#f2f3f5]">{localAlbums.length}</p>
          <p className="text-[10px] sm:text-[11px] text-[#6b7280] mt-1 font-mono">Discovered groups</p>
        </div>

        {/* Storage Meter */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0c0d10] p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#9ba1ad] font-semibold">Local Storage</p>
            <HardDrive className="h-4 w-4 text-[#e59e38]" />
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#f2f3f5]">
            {parseFloat(storageUsedGb) >= 1 ? `${storageUsedGb} GB` : `${storageUsedMb} MB`}
          </p>
          <p className="text-[10px] sm:text-[11px] text-[#6b7280] mt-1 font-mono">IndexedDB local vault</p>
        </div>

        {/* Master Formats Breakdown */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0c0d10] p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#9ba1ad] font-semibold">Master Formats</p>
            <Layers className="h-4 w-4 text-[#e59e38]" />
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {Object.keys(formatsSummary).length > 0 ? (
              Object.entries(formatsSummary).map(([fmt, count]) => (
                <span
                  key={fmt}
                  className="rounded bg-[#16181e] border border-white/[0.06] px-1.5 py-0.5 text-[10px] font-mono text-[#e59e38]"
                >
                  {fmt}: {count}
                </span>
              ))
            ) : (
              <span className="text-xs text-[#6b7280] font-mono">FLAC / WAV / ALAC</span>
            )}
          </div>
          <p className="text-[10px] text-[#6b7280] mt-1 font-mono">Bit-perfect decode</p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 3. LUXURY NAVIGATION TABS & SEARCH BAR                                */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.07] pb-4 mb-6">
        <div className="flex flex-wrap items-center gap-1.5 bg-[#0c0d10] p-1 rounded-xl border border-white/[0.06]">
          {[
            { id: "dashboard" as const, label: "Dashboard", icon: Disc },
            { id: "tracks" as const, label: `Tracks (${localTracks.length})`, icon: Music2 },
            { id: "albums" as const, label: `Albums (${localAlbums.length})`, icon: Disc3 },
            { id: "artists" as const, label: "Artists", icon: Users },
            { id: "playlists" as const, label: `Playlists (${localPlaylists.length})`, icon: ListMusic },
            { id: "favorites" as const, label: `Favorites (${favoriteTracks.length})`, icon: Heart },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? "bg-[#16181e] text-[#e59e38] border border-white/[0.08] shadow-sm"
                  : "text-[#9ba1ad] hover:text-[#f2f3f5]"
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6b7280]" />
          <input
            type="text"
            placeholder="Search titles, artists, formats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/[0.06] bg-[#0c0d10] py-2 pl-9 pr-3 text-xs text-[#f2f3f5] placeholder-[#6b7280] focus:border-[#e59e38]/50 focus:outline-none"
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 4. DASHBOARD VIEW (HERO + RECENT MASTERS + ALBUMS SHOWCASE)           */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "dashboard" && (
        <div className="space-y-10">
          {/* Recent Local Masters Grid */}
          {recentTracks.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[#f2f3f5] tracking-tight">
                    Recent Master Tracks
                  </h2>
                  <p className="text-xs text-[#9ba1ad]">Lossless audio loaded from your local device.</p>
                </div>
                <button
                  onClick={() => setActiveTab("tracks")}
                  className="text-xs font-semibold text-[#e59e38] hover:underline cursor-pointer flex items-center gap-1"
                >
                  View all tracks <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {recentTracks.map((track) => {
                  const isCurrent = currentTrack?.id === track.id;
                  return (
                    <div
                      key={track.id}
                      onClick={() => handleTrackClick(track, localTracks)}
                      className={`group flex items-center gap-3.5 rounded-2xl border p-3.5 transition-all cursor-pointer ${
                        isCurrent
                          ? "border-[#e59e38] bg-[#e59e38]/10 shadow-[0_0_20px_rgba(229,158,56,0.15)]"
                          : "border-white/[0.06] bg-[#0c0d10] hover:border-white/[0.12] hover:bg-[#111216]"
                      }`}
                    >
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#16181e] border border-white/[0.06]">
                        <img
                          src={track.coverImage || "/logo.png"}
                          alt={track.title}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isCurrent && isPlaying ? (
                            <Pause className="h-5 w-5 text-[#e59e38] fill-current" />
                          ) : (
                            <Play className="h-5 w-5 text-[#e59e38] fill-current ml-0.5" />
                          )}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs sm:text-sm font-semibold text-[#f2f3f5] group-hover:text-[#e59e38] transition-colors">
                          {track.title}
                        </p>
                        <p className="truncate text-xs text-[#9ba1ad]">{track.artistName || "Local Artist"}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="rounded bg-[#16181e] border border-white/[0.06] px-1.5 py-0.2 text-[9px] font-mono text-[#e59e38]">
                            {track.quality || "FLAC 24/96"}
                          </span>
                          <span className="text-[10px] font-mono text-[#6b7280]">
                            {formatSeconds(track.duration || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Local Albums Showcase */}
          {localAlbums.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[#f2f3f5] tracking-tight">
                    Local Albums
                  </h2>
                  <p className="text-xs text-[#9ba1ad]">Albums detected in your local collection.</p>
                </div>
                <button
                  onClick={() => setActiveTab("albums")}
                  className="text-xs font-semibold text-[#e59e38] hover:underline cursor-pointer flex items-center gap-1"
                >
                  Browse all albums <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {localAlbums.slice(0, 4).map((album) => (
                  <div
                    key={album.name}
                    className="group rounded-2xl border border-white/[0.06] bg-[#0c0d10] p-3.5 hover:border-[#e59e38]/40 transition-all flex flex-col cursor-pointer"
                    onClick={() => handleTrackClick(album.tracks[0], album.tracks)}
                  >
                    <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[#16181e] mb-3 border border-white/[0.06]">
                      <img
                        src={album.coverImage}
                        alt={album.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e59e38] text-[#090a0c] shadow-xl hover:scale-110 transition-transform">
                          <Play className="h-5 w-5 fill-current ml-0.5" />
                        </div>
                      </div>
                    </div>

                    <h3 className="font-bold text-xs sm:text-sm text-[#f2f3f5] truncate group-hover:text-[#e59e38] transition-colors">
                      {album.name}
                    </h3>
                    <p className="text-xs text-[#9ba1ad] truncate mt-0.5">{album.artistName}</p>
                    <span className="text-[10px] font-mono text-[#6b7280] mt-1">
                      {album.trackCount} {album.trackCount === 1 ? "track" : "tracks"}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Empty Vault State */}
          {localTracks.length === 0 && (
            <div className="rounded-3xl border border-white/[0.06] bg-[#0c0d10] p-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#16181e] text-[#e59e38] mx-auto mb-4 border border-white/[0.08]">
                <HardDrive className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold text-[#f2f3f5]">Your local audio vault is empty</h3>
              <p className="text-xs text-[#9ba1ad] max-w-md mx-auto mt-2 leading-relaxed">
                Scan your music folder or import audio files directly from your computer. Everything is stored privately inside your device's browser vault.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  onClick={() => folderInputRef.current?.click()}
                  className="rounded-xl bg-[#e59e38] px-4 py-2 text-xs font-bold text-[#090a0c] hover:bg-[#f0ab4d] cursor-pointer"
                >
                  Scan Music Folder
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl border border-white/[0.08] bg-[#16181e] px-4 py-2 text-xs font-semibold text-[#f2f3f5] hover:bg-[#1e2027] cursor-pointer"
                >
                  Add Files
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 5. ALL TRACKS CATALOG TABLE                                           */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "tracks" && (
        <div className="rounded-2xl border border-white/[0.06] bg-[#0c0d10] overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/[0.07] bg-[#07080a] text-[#6b7280] font-mono text-[10px] uppercase">
              <tr>
                <th className="py-3 pl-4 pr-2 w-12">#</th>
                <th className="py-3 px-3">Title</th>
                <th className="py-3 px-3 hidden sm:table-cell">Artist</th>
                <th className="py-3 px-3 hidden md:table-cell">Album</th>
                <th className="py-3 px-3">Quality</th>
                <th className="py-3 px-3 text-right">Duration</th>
                <th className="py-3 pr-4 pl-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredTracks.map((track, idx) => {
                const isCurrent = currentTrack?.id === track.id;
                const isFav = favoriteIds.has(track.id);
                return (
                  <tr
                    key={track.id}
                    onClick={() => handleTrackClick(track, localTracks)}
                    className={`group cursor-pointer transition-colors ${
                      isCurrent
                        ? "bg-[#e59e38]/10 text-[#e59e38]"
                        : "hover:bg-white/[0.03] text-[#f2f3f5]"
                    }`}
                  >
                    <td className="py-3 pl-4 pr-2 font-mono text-[#6b7280]">
                      {isCurrent && isPlaying ? (
                        <Volume2 className="h-3.5 w-3.5 text-[#e59e38] animate-pulse" />
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-semibold">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={track.coverImage || "/logo.png"}
                          alt=""
                          className="h-7 w-7 rounded-lg object-cover bg-[#16181e] shrink-0"
                        />
                        <span className="truncate max-w-[200px] sm:max-w-xs">{track.title}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-[#9ba1ad] hidden sm:table-cell truncate max-w-[150px]">
                      {track.artistName || "Local Artist"}
                    </td>

                    <td className="py-3 px-3 text-[#9ba1ad] hidden md:table-cell truncate max-w-[150px]">
                      {track.album || "Single Tracks"}
                    </td>

                    <td className="py-3 px-3">
                      <span className="rounded bg-[#16181e] border border-white/[0.06] px-1.5 py-0.5 text-[9px] font-mono text-[#e59e38]">
                        {track.quality || "FLAC 24/96"}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-[#6b7280]">
                      {formatSeconds(track.duration || 0)}
                    </td>

                    <td className="py-3 pr-4 pl-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={(e) => handleToggleFavorite(track.id, e)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isFav
                              ? "text-rose-400"
                              : "text-[#6b7280] hover:text-[#f2f3f5] opacity-0 group-hover:opacity-100"
                          }`}
                          title={isFav ? "Favorited" : "Favorite"}
                        >
                          <Heart className={`h-3.5 w-3.5 ${isFav ? "fill-current" : ""}`} />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTrack(track);
                            setEditTitle(track.title);
                            setEditArtist(track.artistName || "");
                            setEditAlbum(track.album || "");
                          }}
                          className="p-1.5 text-[#6b7280] hover:text-[#e59e38] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Edit Metadata"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeLocalTrack(track.id);
                          }}
                          className="p-1.5 text-[#6b7280] hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Remove from vault"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 6. ALBUMS GRID VIEW                                                   */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "albums" && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {localAlbums.map((album) => (
            <div
              key={album.name}
              onClick={() => handleTrackClick(album.tracks[0], album.tracks)}
              className="group rounded-2xl border border-white/[0.06] bg-[#0c0d10] p-3.5 hover:border-[#e59e38]/40 transition-all flex flex-col cursor-pointer"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[#16181e] mb-3 border border-white/[0.06]">
                <img
                  src={album.coverImage}
                  alt={album.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e59e38] text-[#090a0c] shadow-xl hover:scale-110 transition-transform">
                    <Play className="h-5 w-5 fill-current ml-0.5" />
                  </div>
                </div>
              </div>

              <h3 className="font-bold text-xs sm:text-sm text-[#f2f3f5] truncate group-hover:text-[#e59e38] transition-colors">
                {album.name}
              </h3>
              <p className="text-xs text-[#9ba1ad] truncate mt-0.5">{album.artistName}</p>
              <span className="text-[10px] font-mono text-[#6b7280] mt-1">
                {album.trackCount} {album.trackCount === 1 ? "track" : "tracks"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 7. PLAYLISTS VIEW                                                     */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "playlists" && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Create new playlist name..."
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              className="rounded-xl border border-white/[0.08] bg-[#0c0d10] px-3.5 py-2 text-xs text-[#f2f3f5] placeholder-[#6b7280] focus:border-[#e59e38] focus:outline-none"
            />
            <button
              onClick={() => {
                if (newPlaylistName.trim()) {
                  createPlaylist(newPlaylistName);
                  setNewPlaylistName("");
                }
              }}
              className="rounded-xl bg-[#e59e38] px-4 py-2 text-xs font-bold text-[#090a0c] hover:bg-[#f0ab4d] cursor-pointer"
            >
              Create Playlist
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {localPlaylists.map((pl) => (
              <div
                key={pl.id}
                className="rounded-2xl border border-white/[0.06] bg-[#0c0d10] p-4 flex flex-col justify-between"
              >
                <div>
                  <h4 className="font-bold text-sm text-[#f2f3f5]">{pl.name}</h4>
                  <p className="text-xs text-[#6b7280] font-mono mt-1">
                    {pl.trackIds.length} tracks • Created {pl.createdAt}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <button
                    onClick={() => {
                      const plTracks = localTracks.filter((t) => pl.trackIds.includes(t.id));
                      if (plTracks.length > 0) handleTrackClick(plTracks[0], plTracks);
                    }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#e59e38] hover:underline cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" /> Play Mix
                  </button>
                  <button
                    onClick={() => deletePlaylist(pl.id)}
                    className="text-[#6b7280] hover:text-rose-400 p-1 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 8. FAVORITES VIEW                                                     */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "favorites" && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-[#f2f3f5]">Favorited Masters ({favoriteTracks.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {favoriteTracks.map((track) => (
              <div
                key={track.id}
                onClick={() => handleTrackClick(track, favoriteTracks)}
                className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-[#0c0d10] p-3 hover:border-white/[0.12] transition-colors cursor-pointer"
              >
                <img
                  src={track.coverImage || "/logo.png"}
                  alt=""
                  className="h-11 w-11 rounded-xl object-cover bg-[#16181e] shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-xs text-[#f2f3f5] truncate">{track.title}</p>
                  <p className="text-xs text-[#9ba1ad] truncate">{track.artistName}</p>
                </div>
                <Heart className="h-4 w-4 text-rose-400 fill-current shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tag Editing Modal ── */}
      {editingTrack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#111216] p-6 shadow-2xl space-y-4">
            <h4 className="font-bold text-sm text-[#f2f3f5]">Edit Track Metadata</h4>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[#9ba1ad] block mb-1">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#0c0d10] p-2 text-[#f2f3f5] focus:outline-none focus:border-[#e59e38]"
                />
              </div>
              <div>
                <label className="text-[#9ba1ad] block mb-1">Artist</label>
                <input
                  type="text"
                  value={editArtist}
                  onChange={(e) => setEditArtist(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#0c0d10] p-2 text-[#f2f3f5] focus:outline-none focus:border-[#e59e38]"
                />
              </div>
              <div>
                <label className="text-[#9ba1ad] block mb-1">Album</label>
                <input
                  type="text"
                  value={editAlbum}
                  onChange={(e) => setEditAlbum(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#0c0d10] p-2 text-[#f2f3f5] focus:outline-none focus:border-[#e59e38]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingTrack(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#9ba1ad] hover:text-[#f2f3f5] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  updateTrackTags(editingTrack.id, {
                    title: editTitle,
                    artistName: editArtist,
                    artist: editArtist,
                    album: editAlbum,
                  });
                  setEditingTrack(null);
                }}
                className="px-4 py-1.5 rounded-lg bg-[#e59e38] text-xs font-bold text-[#090a0c] hover:bg-[#f0ab4d] cursor-pointer"
              >
                Save Tags
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OfflineLibrary;
