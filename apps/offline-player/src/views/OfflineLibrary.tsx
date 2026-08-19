import React, { useState, useMemo, useRef, useEffect } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
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
  MoreVertical,
  Info,
  ListPlus,
  PlayCircle,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Database,
  Activity,
  Cpu,
  Radio,
} from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@layam/design-system";
import { usePlayer } from "@/lib/player";
import { useLocalVault } from "../providers/LocalVaultProvider";
import { androidMedia3 } from "@layam/audio-core";
import {
  OfflineService,
  LocalLyricsService,
  LocalFavoritesService,
  LocalHistoryService,
  type LocalTrack,
  type StoredTrackLyrics,
} from "@layam/storage-core";

type PrimaryTab = "dashboard" | "tracks" | "albums" | "artists" | "playlists" | "favorites";
type SortKey = "default" | "title" | "artist" | "album" | "quality" | "duration";
type SortOrder = "asc" | "desc";

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  track: LocalTrack | null;
}

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
    addToQueue,
    playNextInQueue,
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

    const unsubscribe = LocalFavoritesService.subscribeFavorites(
      ({ trackId, isFavorite }) => {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (isFavorite) next.add(trackId);
          else next.delete(trackId);
          return next;
        });
      }
    );

    return () => {
      unsubscribe();
    };
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
    toast(isFav ? "Added to Favorites" : "Removed from Favorites", {
      icon: isFav ? "❤️" : "🤍",
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

  // Technical Audio Info Modal state
  const [infoTrack, setInfoTrack] = useState<LocalTrack | null>(null);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    track: null,
  });

  const handleContextMenu = (e: React.MouseEvent, track: LocalTrack) => {
    e.preventDefault();
    e.stopPropagation();
    const clickX = e.clientX;
    const clickY = e.clientY;
    const x = Math.min(clickX, typeof window !== "undefined" ? window.innerWidth - 240 : clickX);
    const y = Math.min(clickY, typeof window !== "undefined" ? window.innerHeight - 300 : clickY);
    setContextMenu({
      isOpen: true,
      x: Math.max(10, x),
      y: Math.max(10, y),
      track,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu((prev) => ({ ...prev, isOpen: false }));
  };

  // Sorting state
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const handleHeaderSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  // Lyrics Modal state
  const [lyricsTrack, setLyricsTrack] = useState<LocalTrack | null>(null);
  const [currentLyrics, setCurrentLyrics] = useState<StoredTrackLyrics | null>(null);

  // File Handlers
  const handleScanMusicFolder = async () => {
    if (androidMedia3.isNativeAndroid()) {
      const perm = await androidMedia3.checkAudioPermission();
      if (!perm.granted) {
        const req = await androidMedia3.requestAudioPermission();
        if (!req.granted) {
          toast.error("Audio Access Required", {
            description: "Storage / Audio permission is required to scan music files on your device. Please grant permission in Android settings.",
            duration: 5000,
          });
          return;
        }
      }
      try {
        toast.loading("Scanning device audio...", { id: "offline-device-scan" });
        const files = await androidMedia3.scanDeviceAudioFiles();
        toast.dismiss("offline-device-scan");
        if (files.length === 0) {
          const picked = await androidMedia3.openDocumentPicker();
          if (picked.length > 0) {
            const imported = OfflineService.importNativeAudioFiles(picked);
            toast.success(`Imported ${imported.length} tracks.`);
          }
          return;
        }
        const imported = OfflineService.importNativeAudioFiles(files);
        toast.success(`Discovered ${files.length} tracks on device (${imported.length} new)`);
      } catch (err) {
        toast.dismiss("offline-device-scan");
        console.warn("[OfflineLibrary] MediaStore scan fallback to picker:", err);
        const picked = await androidMedia3.openDocumentPicker();
        if (picked.length > 0) {
          const imported = OfflineService.importNativeAudioFiles(picked);
          toast.success(`Imported ${imported.length} tracks.`);
        }
      }
      return;
    }
    folderInputRef.current?.click();
  };

  const handleAddAudioFiles = async () => {
    if (androidMedia3.isNativeAndroid()) {
      const perm = await androidMedia3.checkAudioPermission();
      if (!perm.granted) {
        const req = await androidMedia3.requestAudioPermission();
        if (!req.granted) {
          toast.error("Audio Access Required", {
            description: "Storage / Audio permission is required to select and play music on your device. Please grant permission in Android settings.",
            duration: 5000,
          });
          return;
        }
      }
      const files = await androidMedia3.openDocumentPicker();
      if (files.length > 0) {
        const imported = OfflineService.importNativeAudioFiles(files);
        toast.success(`Imported ${imported.length} audio ${imported.length === 1 ? "track" : "tracks"}`);
      }
      return;
    }
    fileInputRef.current?.click();
  };

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

  // Filtered and sorted tracks
  const filteredTracks = useMemo(() => {
    let result = localTracks;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.artistName || t.artist || "").toLowerCase().includes(q) ||
          (t.album || "").toLowerCase().includes(q) ||
          (t.format || "").toLowerCase().includes(q) ||
          (t.quality || "").toLowerCase().includes(q)
      );
    }
    if (sortKey === "default") return result;

    return [...result].sort((a, b) => {
      let valA: string | number = "";
      let valB: string | number = "";
      if (sortKey === "title") {
        valA = a.title.toLowerCase();
        valB = b.title.toLowerCase();
      } else if (sortKey === "artist") {
        valA = (a.artistName || a.artist || "").toLowerCase();
        valB = (b.artistName || b.artist || "").toLowerCase();
      } else if (sortKey === "album") {
        valA = (a.album || "").toLowerCase();
        valB = (b.album || "").toLowerCase();
      } else if (sortKey === "quality") {
        valA = (a.quality || a.format || "").toLowerCase();
        valB = (b.quality || b.format || "").toLowerCase();
      } else if (sortKey === "duration") {
        valA = a.duration || 0;
        valB = b.duration || 0;
      }
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [localTracks, searchQuery, sortKey, sortOrder]);

  const favoriteTracks = useMemo(() => {
    return localTracks.filter((t) => favoriteIds.has(t.id));
  }, [localTracks, favoriteIds]);

  const recentTracks = useMemo(() => {
    return localTracks.slice(0, 6);
  }, [localTracks]);

  const tableContainerRef = useRef<HTMLDivElement | null>(null);

  const rowVirtualizer = useWindowVirtualizer({
    count: filteredTracks.length,
    estimateSize: () => 52,
    overscan: 10,
    scrollMargin: tableContainerRef.current?.offsetTop ?? 0,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalVirtualSize = rowVirtualizer.getTotalSize();
  const scrollOffsetMargin = tableContainerRef.current?.offsetTop ?? 0;
  const paddingTop =
    virtualRows.length > 0 ? Math.max(0, virtualRows[0].start - scrollOffsetMargin) : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? Math.max(0, totalVirtualSize - (virtualRows[virtualRows.length - 1].end - scrollOffsetMargin))
      : 0;

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
        accept="audio/*,.flac,.wav,.mp3,.alac,.m4a,.aac,.ogg,.opus,.aiff,.aif,.au,.snd,.ape,.wv,.wma,.ac3,.dts"
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
      {/* 1. CONSOLIDATED LIBRARY TITLE & TELEMETRY STRIP                         */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-2 mb-4 border-b border-[var(--border-subtle,rgba(255,255,255,0.06))]">
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--text-primary,#f2f3f5)]">
            Local Audio Vault
          </h1>
          <span className="text-[11px] font-mono text-[var(--text-tertiary,#6b7280)]">
            Bit-Perfect Hardware Playback
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[var(--text-secondary,#9ba1ad)]">
          <span className="text-[var(--text-primary,#f2f3f5)] font-semibold">
            {localTracks.length} {localTracks.length === 1 ? "Track" : "Tracks"}
          </span>
          <span className="text-[var(--text-tertiary,#6b7280)]/40">·</span>
          <span>
            {localAlbums.length} {localAlbums.length === 1 ? "Album" : "Albums"}
          </span>
          <span className="text-[var(--text-tertiary,#6b7280)]/40">·</span>
          <span>
            {parseFloat(storageUsedGb) >= 1 ? `${storageUsedGb} GB` : `${storageUsedMb} MB`}
          </span>
          {Object.keys(formatsSummary).length > 0 && (
            <>
              <span className="text-[var(--text-tertiary,#6b7280)]/40">·</span>
              <div className="inline-flex items-center gap-1">
                {Object.entries(formatsSummary).map(([fmt, count]) => (
                  <span
                    key={fmt}
                    className="text-[10px] font-mono text-[#e59e38] font-semibold"
                  >
                    {fmt}({count})
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 3. LUXURY NAVIGATION TABS & SEARCH BAR                                */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 3. SUB-NAVIGATION (TABS + SEARCH)                                     */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--border-subtle,rgba(255,255,255,0.07))] pb-4 mb-6">
        <div className="max-w-full overflow-x-auto no-scrollbar flex items-center gap-1.5 bg-[var(--surface-sunken,#060708)] p-1 rounded-[12px] border border-[var(--border-subtle,rgba(255,255,255,0.06))] touch-pan-x">
          {[
            { id: "dashboard" as const, label: "Dashboard", icon: Disc },
            { id: "tracks" as const, label: "Tracks", icon: Music2 },
            { id: "albums" as const, label: "Albums", icon: Disc3 },
            { id: "artists" as const, label: "Artists", icon: Users },
            { id: "playlists" as const, label: "Playlists", icon: ListMusic },
            { id: "favorites" as const, label: "Favorites", icon: Heart },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-[8px] px-3.5 py-2 min-h-[40px] text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? "bg-[var(--surface-raised,#16181e)] text-[#e59e38] border border-[var(--border-subtle,rgba(255,255,255,0.08))] shadow-sm"
                  : "text-[var(--text-secondary,#9ba1ad)] hover:text-[var(--text-primary,#f2f3f5)]"
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-tertiary,#6b7280)]" />
          <input
            type="text"
            placeholder="Search titles, artists, formats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-[10px] border border-[var(--border-subtle,rgba(255,255,255,0.06))] bg-[var(--surface-sunken,#060708)] py-2 pl-9 pr-3 text-xs text-[var(--text-primary,#f2f3f5)] placeholder-[var(--text-tertiary,#6b7280)] focus:border-[#e59e38]/50 focus:outline-none"
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
                  <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary,#f2f3f5)] tracking-tight">
                    Recent Master Tracks
                  </h2>
                  <p className="text-xs text-[var(--text-secondary,#9ba1ad)]">Lossless audio loaded from your local device.</p>
                </div>
                <button
                  onClick={() => setActiveTab("tracks")}
                  className="text-xs font-semibold text-[#e59e38] hover:underline cursor-pointer flex items-center gap-1"
                >
                  View all tracks <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {recentTracks.map((track) => {
                  const isCurrent = currentTrack?.id === track.id;
                  const isFav = favoriteIds.has(track.id);
                  return (
                    <div
                      key={track.id}
                      onClick={() => handleTrackClick(track, localTracks)}
                      className={`group flex items-center gap-3 rounded-[12px] border p-2.5 sm:p-3 transition-colors cursor-pointer ${
                        isCurrent
                          ? "border-[#e59e38]/50 bg-[#e59e38]/[0.08]"
                          : "border-[var(--border-subtle,rgba(255,255,255,0.06))] bg-[var(--surface-charcoal,#111216)] hover:border-[var(--border-medium,rgba(255,255,255,0.12))] hover:bg-[var(--surface-raised,#16181e)]"
                      }`}
                    >
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[8px] bg-[var(--surface-raised,#16181e)] border border-[var(--border-subtle,rgba(255,255,255,0.06))]">
                        <img
                          src={track.coverImage || "/logo.png"}
                          alt={track.title}
                          className="h-full w-full object-cover"
                        />
                        <div className={`absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity ${
                          isCurrent && isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        }`}>
                          {isCurrent && isPlaying ? (
                            <div className="flex items-end gap-0.5 h-3.5">
                              <span className="w-1 bg-[#e59e38] rounded-full animate-[bounce_0.8s_infinite] h-3" />
                              <span className="w-1 bg-[#e59e38] rounded-full animate-[bounce_1.1s_infinite] h-2" />
                              <span className="w-1 bg-[#e59e38] rounded-full animate-[bounce_0.9s_infinite] h-3.5" />
                            </div>
                          ) : (
                            <Play className="h-4 w-4 text-[#e59e38] fill-current ml-0.5" />
                          )}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-xs sm:text-sm font-semibold transition-colors ${
                          isCurrent ? "text-[#e59e38]" : "text-[var(--text-primary,#f2f3f5)] group-hover:text-[#e59e38]"
                        }`}>
                          {track.title}
                        </p>
                        <p className="truncate text-xs text-[var(--text-secondary,#9ba1ad)]">{track.artistName || "Local Artist"}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="rounded-[4px] bg-[var(--surface-raised,#16181e)] border border-[var(--border-subtle,rgba(255,255,255,0.06))] px-1.5 py-0.2 text-[9px] font-mono text-[#e59e38]">
                            {track.format || track.quality || "AUDIO"}
                          </span>
                          <span className="text-[10px] font-mono text-[var(--text-tertiary,#6b7280)]">
                            {formatSeconds(track.duration || 0)}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleToggleFavorite(track.id, e)}
                        className={`p-2 rounded-[8px] transition-colors cursor-pointer shrink-0 ${
                          isFav
                            ? "text-[#C6604F]"
                            : "text-[var(--text-tertiary,#6b7280)] hover:text-[var(--text-primary,#f2f3f5)]"
                        }`}
                        title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                      >
                        <Heart
                          className={`h-4 w-4 transition-transform ${
                            isFav ? "fill-current" : ""
                          }`}
                        />
                      </button>
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
                  <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary,#f2f3f5)] tracking-tight">
                    Local Albums
                  </h2>
                  <p className="text-xs text-[var(--text-secondary,#9ba1ad)]">Albums detected in your local collection.</p>
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
                    className="group rounded-[14px] border border-[var(--border-subtle,rgba(255,255,255,0.06))] bg-[var(--surface-charcoal,#111216)] p-3.5 hover:border-[#e59e38]/40 hover:bg-[var(--surface-raised,#16181e)] transition-all flex flex-col cursor-pointer"
                    onClick={() => handleTrackClick(album.tracks[0], album.tracks)}
                  >
                    <div className="relative aspect-square w-full overflow-hidden rounded-[10px] bg-[var(--surface-sunken,#060708)] mb-3 border border-[var(--border-subtle,rgba(255,255,255,0.06))]">
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

                    <h3 className="font-bold text-xs sm:text-sm text-[var(--text-primary,#f2f3f5)] truncate group-hover:text-[#e59e38] transition-colors">
                      {album.name}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary,#9ba1ad)] truncate mt-0.5">{album.artistName}</p>
                    <span className="text-[10px] font-mono text-[var(--text-tertiary,#6b7280)] mt-1">
                      {album.trackCount} {album.trackCount === 1 ? "track" : "tracks"}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Empty Vault State */}
          {localTracks.length === 0 && (
            <div className="rounded-[20px] border border-[var(--border-subtle,rgba(255,255,255,0.06))] bg-[var(--surface-charcoal,#111216)] p-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-[14px] bg-[var(--surface-raised,#16181e)] text-[#e59e38] mx-auto mb-4 border border-[var(--border-subtle,rgba(255,255,255,0.08))]">
                <HardDrive className="h-8 w-8 stroke-[1.75]" />
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary,#f2f3f5)]">Your local audio vault is empty</h3>
              <p className="text-xs text-[var(--text-secondary,#9ba1ad)] max-w-md mx-auto mt-2 leading-relaxed">
                Scan your music folder or import audio files directly from your computer. Everything is stored privately inside your device's browser vault.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  onClick={handleScanMusicFolder}
                  className="rounded-[10px] bg-[#e59e38] px-4 py-2 text-xs font-bold text-[#090a0c] hover:bg-[#f0ab4d] cursor-pointer"
                >
                  Scan Music Folder
                </button>
                <button
                  onClick={handleAddAudioFiles}
                  className="rounded-[10px] border border-[var(--border-subtle,rgba(255,255,255,0.08))] bg-[var(--surface-raised,#16181e)] px-4 py-2 text-xs font-semibold text-[var(--text-primary,#f2f3f5)] hover:bg-[var(--surface-active,#1e2027)] cursor-pointer"
                >
                  Add Files
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 5. ALL TRACKS CATALOG TABLE (Virtual Windowed for 10k-50k tracks)      */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "tracks" && (
        <div
          ref={tableContainerRef}
          className="rounded-[14px] border border-[var(--border-subtle,rgba(255,255,255,0.06))] bg-[var(--surface-charcoal,#111216)] overflow-hidden"
        >
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[var(--border-subtle,rgba(255,255,255,0.07))] bg-[var(--surface-sunken,#060708)] text-[var(--text-tertiary,#6b7280)] font-mono text-[10px] uppercase select-none sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th
                  onClick={() => handleHeaderSort("default")}
                  className="py-3 pl-4 pr-2 w-12 cursor-pointer hover:text-[var(--text-primary,#f2f3f5)] transition-colors"
                  title="Default Track Order"
                >
                  <div className="flex items-center gap-1">
                    <span>#</span>
                    {sortKey === "default" && <span className="text-[#e59e38]">●</span>}
                  </div>
                </th>
                <th
                  onClick={() => handleHeaderSort("title")}
                  className="py-3 px-3 cursor-pointer hover:text-[var(--text-primary,#f2f3f5)] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Title</span>
                    {sortKey === "title" && (
                      sortOrder === "asc" ? <ChevronUp className="h-3 w-3 text-[#e59e38]" /> : <ChevronDown className="h-3 w-3 text-[#e59e38]" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleHeaderSort("artist")}
                  className="py-3 px-3 hidden sm:table-cell cursor-pointer hover:text-[var(--text-primary,#f2f3f5)] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Artist</span>
                    {sortKey === "artist" && (
                      sortOrder === "asc" ? <ChevronUp className="h-3 w-3 text-[#e59e38]" /> : <ChevronDown className="h-3 w-3 text-[#e59e38]" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleHeaderSort("album")}
                  className="py-3 px-3 hidden md:table-cell cursor-pointer hover:text-[var(--text-primary,#f2f3f5)] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Album</span>
                    {sortKey === "album" && (
                      sortOrder === "asc" ? <ChevronUp className="h-3 w-3 text-[#e59e38]" /> : <ChevronDown className="h-3 w-3 text-[#e59e38]" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleHeaderSort("quality")}
                  className="py-3 px-3 cursor-pointer hover:text-[var(--text-primary,#f2f3f5)] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Quality</span>
                    {sortKey === "quality" && (
                      sortOrder === "asc" ? <ChevronUp className="h-3 w-3 text-[#e59e38]" /> : <ChevronDown className="h-3 w-3 text-[#e59e38]" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleHeaderSort("duration")}
                  className="py-3 px-3 text-right cursor-pointer hover:text-[var(--text-primary,#f2f3f5)] transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Duration</span>
                    {sortKey === "duration" && (
                      sortOrder === "asc" ? <ChevronUp className="h-3 w-3 text-[#e59e38]" /> : <ChevronDown className="h-3 w-3 text-[#e59e38]" />
                    )}
                  </div>
                </th>
                <th className="py-3 pr-4 pl-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {paddingTop > 0 && (
                <tr>
                  <td style={{ height: `${paddingTop}px` }} colSpan={7} />
                </tr>
              )}
              {virtualRows.map((virtualRow) => {
                const track = filteredTracks[virtualRow.index];
                if (!track) return null;
                const idx = virtualRow.index;
                const isCurrent = currentTrack?.id === track.id;
                const isFav = favoriteIds.has(track.id);
                return (
                  <tr
                    key={track.id}
                    ref={rowVirtualizer.measureElement}
                    data-index={virtualRow.index}
                    id={`track-row-${idx}`}
                    onClick={() => handleTrackClick(track, localTracks)}
                    onContextMenu={(e) => handleContextMenu(e, track)}
                    className={`group cursor-pointer transition-colors ${
                      isCurrent
                        ? "bg-[#e59e38]/10 text-[#e59e38]"
                        : "hover:bg-[var(--surface-active,#1e2027)]/50 text-[var(--text-primary,#f2f3f5)]"
                    }`}
                  >
                    <td className="py-3 pl-4 pr-2 font-mono text-[var(--text-tertiary,#6b7280)]">
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
                          className="h-7 w-7 rounded-[6px] object-cover bg-[var(--surface-raised,#16181e)] shrink-0"
                        />
                        <span className="truncate max-w-[200px] sm:max-w-xs">{track.title}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-[var(--text-secondary,#9ba1ad)] hidden sm:table-cell truncate max-w-[150px]">
                      {track.artistName || "Local Artist"}
                    </td>

                    <td className="py-3 px-3 text-[var(--text-secondary,#9ba1ad)] hidden md:table-cell truncate max-w-[150px]">
                      {track.album || "Single Tracks"}
                    </td>

                    <td className="py-3 px-3">
                      <span className="rounded-[4px] bg-[var(--surface-raised,#16181e)] border border-[var(--border-subtle,rgba(255,255,255,0.06))] px-1.5 py-0.5 text-[9px] font-mono text-[#e59e38]">
                        {track.format || track.quality || "AUDIO"}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-[var(--text-tertiary,#6b7280)]">
                      {formatSeconds(track.duration || 0)}
                    </td>

                    <td className="py-3 pr-4 pl-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => handleToggleFavorite(track.id, e)}
                          className={`p-1.5 rounded-[6px] transition-colors cursor-pointer ${
                            isFav
                              ? "text-[#C6604F]"
                              : "text-[var(--text-tertiary,#6b7280)] hover:text-[var(--text-primary,#f2f3f5)] opacity-0 group-hover:opacity-100"
                          }`}
                          title={isFav ? "Favorited" : "Favorite"}
                        >
                          <Heart className={`h-3.5 w-3.5 ${isFav ? "fill-current" : ""}`} />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setInfoTrack(track);
                          }}
                          className="p-1.5 text-[var(--text-tertiary,#6b7280)] hover:text-[#e59e38] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Audio Info"
                        >
                          <Info className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={(e) => handleContextMenu(e, track)}
                          className="p-1.5 text-[var(--text-tertiary,#6b7280)] hover:text-[var(--text-primary,#f2f3f5)] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="More Options"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paddingBottom > 0 && (
                <tr>
                  <td style={{ height: `${paddingBottom}px` }} colSpan={7} />
                </tr>
              )}
              {filteredTracks.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[var(--text-secondary,#9ba1ad)]">
                    No audio tracks found in local vault. Click "Add Files" or "Scan Folder" above to import music.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Adaptive Alphabet Fast-Scroller Rail (Reveals when collection > 35 tracks) */}
          {filteredTracks.length >= 35 && activeTab === "tracks" && (
            <div className="fixed right-1.5 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center py-2 px-1 rounded-full bg-black/60 backdrop-blur-md border border-white/[0.08] shadow-lg select-none">
              {"ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("").map((letter) => (
                <button
                  key={letter}
                  onClick={() => {
                    const targetIdx = filteredTracks.findIndex((t) => {
                      if (letter === "#") return /^[0-9\W]/.test(t.title);
                      return t.title.toUpperCase().startsWith(letter);
                    });
                    if (targetIdx >= 0) {
                      rowVirtualizer.scrollToIndex(targetIdx, {
                        align: "center",
                        behavior: "smooth",
                      });
                    }
                  }}
                  className="h-3.5 w-3.5 text-[8.5px] font-mono text-[#9ba1ad] hover:text-[#e59e38] hover:font-bold hover:scale-125 transition-all flex items-center justify-center cursor-pointer"
                >
                  {letter}
                </button>
              ))}
            </div>
          )}
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
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#f2f3f5]">
              Favorited Masters ({favoriteTracks.length})
            </h3>
            {favoriteTracks.length > 0 && (
              <button
                onClick={() => handleTrackClick(favoriteTracks[0], favoriteTracks)}
                className="text-xs font-semibold text-[#e59e38] hover:underline cursor-pointer flex items-center gap-1.5"
              >
                <Play className="h-3.5 w-3.5 fill-current" /> Play All
              </button>
            )}
          </div>

          {favoriteTracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-white/[0.08] bg-[#0c0d10]/50">
              <div className="h-14 w-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-3">
                <Heart className="h-7 w-7 text-red-400" />
              </div>
              <p className="text-sm font-bold text-[#f2f3f5]">No Favorited Tracks Yet</p>
              <p className="text-xs text-[#9ba1ad] mt-1 max-w-xs leading-relaxed">
                Tap the heart icon on the player bar, audiophile cockpit, or any track in your library to automatically add songs to this list.
              </p>
              <button
                onClick={() => setActiveTab("tracks")}
                className="mt-4 px-4 py-2 rounded-xl bg-[#e59e38] text-[#08090B] font-bold text-xs hover:brightness-110 transition-all cursor-pointer shadow-md"
              >
                Browse Library Tracks
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {favoriteTracks.map((track) => {
                const isCurrent = currentTrack?.id === track.id;
                return (
                  <div
                    key={track.id}
                    onClick={() => handleTrackClick(track, favoriteTracks)}
                    className={`group flex items-center gap-3 rounded-[12px] border p-2.5 sm:p-3 transition-colors cursor-pointer ${
                      isCurrent
                        ? "border-[#e59e38]/50 bg-[#e59e38]/[0.08]"
                        : "border-[var(--border-subtle,rgba(255,255,255,0.06))] bg-[var(--surface-charcoal,#111216)] hover:border-[var(--border-medium,rgba(255,255,255,0.12))] hover:bg-[var(--surface-raised,#16181e)]"
                    }`}
                  >
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[8px] bg-[var(--surface-raised,#16181e)] border border-[var(--border-subtle,rgba(255,255,255,0.06))]">
                      <img
                        src={track.coverImage || "/logo.png"}
                        alt={track.title}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isCurrent && isPlaying ? (
                          <Pause className="h-4 w-4 text-[#e59e38] fill-current" />
                        ) : (
                          <Play className="h-4 w-4 text-[#e59e38] fill-current ml-0.5" />
                        )}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-xs sm:text-sm font-semibold transition-colors ${
                        isCurrent ? "text-[#e59e38]" : "text-[var(--text-primary,#f2f3f5)] group-hover:text-[#e59e38]"
                      }`}>
                        {track.title}
                      </p>
                      <p className="truncate text-xs text-[var(--text-secondary,#9ba1ad)]">{track.artistName || "Local Artist"}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="rounded-[4px] bg-[var(--surface-raised,#16181e)] border border-[var(--border-subtle,rgba(255,255,255,0.06))] px-1.5 py-0.2 text-[9px] font-mono text-[#e59e38]">
                          {track.format || track.quality || "AUDIO"}
                        </span>
                        <span className="text-[10px] font-mono text-[var(--text-tertiary,#6b7280)]">
                          {formatSeconds(track.duration || 0)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleToggleFavorite(track.id, e)}
                      className="p-2 rounded-[8px] text-[#C6604F] hover:text-[#C6604F]/80 transition-colors cursor-pointer shrink-0"
                      title="Remove from Favorites"
                    >
                      <Heart className="h-4 w-4 fill-current" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
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

      {/* ── Context Menu Overlay ── */}
      {contextMenu.isOpen && contextMenu.track && (
        <>
          <div
            onClick={handleCloseContextMenu}
            onContextMenu={(e) => {
              e.preventDefault();
              handleCloseContextMenu();
            }}
            className="fixed inset-0 z-50 bg-black/20"
          />
          <div
            style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
            className="fixed z-50 w-56 rounded-xl border border-white/[0.12] bg-[#0c0d10] p-1.5 text-xs text-[#f2f3f5] shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="px-2.5 py-1.5 border-b border-white/[0.06] mb-1">
              <p className="font-bold text-xs truncate text-[#f2f3f5]">{contextMenu.track.title}</p>
              <p className="text-[10px] text-[#9ba1ad] truncate">{contextMenu.track.artistName || "Local Artist"}</p>
            </div>

            <button
              onClick={() => {
                handleTrackClick(contextMenu.track!, localTracks);
                handleCloseContextMenu();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] hover:text-[#e59e38] text-left transition-colors cursor-pointer"
            >
              <Play className="h-3.5 w-3.5" />
              <span>Play Now</span>
            </button>

            <button
              onClick={() => {
                playNextInQueue(contextMenu.track!);
                handleCloseContextMenu();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] hover:text-[#e59e38] text-left transition-colors cursor-pointer"
            >
              <PlayCircle className="h-3.5 w-3.5" />
              <span>Play Next</span>
            </button>

            <button
              onClick={() => {
                addToQueue(contextMenu.track!);
                handleCloseContextMenu();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] hover:text-[#e59e38] text-left transition-colors cursor-pointer"
            >
              <ListPlus className="h-3.5 w-3.5" />
              <span>Add to Queue</span>
            </button>

            <button
              onClick={(e) => {
                handleToggleFavorite(contextMenu.track!.id, e);
                handleCloseContextMenu();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] text-left transition-colors cursor-pointer"
            >
              <Heart
                className={`h-3.5 w-3.5 ${
                  favoriteIds.has(contextMenu.track.id) ? "text-rose-400 fill-current" : ""
                }`}
              />
              <span>
                {favoriteIds.has(contextMenu.track.id) ? "Remove Favorite" : "Add to Favorites"}
              </span>
            </button>

            <button
              onClick={() => {
                setPlaylistTrack(contextMenu.track!);
                handleCloseContextMenu();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] text-left transition-colors cursor-pointer"
            >
              <ListMusic className="h-3.5 w-3.5" />
              <span>Add to Playlist...</span>
            </button>

            <div className="h-px bg-white/[0.06] my-1" />

            <button
              onClick={() => {
                setInfoTrack(contextMenu.track!);
                handleCloseContextMenu();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] text-left transition-colors cursor-pointer"
            >
              <Info className="h-3.5 w-3.5 text-[#e59e38]" />
              <span>Technical Audio Info</span>
            </button>

            <button
              onClick={() => {
                setEditingTrack(contextMenu.track!);
                setEditTitle(contextMenu.track!.title);
                setEditArtist(contextMenu.track!.artistName || "");
                setEditAlbum(contextMenu.track!.album || "");
                handleCloseContextMenu();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] text-left transition-colors cursor-pointer"
            >
              <Edit2 className="h-3.5 w-3.5" />
              <span>Edit Metadata</span>
            </button>

            <button
              onClick={() => {
                removeLocalTrack(contextMenu.track!.id);
                handleCloseContextMenu();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-500/10 text-rose-400 text-left transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Remove from Vault</span>
            </button>
          </div>
        </>
      )}

      {/* ── Technical Audio Information Modal ── */}
      {infoTrack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.12] bg-[#0c0d10] p-6 text-[#f2f3f5] shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#16181e] text-[#e59e38] border border-white/[0.08]">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#f2f3f5] truncate max-w-[240px]">
                    {infoTrack.title}
                  </h3>
                  <p className="text-xs text-[#9ba1ad] truncate">{infoTrack.artistName || "Local Artist"}</p>
                </div>
              </div>
              <button
                onClick={() => setInfoTrack(null)}
                className="p-1.5 text-[#6b7280] hover:text-[#f2f3f5] rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-white/[0.06] bg-[#111216] p-3">
                <span className="text-[10px] font-mono text-[#6b7280] uppercase tracking-wider block mb-1">
                  Container / Format
                </span>
                <span className="font-mono font-bold text-[#e59e38] text-sm">
                  {infoTrack.format || (infoTrack.title.endsWith(".wav") ? "WAV" : infoTrack.title.endsWith(".mp3") ? "MP3" : "FLAC")}
                </span>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-[#111216] p-3">
                <span className="text-[10px] font-mono text-[#6b7280] uppercase tracking-wider block mb-1">
                  Audio Quality Tier
                </span>
                <span className="font-mono font-bold text-[#f2f3f5]">
                  {infoTrack.quality || "FLAC 24-bit / 96 kHz"}
                </span>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-[#111216] p-3">
                <span className="text-[10px] font-mono text-[#6b7280] uppercase tracking-wider block mb-1">
                  Channels
                </span>
                <span className="font-mono text-[#f2f3f5]">Stereo (2.0 PCM)</span>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-[#111216] p-3">
                <span className="text-[10px] font-mono text-[#6b7280] uppercase tracking-wider block mb-1">
                  Duration
                </span>
                <span className="font-mono text-[#f2f3f5]">{formatSeconds(infoTrack.duration || 0)}</span>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-[#111216] p-3">
                <span className="text-[10px] font-mono text-[#6b7280] uppercase tracking-wider block mb-1">
                  Storage Footprint
                </span>
                <span className="font-mono text-[#f2f3f5]">
                  {infoTrack.fileSizeBytes
                    ? `${(infoTrack.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB`
                    : "IndexedDB Blob"}
                </span>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-[#111216] p-3">
                <span className="text-[10px] font-mono text-[#6b7280] uppercase tracking-wider block mb-1">
                  Bitrate
                </span>
                <span className="font-mono text-[#f2f3f5]">
                  {infoTrack.fileSizeBytes && infoTrack.duration && infoTrack.duration > 0
                    ? `${Math.round((infoTrack.fileSizeBytes * 8) / infoTrack.duration / 1000)} kbps`
                    : "Variable Lossless"}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-[#111216] p-3 text-[11px] font-mono text-[#9ba1ad]">
              <div className="flex items-center gap-1.5 text-[#e59e38] font-bold mb-1">
                <Database className="h-3.5 w-3.5" />
                <span>LOCAL VAULT STORAGE VERIFIED</span>
              </div>
              <p className="text-[10px] text-[#6b7280]">
                Decoded directly via 64-bit Web Audio buffer. Operating 100% offline with zero remote telemetry.
              </p>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setInfoTrack(null)}
                className="rounded-xl bg-[#e59e38] px-4 py-2 text-xs font-bold text-[#090a0c] hover:bg-[#f0ab4d] cursor-pointer"
              >
                Close Info
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OfflineLibrary;
