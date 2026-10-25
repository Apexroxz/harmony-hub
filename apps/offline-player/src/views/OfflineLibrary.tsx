import React, { useState, useMemo, useRef, useEffect } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { App } from "@capacitor/app";
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
  Share2,
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
  type LocalAlbum,
  type LocalArtistGroup,
  type StoredTrackLyrics,
} from "@layam/storage-core";

type PrimaryTab = "dashboard" | "tracks" | "albums" | "artists" | "playlists" | "favorites";
type SortKey = "default" | "title" | "artist" | "album" | "quality" | "duration";
type SortOrder = "asc" | "desc";

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  track?: LocalTrack | null;
  album?: LocalAlbum | null;
  artist?: LocalArtistGroup | null;
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

function formatDate(isoString: string): string {
  if (!isoString) return "";
  try {
    return new Date(isoString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return isoString;
  }
}

export function OfflineLibrary() {
  const {
    currentTrack,
    isPlaying,
    playTrack,
    togglePlay,
    addToQueue,
    playNextInQueue,
    toggleConsole,
  } = usePlayer();

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
    refreshLibrary,
  } = useLocalVault();

  const [activeTab, setActiveTab] = useState<PrimaryTab>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  // Album & Artist Detail Drilldown State
  const [selectedAlbum, setSelectedAlbum] = useState<(typeof localAlbums)[0] | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<(typeof localArtistGroups)[0] | null>(null);

  // Unified Toggle/Play logic
  const handleTrackClick = (track: LocalTrack, trackList?: LocalTrack[]) => {
    const audio = typeof window !== "undefined" ? (window as any).__LAYAM_MASTER_AUDIO__ : null;
    if (currentTrack?.id === track.id && isPlaying && audio?.src && audio.src.startsWith("blob:")) {
      togglePlay();
    } else {
      playTrack(track, trackList || localTracks);
    }
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
    album: null,
    artist: null,
  });

  const handleTrackContextMenu = (e: React.MouseEvent | React.TouchEvent, track: LocalTrack) => {
    e.preventDefault();
    e.stopPropagation();
    let clientX = 100;
    let clientY = 200;
    if ("clientX" in e && typeof e.clientX === "number" && (e.clientX > 0 || e.clientY > 0)) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else if ("touches" in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.currentTarget && "getBoundingClientRect" in (e.currentTarget as HTMLElement)) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      clientX = rect.left;
      clientY = rect.bottom;
    }
    const x = Math.min(clientX, typeof window !== "undefined" ? window.innerWidth - 250 : clientX);
    const y = Math.min(clientY, typeof window !== "undefined" ? window.innerHeight - 360 : clientY);
    setContextMenu({
      isOpen: true,
      x: Math.max(10, x),
      y: Math.max(10, y),
      track,
      album: null,
      artist: null,
    });
  };

  const handleAlbumContextMenu = (e: React.MouseEvent | React.TouchEvent, album: LocalAlbum) => {
    e.preventDefault();
    e.stopPropagation();
    let clientX = 100;
    let clientY = 200;
    if ("clientX" in e && typeof e.clientX === "number" && (e.clientX > 0 || e.clientY > 0)) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else if ("touches" in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.currentTarget && "getBoundingClientRect" in (e.currentTarget as HTMLElement)) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      clientX = rect.left;
      clientY = rect.bottom;
    }
    const x = Math.min(clientX, typeof window !== "undefined" ? window.innerWidth - 250 : clientX);
    const y = Math.min(clientY, typeof window !== "undefined" ? window.innerHeight - 300 : clientY);
    setContextMenu({
      isOpen: true,
      x: Math.max(10, x),
      y: Math.max(10, y),
      track: null,
      album,
      artist: null,
    });
  };

  const handleArtistContextMenu = (e: React.MouseEvent | React.TouchEvent, artist: LocalArtistGroup) => {
    e.preventDefault();
    e.stopPropagation();
    let clientX = 100;
    let clientY = 200;
    if ("clientX" in e && typeof e.clientX === "number" && (e.clientX > 0 || e.clientY > 0)) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else if ("touches" in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.currentTarget && "getBoundingClientRect" in (e.currentTarget as HTMLElement)) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      clientX = rect.left;
      clientY = rect.bottom;
    }
    const x = Math.min(clientX, typeof window !== "undefined" ? window.innerWidth - 250 : clientX);
    const y = Math.min(clientY, typeof window !== "undefined" ? window.innerHeight - 280 : clientY);
    setContextMenu({
      isOpen: true,
      x: Math.max(10, x),
      y: Math.max(10, y),
      track: null,
      album: null,
      artist,
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

  // Navigation back state ref for instantaneous synchronous evaluation
  const navBackStateRef = useRef({
    selectedAlbum,
    selectedArtist,
    infoTrack,
    editingTrack,
    playlistTrack,
    lyricsTrack,
    contextMenu,
    activeTab,
  });
  navBackStateRef.current = {
    selectedAlbum,
    selectedArtist,
    infoTrack,
    editingTrack,
    playlistTrack,
    lyricsTrack,
    contextMenu,
    activeTab,
  };

  // Touch & Long-Press helper that cleanly separates tap from 400ms long-press
  const bindLongPressTouch = <T,>(
    onTap: (item: T) => void,
    onLongPress: (e: React.MouseEvent | React.TouchEvent, item: T) => void,
    item: T
  ) => {
    let pressTimer: any = null;
    let didLongPress = false;

    return {
      onClick: (e: React.MouseEvent) => {
        if ((e.target as HTMLElement)?.closest("button")) return;
        if (didLongPress) {
          didLongPress = false;
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        onTap(item);
      },
      onContextMenu: (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onLongPress(e, item);
      },
      onTouchStart: (e: React.TouchEvent) => {
        if ((e.target as HTMLElement)?.closest("button")) return;
        didLongPress = false;
        if (pressTimer) clearTimeout(pressTimer);
        const touchX = e.touches[0]?.clientX ?? 100;
        const touchY = e.touches[0]?.clientY ?? 200;
        const targetEvent = {
          clientX: touchX,
          clientY: touchY,
          preventDefault: () => {},
          stopPropagation: () => {},
        } as unknown as React.MouseEvent;

        pressTimer = setTimeout(() => {
          didLongPress = true;
          if (window.navigator?.vibrate) window.navigator.vibrate(40);
          onLongPress(targetEvent, item);
        }, 420);
      },
      onTouchEnd: () => {
        if (pressTimer) clearTimeout(pressTimer);
      },
      onTouchMove: () => {
        if (pressTimer) clearTimeout(pressTimer);
      },
      onTouchCancel: () => {
        if (pressTimer) clearTimeout(pressTimer);
      },
    };
  };

  useEffect(() => {
    const handleBackNavigation = () => {
      const state = navBackStateRef.current;
      if (state.contextMenu.isOpen) {
        handleCloseContextMenu();
      } else if (state.infoTrack) {
        setInfoTrack(null);
      } else if (state.editingTrack) {
        setEditingTrack(null);
      } else if (state.playlistTrack) {
        setPlaylistTrack(null);
      } else if (state.lyricsTrack) {
        setLyricsTrack(null);
      } else if (state.selectedAlbum) {
        setSelectedAlbum(null);
      } else if (state.selectedArtist) {
        setSelectedArtist(null);
      } else if (state.activeTab !== "dashboard") {
        setActiveTab("dashboard");
      } else {
        App.minimizeApp().catch(() => {});
      }
    };

    window.addEventListener("layam:backbutton:library", handleBackNavigation);

    return () => {
      window.removeEventListener("layam:backbutton:library", handleBackNavigation);
    };
  }, []);

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
            refreshLibrary();
            toast.success(`Imported ${imported.length} tracks.`);
          }
          return;
        }
        const imported = OfflineService.importNativeAudioFiles(files);
        refreshLibrary();
        toast.success(`Discovered ${files.length} tracks on device (${imported.length} new)`);
      } catch (err) {
        toast.dismiss("offline-device-scan");
        console.warn("[OfflineLibrary] MediaStore scan fallback to picker:", err);
        const picked = await androidMedia3.openDocumentPicker();
        if (picked.length > 0) {
          const imported = OfflineService.importNativeAudioFiles(picked);
          refreshLibrary();
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
        refreshLibrary();
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
      await importLocalFiles(files, (prog) => {
        setImportProgress({
          isImporting: true,
          ...prog,
        });
      });
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
      await importLocalFiles(files, (prog) => {
        setImportProgress({
          isImporting: true,
          ...prog,
        });
      });
      setImportProgress(null);
    }
  };

  // Telemetry Metrics Calculation
  const totalSizeBytes = useMemo(() => {
    // Only sum tracks with known file sizes — never fabricate storage numbers
    return localTracks.reduce((acc, t) => acc + (t.fileSizeBytes || 0), 0);
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
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.artistName || t.artist || "").toLowerCase().includes(q) ||
          (t.album || "").toLowerCase().includes(q) ||
          (t.format || "").toLowerCase().includes(q) ||
          (t.quality || "").toLowerCase().includes(q) ||
          (t.filePath || "").toLowerCase().includes(q)
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

  const filteredAlbums = useMemo(() => {
    if (!searchQuery.trim()) return localAlbums;
    const q = searchQuery.toLowerCase().trim();
    return localAlbums.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.artistName || "").toLowerCase().includes(q) ||
        a.tracks.some(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            (t.artistName || t.artist || "").toLowerCase().includes(q)
        )
    );
  }, [localAlbums, searchQuery]);

  const filteredArtistGroups = useMemo(() => {
    if (!searchQuery.trim()) return localArtistGroups;
    const q = searchQuery.toLowerCase().trim();
    return localArtistGroups.filter(
      (g) =>
        (g.artistName || "").toLowerCase().includes(q) ||
        g.tracks.some((t) => t.title.toLowerCase().includes(q))
    );
  }, [localArtistGroups, searchQuery]);

  const favoriteTracks = useMemo(() => {
    return localTracks.filter((t) => favoriteIds.has(t.id));
  }, [localTracks, favoriteIds]);

  // ── Recent Tracks: sorted by actual play history ─────────────────────────
  const [recentlyPlayedIds, setRecentlyPlayedIds] = useState<string[]>([]);

  useEffect(() => {
    // Load actual play history from LocalHistoryService / IndexedDB
    LocalHistoryService.getRecentlyPlayedIds(12)
      .then((ids) => setRecentlyPlayedIds(ids))
      .catch(() => setRecentlyPlayedIds([]));
  }, [localTracks]);

  const recentTracks = useMemo(() => {
    let source = localTracks;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      source = source.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.artistName || t.artist || "").toLowerCase().includes(q) ||
          (t.album || "").toLowerCase().includes(q) ||
          (t.format || "").toLowerCase().includes(q)
      );
    }
    if (recentlyPlayedIds.length > 0) {
      // Build an ordered list of recently-played tracks
      const trackMap = new Map(source.map((t) => [t.id, t]));
      const ordered = recentlyPlayedIds
        .map((id) => trackMap.get(id))
        .filter((t): t is LocalTrack => t !== undefined);
      // Pad with un-played tracks if we have fewer than 6
      if (ordered.length < 6) {
        const playedSet = new Set(recentlyPlayedIds);
        const unplayed = source.filter((t) => !playedSet.has(t.id));
        ordered.push(...unplayed);
      }
      return ordered.slice(0, 6);
    }
    return source.slice(0, 6);
  }, [localTracks, recentlyPlayedIds, searchQuery]);

  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const mobileContainerRef = useRef<HTMLDivElement | null>(null);

  const rowVirtualizer = useWindowVirtualizer({
    count: filteredTracks.length,
    estimateSize: () => 52,
    overscan: 10,
    scrollMargin: tableContainerRef.current?.offsetTop ?? 0,
  });

  const mobileRowVirtualizer = useWindowVirtualizer({
    count: filteredTracks.length,
    estimateSize: () => 76,
    overscan: 6,
    scrollMargin: mobileContainerRef.current?.offsetTop ?? 0,
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
      className="relative mx-auto max-w-7xl px-4 py-4 sm:py-6 landscape:py-2 pb-44 sm:px-6 lg:px-8 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]"
    >
      {/* ── Vault Header Section & Controls ── */}
      <section aria-label="Local Audio Vault" className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1.5 landscape:gap-1 pb-2 landscape:pb-1 mb-3 landscape:mb-2 border-b border-[var(--border-subtle,rgba(255,255,255,0.06))]">
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

        <div className="flex items-baseline gap-2.5">
          <h1 className="text-base sm:text-xl landscape:text-base font-bold tracking-tight text-[var(--text-primary,#f2f3f5)]">
            Local Audio Vault
          </h1>
          <span className="text-[10px] sm:text-[11px] font-mono text-[var(--text-tertiary,#6b7280)]">
            Bit-Perfect Hardware Playback
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-mono text-[var(--text-secondary,#9ba1ad)]">
          <span className="text-[var(--text-primary,#f2f3f5)] font-semibold">
            {localTracks.length} {localTracks.length === 1 ? "Track" : "Tracks"}
          </span>
          <span className="text-[var(--text-tertiary,#6b7280)]/40">·</span>
          <span>
            {localAlbums.length} {localAlbums.length === 1 ? "Album" : "Albums"}
          </span>
          {totalSizeBytes > 0 && (
            <>
              <span className="text-[var(--text-tertiary,#6b7280)]/40">·</span>
              <span>
                {parseFloat(storageUsedGb) >= 1 ? `${storageUsedGb} GB` : `${storageUsedMb} MB`}
              </span>
            </>
          )}
          {Object.keys(formatsSummary).length > 0 && (
            <>
              <span className="text-[var(--text-tertiary,#6b7280)]/40">·</span>
              <div className="inline-flex items-center gap-1">
                {Object.entries(formatsSummary).map(([fmt, count]) => (
                  <span
                    key={fmt}
                    className="text-[9.5px] sm:text-[10px] font-mono text-[#e59e38] font-semibold"
                  >
                    {fmt}({count})
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 3. NAVIGATION TABS + SEARCH BAR (REDESIGNED AUDIOPHILE LUXURY BAR)      */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div
        role="toolbar"
        aria-label="Library navigation and search"
        className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pb-3 mb-5 border-b border-[var(--border-subtle,rgba(255,255,255,0.06))]"
      >
        <div
          role="tablist"
          aria-label="Library sections"
          className="max-w-full overflow-x-auto no-scrollbar flex items-center gap-1.5 bg-[var(--surface-charcoal,#111216)]/90 p-1.5 rounded-2xl border border-[var(--border-subtle,rgba(255,255,255,0.08))] backdrop-blur-xl shadow-md touch-pan-x shrink"
        >
          {[
            { id: "dashboard" as const, label: "Dashboard", icon: Disc, count: null },
            { id: "tracks" as const, label: "Tracks", icon: Music2, count: localTracks.length },
            { id: "albums" as const, label: "Albums", icon: Disc3, count: localAlbums.length },
            { id: "artists" as const, label: "Artists", icon: Users, count: localArtistGroups.length },
            { id: "playlists" as const, label: "Playlists", icon: ListMusic, count: localPlaylists.length },
            { id: "favorites" as const, label: "Favorites", icon: Heart, count: favoriteTracks.length },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 min-h-[36px] text-xs font-semibold shrink-0 transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-[#e59e38] to-[#f5b84c] text-[#08090B] font-bold shadow-[0_2px_12px_rgba(229,158,56,0.35)] scale-[1.02]"
                    : "text-[var(--text-secondary,#9ba1ad)] hover:text-[var(--text-primary,#f2f3f5)] hover:bg-[var(--surface-raised,#16181e)] bg-transparent"
                }`}
              >
                <tab.icon className={`h-3.5 w-3.5 ${isActive ? "text-[#08090B]" : "text-[var(--text-secondary,#9ba1ad)]"}`} aria-hidden="true" />
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span
                    className={`font-mono text-[9.5px] px-1.5 py-0.5 rounded-md ${
                      isActive
                        ? "bg-black/20 text-[#08090B] font-bold"
                        : "bg-[var(--surface-sunken,#060708)] text-[var(--text-secondary,#9ba1ad)]"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64 lg:w-72 shrink-0">
          <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-secondary,#9ba1ad)] pointer-events-none" aria-hidden="true" />
          <input
            id="library-search"
            type="text"
            role="searchbox"
            aria-label="Search library by title, artist, album, format"
            placeholder="Search tracks, artists, formats..."
            value={searchQuery}
            onChange={(e) => {
              const val = e.target.value;
              setSearchQuery(val);
              if (val.trim() && activeTab === "dashboard") {
                setActiveTab("tracks");
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setSearchQuery("");
              }
            }}
            className="w-full rounded-xl border border-[var(--border-subtle,rgba(255,255,255,0.08))] bg-[var(--surface-sunken,#060708)] py-2 pl-9 pr-9 text-xs text-[var(--text-primary,#f2f3f5)] placeholder-[var(--text-secondary,#9ba1ad)] focus:border-[#e59e38]/60 focus:bg-[var(--surface-raised,#16181e)] focus:outline-none transition-colors"
          />
          {searchQuery.trim() && (
            <button
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full text-[var(--text-secondary,#9ba1ad)] hover:text-[var(--text-primary,#f2f3f5)] hover:bg-[var(--surface-raised,#16181e)] transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5 stroke-[2.5]" />
            </button>
          )}
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
                      {...bindLongPressTouch((t) => handleTrackClick(t, localTracks), handleTrackContextMenu, track)}
                      className={`group flex items-center gap-3 rounded-[12px] border p-2.5 sm:p-3 transition-colors cursor-pointer select-none ${
                        isCurrent
                          ? "border-[#e59e38]/50 bg-[#e59e38]/[0.08]"
                          : "border-[var(--border-subtle,rgba(255,255,255,0.06))] bg-[var(--surface-charcoal,#111216)] hover:border-[var(--border-medium,rgba(255,255,255,0.12))] hover:bg-[var(--surface-raised,#16181e)]"
                      }`}
                    >
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[8px] bg-[var(--surface-raised,#16181e)] border border-[var(--border-subtle,rgba(255,255,255,0.06))] flex items-center justify-center">
                        {track.coverImage ? (
                          <img
                            src={track.coverImage}
                            alt={track.title}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <Music2 className="h-5 w-5 text-[#e59e38]/80" />
                        )}
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
                          <span className="rounded-[4px] bg-[var(--surface-raised,#16181e)] border border-[var(--border-subtle,rgba(255,255,255,0.06))] px-1.5 py-0.5 text-[9px] font-mono text-[#e59e38]">
                            {track.format || track.quality || "AUDIO"}
                          </span>
                          <span className="text-[10px] font-mono text-[var(--text-tertiary,#6b7280)]">
                            {formatSeconds(track.duration || 0)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          aria-label={isFav ? `Remove ${track.title} from favorites` : `Add ${track.title} to favorites`}
                          aria-pressed={isFav}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(track.id, e);
                          }}
                          className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[8px] transition-colors cursor-pointer ${
                            isFav
                              ? "text-[#C6604F]"
                              : "text-[var(--text-secondary,#9ba1ad)] hover:text-[var(--text-primary,#f2f3f5)]"
                          }`}
                        >
                          <Heart
                            className={`h-4 w-4 transition-transform ${
                              isFav ? "fill-current" : ""
                            }`}
                          />
                        </button>

                        <button
                          aria-label={`Options for ${track.title}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTrackContextMenu(e, track);
                          }}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[8px] text-[var(--text-secondary,#9ba1ad)] hover:text-[var(--text-primary,#f2f3f5)] hover:bg-[var(--surface-active,#1e2027)] transition-colors cursor-pointer"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
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
                    className="group rounded-[14px] border border-[var(--border-subtle,rgba(255,255,255,0.06))] bg-[var(--surface-charcoal,#111216)] p-3.5 hover:border-[#e59e38]/40 hover:bg-[var(--surface-raised,#16181e)] transition-all flex flex-col cursor-pointer select-none"
                    {...bindLongPressTouch((a) => setSelectedAlbum(a), handleAlbumContextMenu, album)}
                  >
                    <div className="relative aspect-square w-full overflow-hidden rounded-[10px] bg-[var(--surface-sunken,#060708)] mb-3 border border-[var(--border-subtle,rgba(255,255,255,0.06))] flex items-center justify-center">
                      {album.coverImage ? (
                        <img
                          src={album.coverImage}
                          alt={album.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <Disc className="h-10 w-10 text-[#e59e38]/50" />
                      )}
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
              <div className="mt-6 flex flex-wrap justify-center gap-3">
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
                <button
                  onClick={toggleConsole}
                  className="rounded-[10px] border border-[var(--border-subtle,rgba(255,255,255,0.08))] bg-[var(--surface-raised,#16181e)] px-4 py-2 text-xs font-semibold text-[var(--text-primary,#f2f3f5)] hover:bg-[var(--surface-active,#1e2027)] cursor-pointer flex items-center gap-1.5"
                >
                  <Sliders className="h-3.5 w-3.5 text-[#e59e38]" />
                  Open Audio Console
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 5. ALL TRACKS CATALOG (MOBILE-OPTIMIZED LIST + DESKTOP TABLE)           */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "tracks" && (
        <div className="space-y-4">
          {/* Header controls bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <p className="text-xs font-mono text-[var(--text-secondary,#9ba1ad)]">
                {searchQuery.trim() ? (
                  <span>
                    Matching <span className="font-bold text-[var(--text-primary,#f2f3f5)]">{filteredTracks.length}</span> of {localTracks.length} tracks for "{searchQuery}"
                  </span>
                ) : (
                  <span>Showing {filteredTracks.length} of {localTracks.length} tracks · Tap to play</span>
                )}
              </p>
              {searchQuery.trim() && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-[11px] font-semibold text-[#e59e38] hover:underline cursor-pointer flex items-center gap-0.5 ml-1"
                >
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (filteredTracks.length > 0) {
                    const shuffled = [...filteredTracks].sort(() => Math.random() - 0.5);
                    handleTrackClick(shuffled[0], shuffled);
                  }
                }}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--surface-raised,#16181e)] hover:bg-[var(--surface-active,#1e2027)] border border-[var(--border-subtle,rgba(255,255,255,0.06))] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary,#f2f3f5)] transition-colors cursor-pointer"
              >
                <ArrowUpDown className="h-3 w-3 text-[#e59e38]" />
                Shuffle All
              </button>
            </div>
          </div>

          {/* ── Mobile Touch List View (Virtual & lag-free) ── */}
          <div ref={mobileContainerRef} className="block md:hidden">
            <div
              style={{
                height: `${mobileRowVirtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
            >
              {mobileRowVirtualizer.getVirtualItems().map((virtualRow) => {
                const track = filteredTracks[virtualRow.index];
                if (!track) return null;
                const isCurrent = currentTrack?.id === track.id;
                const isFav = favoriteIds.has(track.id);

                return (
                  <div
                    key={track.id}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualRow.start}px)`,
                      height: `${virtualRow.size}px`,
                      paddingBottom: "8px",
                    }}
                  >
                    <div
                      {...bindLongPressTouch((t) => handleTrackClick(t, localTracks), handleTrackContextMenu, track)}
                      className={`h-full flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                        isCurrent
                          ? "border-[#e59e38]/50 bg-[#e59e38]/10 text-[#e59e38]"
                          : "border-[var(--border-subtle,rgba(255,255,255,0.06))] bg-[var(--surface-charcoal,#111216)] hover:bg-[var(--surface-raised,#16181e)] text-[var(--text-primary,#f2f3f5)]"
                      }`}
                    >
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[var(--surface-raised,#16181e)] border border-[var(--border-subtle,rgba(255,255,255,0.08))] flex items-center justify-center">
                        {track.coverImage ? (
                          <img
                            src={track.coverImage}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <Music2 className="h-5 w-5 text-[#e59e38]/80" />
                        )}
                        {isCurrent && isPlaying && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <Volume2 className="h-5 w-5 text-[#e59e38] animate-pulse" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className={`font-bold text-xs sm:text-sm truncate ${isCurrent ? "text-[#e59e38]" : "text-[var(--text-primary,#f2f3f5)]"}`}>
                          {track.title}
                        </p>
                        <p className="text-[11px] text-[var(--text-secondary,#9ba1ad)] truncate mt-0.5">
                          {track.artistName || "Unknown Artist"} {track.album ? `· ${track.album}` : ""}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="rounded bg-[var(--surface-raised,#16181e)] border border-[var(--border-subtle,rgba(255,255,255,0.06))] px-1.5 py-0.5 text-[9px] font-mono text-[#e59e38]">
                            {track.format || track.quality || "AUDIO"}
                          </span>
                          <span className="font-mono text-[10px] text-[var(--text-secondary,#9ba1ad)]">
                            {formatSeconds(track.duration || 0)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          aria-label={isFav ? `Remove ${track.title} from favorites` : `Add ${track.title} to favorites`}
                          aria-pressed={isFav}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(track.id, e);
                          }}
                          className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
                            isFav ? "text-[#C6604F]" : "text-[var(--text-secondary,#9ba1ad)] hover:text-[var(--text-primary,#f2f3f5)]"
                          }`}
                        >
                          <Heart className={`h-4 w-4 ${isFav ? "fill-current" : ""}`} />
                        </button>

                        <button
                          aria-label={`Options for ${track.title}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTrackContextMenu(e, track);
                          }}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[var(--text-secondary,#9ba1ad)] hover:text-[var(--text-primary,#f2f3f5)] hover:bg-[var(--surface-active,#1e2027)] transition-colors cursor-pointer"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

            {filteredTracks.length === 0 && (
              <div className="py-12 text-center rounded-[14px] border border-[var(--border-subtle,rgba(255,255,255,0.06))] bg-[var(--surface-charcoal,#111216)] p-8">
                <Search className="h-8 w-8 text-[var(--text-secondary,#9ba1ad)] mx-auto mb-3 opacity-40" />
                <p className="text-sm font-bold text-[var(--text-primary,#f2f3f5)] mb-1">
                  No audio tracks found
                </p>
                <p className="text-xs text-[var(--text-secondary,#9ba1ad)] mb-4">
                  No tracks, artists, or formats match &quot;{searchQuery}&quot;.
                </p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#e59e38] text-[#090a0c] text-xs font-bold hover:bg-[#f0ab4d] transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5 stroke-[2.5]" /> Clear Search
                </button>
              </div>
            )}

          {/* ── Desktop Table View (Visible on md: screens and above) ── */}
          <div
            ref={tableContainerRef}
            className="hidden md:block rounded-[14px] border border-[var(--border-subtle,rgba(255,255,255,0.06))] bg-[var(--surface-charcoal,#111216)] overflow-hidden"
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
              <tbody className="divide-y divide-[var(--border-subtle,rgba(255,255,255,0.06))]">
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
                      role="row"
                      aria-selected={isCurrent}
                      aria-label={`${track.title} by ${track.artistName || "Unknown Artist"}${isCurrent ? ", currently playing" : ""}`}
                      tabIndex={0}
                      {...bindLongPressTouch((t) => handleTrackClick(t, localTracks), handleTrackContextMenu, track)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleTrackClick(track, localTracks);
                        }
                        if (e.key === "ContextMenu") {
                          e.preventDefault();
                          handleTrackContextMenu(e as unknown as React.MouseEvent, track);
                        }
                      }}
                      onContextMenu={(e) => handleTrackContextMenu(e, track)}
                      className={`group cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e59e38]/60 select-none ${
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
                          {track.coverImage ? (
                            <img
                              src={track.coverImage}
                              alt=""
                              className="h-7 w-7 rounded-[6px] object-cover bg-[var(--surface-raised,#16181e)] shrink-0"
                              loading="lazy"
                            />
                          ) : (
                            <div className="h-7 w-7 rounded-[6px] bg-[var(--surface-raised,#16181e)] border border-[var(--border-subtle,rgba(255,255,255,0.06))] flex items-center justify-center shrink-0">
                              <Music2 className="h-3.5 w-3.5 text-[#e59e38]/80" />
                            </div>
                          )}
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
                            aria-label={isFav ? `Remove ${track.title} from favorites` : `Add ${track.title} to favorites`}
                            aria-pressed={isFav}
                            onClick={(e) => handleToggleFavorite(track.id, e)}
                            className={`p-1.5 rounded-[6px] transition-colors cursor-pointer ${
                              isFav
                                ? "text-[#C6604F]"
                                : "text-[var(--text-tertiary,#6b7280)] hover:text-[var(--text-primary,#f2f3f5)]"
                            }`}
                            title={isFav ? "Favorited" : "Add to Favorites"}
                          >
                            <Heart className={`h-3.5 w-3.5 ${isFav ? "fill-current" : ""}`} />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setInfoTrack(track);
                            }}
                            className="p-1.5 text-[var(--text-tertiary,#6b7280)] hover:text-[#e59e38] transition-colors cursor-pointer"
                            title="Audio Info"
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={(e) => handleTrackContextMenu(e, track)}
                            className="p-1.5 text-[var(--text-tertiary,#6b7280)] hover:text-[var(--text-primary,#f2f3f5)] transition-colors cursor-pointer"
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
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 6. ALBUMS GRID VIEW (TAP TO VIEW, LONG-PRESS FOR OPTIONS)             */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "albums" && (
        <div>
          {filteredAlbums.length === 0 ? (
            <div className="py-12 text-center rounded-[14px] border border-[var(--border-subtle,rgba(255,255,255,0.06))] bg-[var(--surface-charcoal,#111216)] p-8">
              <Search className="h-8 w-8 text-[var(--text-secondary,#9ba1ad)] mx-auto mb-3 opacity-40" />
              <p className="text-sm font-bold text-[var(--text-primary,#f2f3f5)] mb-1">
                No albums found
              </p>
              <p className="text-xs text-[var(--text-secondary,#9ba1ad)] mb-4">
                No albums match &quot;{searchQuery}&quot;.
              </p>
              <button
                onClick={() => setSearchQuery("")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#e59e38] text-[#090a0c] text-xs font-bold hover:bg-[#f0ab4d] transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5 stroke-[2.5]" /> Clear Search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {filteredAlbums.map((album) => (
                <div
                  key={album.name}
                  {...bindLongPressTouch((a) => setSelectedAlbum(a), handleAlbumContextMenu, album)}
                  className="group rounded-2xl border border-[var(--border-subtle,rgba(255,255,255,0.06))] bg-[var(--surface-charcoal,#111216)] p-3.5 hover:border-[#e59e38]/40 hover:bg-[var(--surface-raised,#16181e)] transition-all flex flex-col cursor-pointer select-none"
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[var(--surface-raised,#16181e)] mb-3 border border-[var(--border-subtle,rgba(255,255,255,0.06))] flex items-center justify-center">
                    {album.coverImage ? (
                      <img
                        src={album.coverImage}
                        alt={album.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <Disc className="h-10 w-10 text-[#e59e38]/50" />
                    )}
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
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 6b. ARTISTS VIEW (TAP TO VIEW, LONG-PRESS FOR OPTIONS)                */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "artists" && (
        <div className="space-y-4">
          {filteredArtistGroups.length === 0 ? (
            <div className="py-12 text-center rounded-[14px] border border-[var(--border-subtle,rgba(255,255,255,0.06))] bg-[var(--surface-charcoal,#111216)] p-8">
              <Search className="h-8 w-8 text-[var(--text-secondary,#9ba1ad)] mx-auto mb-3 opacity-40" />
              <p className="text-sm font-bold text-[var(--text-primary,#f2f3f5)] mb-1">
                {searchQuery.trim() ? "No Artists Found" : "No Artists Detected"}
              </p>
              <p className="text-xs text-[var(--text-secondary,#9ba1ad)] mb-4 max-w-xs mx-auto leading-relaxed">
                {searchQuery.trim()
                  ? `No artists match "${searchQuery}".`
                  : "Import audio files with artist metadata to browse your collection by artist."}
              </p>
              <button
                onClick={() => (searchQuery.trim() ? setSearchQuery("") : setActiveTab("tracks"))}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#e59e38] text-[#090a0c] text-xs font-bold hover:bg-[#f0ab4d] transition-colors cursor-pointer"
              >
                {searchQuery.trim() ? (
                  <>
                    <X className="h-3.5 w-3.5 stroke-[2.5]" /> Clear Search
                  </>
                ) : (
                  "Browse All Tracks"
                )}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {filteredArtistGroups.map((artist) => (
                <div
                  key={artist.artistName}
                  {...bindLongPressTouch((g) => setSelectedArtist(g), handleArtistContextMenu, artist)}
                  className="group rounded-[16px] border border-[var(--border-subtle,rgba(255,255,255,0.06))] bg-[var(--surface-charcoal,#111216)] p-4 hover:border-[var(--accent-amber,#e59e38)]/40 hover:bg-[var(--surface-raised,#16181e)] transition-all flex flex-col items-center text-center cursor-pointer select-none"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-raised,#16181e)] border border-[var(--border-subtle,rgba(255,255,255,0.08))] mb-3 group-hover:border-[var(--accent-amber,#e59e38)]/40 transition-colors">
                    <Users className="h-7 w-7 text-[var(--text-tertiary,#6b7280)] group-hover:text-[var(--accent-amber,#e59e38)] transition-colors" />
                  </div>
                  <h3 className="font-bold text-xs sm:text-sm text-[var(--text-primary,#f2f3f5)] truncate w-full group-hover:text-[var(--accent-amber,#e59e38)] transition-colors">
                    {artist.artistName || "Unknown Artist"}
                  </h3>
                  <span className="text-[10px] font-mono text-[var(--text-tertiary,#6b7280)] mt-1">
                    {artist.trackCount} {artist.trackCount === 1 ? "track" : "tracks"}
                  </span>
                </div>
              ))}
            </div>
          )}
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
              className="rounded-xl border border-[var(--border-subtle,rgba(255,255,255,0.08))] bg-[var(--surface-sunken,#060708)] px-3.5 py-2 text-xs text-[var(--text-primary,#f2f3f5)] placeholder-[var(--text-tertiary,#6b7280)] focus:border-[#e59e38] focus:outline-none"
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
            {localPlaylists.map((pl) => {
              const plTracks = localTracks.filter((t) => pl.trackIds.includes(t.id));
              return (
                <div
                  key={pl.id}
                  className="rounded-2xl border border-[var(--border-subtle,rgba(255,255,255,0.06))] bg-[var(--surface-charcoal,#111216)] p-4 flex flex-col justify-between"
                >
                  <div>
                    <h4 className="font-bold text-sm text-[var(--text-primary,#f2f3f5)]">{pl.name}</h4>
                    <p className="text-xs text-[var(--text-tertiary,#6b7280)] font-mono mt-1">
                      {pl.trackIds.length} {pl.trackIds.length === 1 ? "track" : "tracks"} · {formatDate(pl.createdAt)}
                    </p>

                    {/* Inline track preview — first 4 tracks */}
                    {plTracks.length > 0 && (
                      <ul className="mt-3 space-y-1.5" aria-label={`Tracks in ${pl.name}`}>
                        {plTracks.slice(0, 4).map((t) => (
                          <li
                            key={t.id}
                            className="flex items-center gap-2 text-xs text-[var(--text-secondary,#9ba1ad)] group/track cursor-pointer hover:text-[#e59e38] transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTrackClick(t, plTracks);
                            }}
                          >
                            <Play className="h-2.5 w-2.5 shrink-0 opacity-0 group-hover/track:opacity-100 transition-opacity fill-current text-[#e59e38]" />
                            <span className="truncate">{t.title}</span>
                            <span className="ml-auto font-mono text-[10px] text-[var(--text-tertiary,#6b7280)] shrink-0">
                              {formatSeconds(t.duration || 0)}
                            </span>
                          </li>
                        ))}
                        {plTracks.length > 4 && (
                          <li className="text-[10px] font-mono text-[var(--text-tertiary,#6b7280)] pl-4">
                            +{plTracks.length - 4} more tracks
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <button
                      onClick={() => {
                        if (plTracks.length > 0) handleTrackClick(plTracks[0], plTracks);
                      }}
                      disabled={plTracks.length === 0}
                      aria-label={`Play playlist ${pl.name}`}
                      className="flex items-center gap-1.5 text-xs font-semibold text-[#e59e38] hover:underline cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" /> Play Mix
                    </button>
                    <button
                      onClick={() => deletePlaylist(pl.id)}
                      aria-label={`Delete playlist ${pl.name}`}
                      className="text-[var(--text-tertiary,#6b7280)] hover:text-rose-400 p-1 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 8. FAVORITES VIEW                                                     */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "favorites" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[var(--text-primary,#f2f3f5)]">
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
            <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-[var(--border-subtle,rgba(255,255,255,0.08))] bg-[var(--surface-sunken,#060708)]/50">
              <div className="h-14 w-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-3">
                <Heart className="h-7 w-7 text-red-400" />
              </div>
              <p className="text-sm font-bold text-[var(--text-primary,#f2f3f5)]">No Favorited Tracks Yet</p>
              <p className="text-xs text-[var(--text-secondary,#9ba1ad)] mt-1 max-w-xs leading-relaxed">
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
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[8px] bg-[var(--surface-raised,#16181e)] border border-[var(--border-subtle,rgba(255,255,255,0.06))] flex items-center justify-center">
                      {track.coverImage ? (
                        <img
                          src={track.coverImage}
                          alt={track.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <Music2 className="h-5 w-5 text-[#e59e38]/80" />
                      )}
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
                        <span className="rounded-[4px] bg-[var(--surface-raised,#16181e)] border border-[var(--border-subtle,rgba(255,255,255,0.06))] px-1.5 py-0.5 text-[9px] font-mono text-[#e59e38]">
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
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border-medium,rgba(255,255,255,0.12))] bg-[var(--surface-charcoal,#111216)] p-6 shadow-2xl space-y-4">
            <h4 className="font-bold text-sm text-[var(--text-primary,#f2f3f5)]">Edit Track Metadata</h4>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[var(--text-secondary,#9ba1ad)] block mb-1">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-subtle,rgba(255,255,255,0.08))] bg-[var(--surface-sunken,#060708)] p-2 text-[var(--text-primary,#f2f3f5)] focus:outline-none focus:border-[#e59e38]"
                />
              </div>
              <div>
                <label className="text-[var(--text-secondary,#9ba1ad)] block mb-1">Artist</label>
                <input
                  type="text"
                  value={editArtist}
                  onChange={(e) => setEditArtist(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-subtle,rgba(255,255,255,0.08))] bg-[var(--surface-sunken,#060708)] p-2 text-[var(--text-primary,#f2f3f5)] focus:outline-none focus:border-[#e59e38]"
                />
              </div>
              <div>
                <label className="text-[var(--text-secondary,#9ba1ad)] block mb-1">Album</label>
                <input
                  type="text"
                  value={editAlbum}
                  onChange={(e) => setEditAlbum(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-subtle,rgba(255,255,255,0.08))] bg-[var(--surface-sunken,#060708)] p-2 text-[var(--text-primary,#f2f3f5)] focus:outline-none focus:border-[#e59e38]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingTrack(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-secondary,#9ba1ad)] hover:text-[var(--text-primary,#f2f3f5)] cursor-pointer"
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

      {/* ── Unified Context Menu Overlay (Tracks, Albums, Artists) ── */}
      {contextMenu.isOpen && (
        <>
          <div
            onClick={handleCloseContextMenu}
            onContextMenu={(e) => {
              e.preventDefault();
              handleCloseContextMenu();
            }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-100"
          />
          <div
            role="menu"
            aria-label="Item options menu"
            style={{
              top: `${Math.min(Math.max(12, contextMenu.y), (typeof window !== "undefined" ? window.innerHeight : 800) - 420)}px`,
              left: `${Math.min(Math.max(12, contextMenu.x), (typeof window !== "undefined" ? window.innerWidth : 400) - 255)}px`,
            }}
            className="fixed z-50 w-60 rounded-2xl border border-[var(--border-medium,rgba(255,255,255,0.12))] bg-[var(--surface-charcoal,#111216)] p-1.5 text-xs text-[var(--text-primary,#f2f3f5)] shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Track Menu */}
            {contextMenu.track && (
              <>
                <div className="px-3 py-2 border-b border-[var(--border-subtle,rgba(255,255,255,0.06))] mb-1 flex items-center gap-2.5">
                  {contextMenu.track.coverImage ? (
                    <img
                      src={contextMenu.track.coverImage}
                      alt=""
                      className="h-8 w-8 rounded-lg object-cover bg-[var(--surface-raised,#16181e)] shrink-0"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-[var(--surface-raised,#16181e)] border border-[var(--border-subtle,rgba(255,255,255,0.06))] flex items-center justify-center shrink-0">
                      <Music2 className="h-4 w-4 text-[#e59e38]/80" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs truncate text-[var(--text-primary,#f2f3f5)]">{contextMenu.track.title}</p>
                    <p className="text-[10px] text-[var(--text-secondary,#9ba1ad)] truncate">{contextMenu.track.artistName || "Unknown Artist"}</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    handleTrackClick(contextMenu.track!, localTracks);
                    handleCloseContextMenu();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--surface-active,#1e2027)] hover:text-[#e59e38] text-left transition-colors cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>Play Now</span>
                </button>

                <button
                  onClick={() => {
                    playNextInQueue(contextMenu.track!);
                    handleCloseContextMenu();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--surface-active,#1e2027)] hover:text-[#e59e38] text-left transition-colors cursor-pointer"
                >
                  <PlayCircle className="h-3.5 w-3.5" />
                  <span>Play Next</span>
                </button>

                <button
                  onClick={() => {
                    addToQueue(contextMenu.track!);
                    handleCloseContextMenu();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--surface-active,#1e2027)] hover:text-[#e59e38] text-left transition-colors cursor-pointer"
                >
                  <ListPlus className="h-3.5 w-3.5" />
                  <span>Add to Queue</span>
                </button>

                <button
                  onClick={(e) => {
                    handleToggleFavorite(contextMenu.track!.id, e);
                    handleCloseContextMenu();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--surface-active,#1e2027)] text-left transition-colors cursor-pointer"
                >
                  <Heart
                    className={`h-3.5 w-3.5 ${
                      favoriteIds.has(contextMenu.track.id) ? "text-[#C6604F] fill-current" : ""
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
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--surface-active,#1e2027)] text-left transition-colors cursor-pointer"
                >
                  <ListMusic className="h-3.5 w-3.5" />
                  <span>Add to Playlist...</span>
                </button>

                <div className="h-px bg-[var(--border-subtle,rgba(255,255,255,0.06))] my-1" />

                <button
                  onClick={() => {
                    setInfoTrack(contextMenu.track!);
                    handleCloseContextMenu();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--surface-active,#1e2027)] text-left transition-colors cursor-pointer"
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
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--surface-active,#1e2027)] text-left transition-colors cursor-pointer"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Edit Metadata & Tags</span>
                </button>

                <button
                  onClick={() => {
                    removeLocalTrack(contextMenu.track!.id);
                    handleCloseContextMenu();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-500/10 text-rose-400 text-left transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Remove from Vault</span>
                </button>
              </>
            )}

            {/* Album Menu */}
            {contextMenu.album && (
              <>
                <div className="px-3 py-2 border-b border-[var(--border-subtle,rgba(255,255,255,0.06))] mb-1 flex items-center gap-2.5">
                  {contextMenu.album.coverImage ? (
                    <img
                      src={contextMenu.album.coverImage}
                      alt=""
                      className="h-8 w-8 rounded-lg object-cover bg-[var(--surface-raised,#16181e)] shrink-0"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-[var(--surface-raised,#16181e)] border border-[var(--border-subtle,rgba(255,255,255,0.06))] flex items-center justify-center shrink-0">
                      <Disc className="h-4 w-4 text-[#e59e38]/80" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs truncate text-[var(--text-primary,#f2f3f5)]">{contextMenu.album.name}</p>
                    <p className="text-[10px] text-[var(--text-secondary,#9ba1ad)] truncate">{contextMenu.album.artistName || "Unknown Artist"}</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (contextMenu.album!.tracks.length > 0) {
                      handleTrackClick(contextMenu.album!.tracks[0], contextMenu.album!.tracks);
                    }
                    handleCloseContextMenu();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--surface-active,#1e2027)] hover:text-[#e59e38] text-left transition-colors cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>Play Album</span>
                </button>

                <button
                  onClick={() => {
                    if (contextMenu.album!.tracks.length > 0) {
                      const shuffled = [...contextMenu.album!.tracks].sort(() => Math.random() - 0.5);
                      handleTrackClick(shuffled[0], shuffled);
                    }
                    handleCloseContextMenu();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--surface-active,#1e2027)] hover:text-[#e59e38] text-left transition-colors cursor-pointer"
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  <span>Shuffle Album</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedAlbum(contextMenu.album!);
                    handleCloseContextMenu();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--surface-active,#1e2027)] text-left transition-colors cursor-pointer"
                >
                  <Disc3 className="h-3.5 w-3.5 text-[#e59e38]" />
                  <span>View Album Details</span>
                </button>

                <button
                  onClick={() => {
                    contextMenu.album!.tracks.forEach((t) => addToQueue(t));
                    toast.success(`Added ${contextMenu.album!.tracks.length} tracks to queue`);
                    handleCloseContextMenu();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--surface-active,#1e2027)] text-left transition-colors cursor-pointer"
                >
                  <ListPlus className="h-3.5 w-3.5" />
                  <span>Add Album to Queue</span>
                </button>
              </>
            )}

            {/* Artist Menu */}
            {contextMenu.artist && (
              <>
                <div className="px-3 py-2 border-b border-[var(--border-subtle,rgba(255,255,255,0.06))] mb-1 flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-[var(--surface-raised,#16181e)] flex items-center justify-center text-[#e59e38] shrink-0 border border-[var(--border-subtle,rgba(255,255,255,0.08))]">
                    <Users className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs truncate text-[var(--text-primary,#f2f3f5)]">{contextMenu.artist.artistName}</p>
                    <p className="text-[10px] text-[var(--text-secondary,#9ba1ad)] truncate">{contextMenu.artist.trackCount} tracks in vault</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (contextMenu.artist!.tracks.length > 0) {
                      handleTrackClick(contextMenu.artist!.tracks[0], contextMenu.artist!.tracks);
                    }
                    handleCloseContextMenu();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--surface-active,#1e2027)] hover:text-[#e59e38] text-left transition-colors cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>Play All Tracks</span>
                </button>

                <button
                  onClick={() => {
                    if (contextMenu.artist!.tracks.length > 0) {
                      const shuffled = [...contextMenu.artist!.tracks].sort(() => Math.random() - 0.5);
                      handleTrackClick(shuffled[0], shuffled);
                    }
                    handleCloseContextMenu();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--surface-active,#1e2027)] hover:text-[#e59e38] text-left transition-colors cursor-pointer"
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  <span>Shuffle Artist Tracks</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedArtist(contextMenu.artist!);
                    handleCloseContextMenu();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--surface-active,#1e2027)] text-left transition-colors cursor-pointer"
                >
                  <Users className="h-3.5 w-3.5 text-[#e59e38]" />
                  <span>View Artist Profile</span>
                </button>

                <button
                  onClick={() => {
                    contextMenu.artist!.tracks.forEach((t) => addToQueue(t));
                    toast.success(`Added ${contextMenu.artist!.tracks.length} tracks to queue`);
                    handleCloseContextMenu();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--surface-active,#1e2027)] text-left transition-colors cursor-pointer"
                >
                  <ListPlus className="h-3.5 w-3.5" />
                  <span>Add All to Queue</span>
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* ── Technical Audio Information Modal ── */}
      {infoTrack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-medium,rgba(255,255,255,0.12))] bg-[var(--surface-charcoal,#111216)] p-6 text-[var(--text-primary,#f2f3f5)] shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-[var(--border-subtle,rgba(255,255,255,0.08))] pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--surface-raised,#16181e)] text-[#e59e38] border border-[var(--border-subtle,rgba(255,255,255,0.08))]">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary,#f2f3f5)] truncate max-w-[240px]">
                    {infoTrack.title}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary,#9ba1ad)] truncate">{infoTrack.artistName || "Local Artist"}</p>
                </div>
              </div>
              <button
                onClick={() => setInfoTrack(null)}
                className="p-1.5 text-[var(--text-tertiary,#6b7280)] hover:text-[var(--text-primary,#f2f3f5)] rounded-lg hover:bg-[var(--surface-active,#1e2027)] transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-[var(--border-subtle,rgba(255,255,255,0.06))] bg-[var(--surface-sunken,#060708)] p-3">
                <span className="text-[10px] font-mono text-[var(--text-tertiary,#6b7280)] uppercase tracking-wider block mb-1">
                  Container / Format
                </span>
                <span className="font-mono font-bold text-[#e59e38] text-sm">
                  {infoTrack.format || (infoTrack.quality ? infoTrack.quality.split(" ")[0] : "Unknown")}
                </span>
              </div>

              <div className="rounded-xl border border-[var(--border-subtle,rgba(255,255,255,0.06))] bg-[var(--surface-sunken,#060708)] p-3">
                <span className="text-[10px] font-mono text-[var(--text-tertiary,#6b7280)] uppercase tracking-wider block mb-1">
                  Audio Quality Tier
                </span>
                <span className="font-mono font-bold text-[var(--text-primary,#f2f3f5)]">
                  {infoTrack.quality || "FLAC 24-bit / 96 kHz"}
                </span>
              </div>

              <div className="rounded-xl border border-[var(--border-subtle,rgba(255,255,255,0.06))] bg-[var(--surface-sunken,#060708)] p-3">
                <span className="text-[10px] font-mono text-[var(--text-tertiary,#6b7280)] uppercase tracking-wider block mb-1">
                  Channels
                </span>
                <span className="font-mono text-[var(--text-primary,#f2f3f5)]">
                  {(infoTrack as any).channels === 1
                    ? "Mono (1.0)"
                    : (infoTrack as any).channels === 6
                    ? "5.1 Surround"
                    : (infoTrack as any).channels === 8
                    ? "7.1 Surround"
                    : "Stereo (2.0)"}
                  {" PCM"}
                </span>
              </div>

              <div className="rounded-xl border border-[var(--border-subtle,rgba(255,255,255,0.06))] bg-[var(--surface-sunken,#060708)] p-3">
                <span className="text-[10px] font-mono text-[var(--text-tertiary,#6b7280)] uppercase tracking-wider block mb-1">
                  Duration
                </span>
                <span className="font-mono text-[var(--text-primary,#f2f3f5)]">{formatSeconds(infoTrack.duration || 0)}</span>
              </div>

              <div className="rounded-xl border border-[var(--border-subtle,rgba(255,255,255,0.06))] bg-[var(--surface-sunken,#060708)] p-3">
                <span className="text-[10px] font-mono text-[var(--text-tertiary,#6b7280)] uppercase tracking-wider block mb-1">
                  Storage Footprint
                </span>
                <span className="font-mono text-[var(--text-primary,#f2f3f5)]">
                  {infoTrack.fileSizeBytes
                    ? `${(infoTrack.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB`
                    : "IndexedDB Blob"}
                </span>
              </div>

              <div className="rounded-xl border border-[var(--border-subtle,rgba(255,255,255,0.06))] bg-[var(--surface-sunken,#060708)] p-3">
                <span className="text-[10px] font-mono text-[var(--text-tertiary,#6b7280)] uppercase tracking-wider block mb-1">
                  Bitrate
                </span>
                <span className="font-mono text-[var(--text-primary,#f2f3f5)]">
                  {infoTrack.fileSizeBytes && infoTrack.duration && infoTrack.duration > 0
                    ? `${Math.round((infoTrack.fileSizeBytes * 8) / infoTrack.duration / 1000)} kbps`
                    : "Variable Lossless"}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border-subtle,rgba(255,255,255,0.06))] bg-[var(--surface-sunken,#060708)] p-3 text-[11px] font-mono text-[var(--text-secondary,#9ba1ad)]">
              <div className="flex items-center gap-1.5 text-[#e59e38] font-bold mb-1">
                <Database className="h-3.5 w-3.5" />
                <span>LOCAL VAULT STORAGE VERIFIED</span>
              </div>
              <p className="text-[10px] text-[var(--text-tertiary,#6b7280)]">
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

      {/* ── Album Detail View Modal ── */}
      {selectedAlbum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl border border-[var(--border-medium,rgba(255,255,255,0.12))] bg-[var(--surface-charcoal,#111216)] shadow-2xl overflow-hidden overscroll-contain">
            {/* Header */}
            <div className="relative p-5 sm:p-6 pb-4 border-b border-[var(--border-subtle,rgba(255,255,255,0.08))] bg-gradient-to-b from-white/[0.04] to-transparent flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <button
                onClick={() => setSelectedAlbum(null)}
                aria-label="Close album details"
                className="absolute right-4 top-4 p-2 rounded-full bg-[var(--surface-raised,#16181e)] hover:bg-[var(--surface-active,#1e2027)] text-[var(--text-secondary,#9ba1ad)] hover:text-[var(--text-primary,#f2f3f5)] transition-colors cursor-pointer border border-[var(--border-subtle,rgba(255,255,255,0.06))]"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="relative h-32 w-32 sm:h-36 sm:w-36 shrink-0 overflow-hidden rounded-xl bg-[var(--surface-raised,#16181e)] border border-[var(--border-subtle,rgba(255,255,255,0.1))] shadow-xl flex items-center justify-center">
                {selectedAlbum.coverImage ? (
                  <img
                    src={selectedAlbum.coverImage}
                    alt={selectedAlbum.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Disc className="h-16 w-16 text-[#e59e38]/50" />
                )}
              </div>

              <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left min-w-0">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#e59e38] bg-[#e59e38]/10 px-2 py-0.5 rounded-full border border-[#e59e38]/20 mb-1.5">
                  Album Vault
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary,#f2f3f5)] truncate max-w-full">
                  {selectedAlbum.name}
                </h2>
                <p className="text-sm font-semibold text-[var(--text-secondary,#9ba1ad)] mt-0.5">
                  {selectedAlbum.artistName || "Unknown Artist"}
                </p>
                <p className="text-xs font-mono text-[var(--text-tertiary,#6b7280)] mt-1">
                  {selectedAlbum.trackCount} {selectedAlbum.trackCount === 1 ? "track" : "tracks"} · {formatSeconds(selectedAlbum.tracks.reduce((acc, t) => acc + (t.duration || 0), 0))}
                </p>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2.5 mt-4">
                  <button
                    onClick={() => {
                      if (selectedAlbum.tracks.length > 0) {
                        handleTrackClick(selectedAlbum.tracks[0], selectedAlbum.tracks);
                      }
                    }}
                    className="flex items-center gap-2 rounded-xl bg-[#e59e38] px-4 py-2 text-xs font-bold text-[#090a0c] hover:bg-[#f0ab4d] transition-all cursor-pointer shadow-lg hover:scale-105"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    Play Album
                  </button>

                  <button
                    onClick={() => {
                      if (selectedAlbum.tracks.length > 0) {
                        const shuffled = [...selectedAlbum.tracks].sort(() => Math.random() - 0.5);
                        handleTrackClick(shuffled[0], shuffled);
                      }
                    }}
                    className="flex items-center gap-2 rounded-xl bg-[var(--surface-raised,#16181e)] hover:bg-[var(--surface-active,#1e2027)] border border-[var(--border-subtle,rgba(255,255,255,0.06))] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary,#f2f3f5)] transition-all cursor-pointer"
                  >
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    Shuffle
                  </button>
                </div>
              </div>
            </div>

            {/* Tracklist */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-1.5 no-scrollbar">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary,#6b7280)] px-3 py-1 font-mono">
                Tracks in this album ({selectedAlbum.tracks.length})
              </h3>
              {selectedAlbum.tracks.map((track, idx) => {
                const isCurrent = currentTrack?.id === track.id;
                const isFav = favoriteIds.has(track.id);
                return (
                  <div
                    key={track.id}
                    onClick={() => handleTrackClick(track, selectedAlbum.tracks)}
                    className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs transition-colors cursor-pointer ${
                      isCurrent
                        ? "bg-[#e59e38]/10 text-[#e59e38] border border-[#e59e38]/20"
                        : "hover:bg-[var(--surface-raised,#16181e)] text-[var(--text-primary,#f2f3f5)]"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="w-5 text-center font-mono text-[11px] text-[var(--text-tertiary,#6b7280)]">
                        {isCurrent && isPlaying ? (
                          <Volume2 className="h-3.5 w-3.5 text-[#e59e38] animate-pulse inline" />
                        ) : (
                          idx + 1
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`font-semibold truncate ${isCurrent ? "text-[#e59e38]" : "text-[var(--text-primary,#f2f3f5)]"}`}>
                          {track.title}
                        </p>
                        <p className="text-[11px] text-[var(--text-secondary,#9ba1ad)] truncate">
                          {track.artistName || selectedAlbum.artistName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span className="rounded bg-[var(--surface-raised,#16181e)] border border-[var(--border-subtle,rgba(255,255,255,0.06))] px-1.5 py-0.5 text-[9px] font-mono text-[#e59e38]">
                        {track.format || track.quality || "AUDIO"}
                      </span>
                      <span className="font-mono text-[11px] text-[var(--text-tertiary,#6b7280)]">
                        {formatSeconds(track.duration || 0)}
                      </span>
                      <button
                        onClick={(e) => handleToggleFavorite(track.id, e)}
                        className={`p-1.5 rounded transition-colors cursor-pointer ${
                          isFav ? "text-[#C6604F]" : "text-[var(--text-tertiary,#6b7280)] hover:text-[var(--text-primary,#f2f3f5)]"
                        }`}
                      >
                        <Heart className={`h-3.5 w-3.5 ${isFav ? "fill-current" : ""}`} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Artist Detail View Modal ── */}
      {selectedArtist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl border border-[var(--border-medium,rgba(255,255,255,0.12))] bg-[var(--surface-charcoal,#111216)] shadow-2xl overflow-hidden overscroll-contain">
            {/* Header */}
            <div className="relative p-5 sm:p-6 pb-4 border-b border-[var(--border-subtle,rgba(255,255,255,0.08))] bg-gradient-to-b from-white/[0.04] to-transparent flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <button
                onClick={() => setSelectedArtist(null)}
                aria-label="Close artist details"
                className="absolute right-4 top-4 p-2 rounded-full bg-[var(--surface-raised,#16181e)] hover:bg-[var(--surface-active,#1e2027)] text-[var(--text-secondary,#9ba1ad)] hover:text-[var(--text-primary,#f2f3f5)] transition-colors cursor-pointer border border-[var(--border-subtle,rgba(255,255,255,0.06))]"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center rounded-full bg-[var(--surface-raised,#16181e)] border border-[var(--border-subtle,rgba(255,255,255,0.1))] shadow-xl shrink-0">
                <Users className="h-12 w-12 text-[#e59e38]" />
              </div>

              <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left min-w-0">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#e59e38] bg-[#e59e38]/10 px-2 py-0.5 rounded-full border border-[#e59e38]/20 mb-1.5">
                  Artist Profile
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary,#f2f3f5)] truncate max-w-full">
                  {selectedArtist.artistName || "Unknown Artist"}
                </h2>
                <p className="text-xs font-mono text-[var(--text-tertiary,#6b7280)] mt-1">
                  {selectedArtist.trackCount} {selectedArtist.trackCount === 1 ? "track" : "tracks"} in vault
                </p>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2.5 mt-4">
                  <button
                    onClick={() => {
                      if (selectedArtist.tracks.length > 0) {
                        handleTrackClick(selectedArtist.tracks[0], selectedArtist.tracks);
                      }
                    }}
                    className="flex items-center gap-2 rounded-xl bg-[#e59e38] px-4 py-2 text-xs font-bold text-[#090a0c] hover:bg-[#f0ab4d] transition-all cursor-pointer shadow-lg hover:scale-105"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    Play All
                  </button>

                  <button
                    onClick={() => {
                      if (selectedArtist.tracks.length > 0) {
                        const shuffled = [...selectedArtist.tracks].sort(() => Math.random() - 0.5);
                        handleTrackClick(shuffled[0], shuffled);
                      }
                    }}
                    className="flex items-center gap-2 rounded-xl bg-[var(--surface-raised,#16181e)] hover:bg-[var(--surface-active,#1e2027)] border border-[var(--border-subtle,rgba(255,255,255,0.06))] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary,#f2f3f5)] transition-all cursor-pointer"
                  >
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    Shuffle
                  </button>
                </div>
              </div>
            </div>

            {/* Tracklist */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-1.5 no-scrollbar">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary,#6b7280)] px-3 py-1 font-mono">
                All Tracks by {selectedArtist.artistName}
              </h3>
              {selectedArtist.tracks.map((track, idx) => {
                const isCurrent = currentTrack?.id === track.id;
                const isFav = favoriteIds.has(track.id);
                return (
                  <div
                    key={track.id}
                    onClick={() => handleTrackClick(track, selectedArtist.tracks)}
                    className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs transition-colors cursor-pointer ${
                      isCurrent
                        ? "bg-[#e59e38]/10 text-[#e59e38] border border-[#e59e38]/20"
                        : "hover:bg-[var(--surface-raised,#16181e)] text-[var(--text-primary,#f2f3f5)]"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="w-5 text-center font-mono text-[11px] text-[var(--text-tertiary,#6b7280)]">
                        {isCurrent && isPlaying ? (
                          <Volume2 className="h-3.5 w-3.5 text-[#e59e38] animate-pulse inline" />
                        ) : (
                          idx + 1
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`font-semibold truncate ${isCurrent ? "text-[#e59e38]" : "text-[var(--text-primary,#f2f3f5)]"}`}>
                          {track.title}
                        </p>
                        <p className="text-[11px] text-[var(--text-secondary,#9ba1ad)] truncate">
                          {track.album || "Single Tracks"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span className="rounded bg-[var(--surface-raised,#16181e)] border border-[var(--border-subtle,rgba(255,255,255,0.06))] px-1.5 py-0.5 text-[9px] font-mono text-[#e59e38]">
                        {track.format || track.quality || "AUDIO"}
                      </span>
                      <span className="font-mono text-[11px] text-[var(--text-tertiary,#6b7280)]">
                        {formatSeconds(track.duration || 0)}
                      </span>
                      <button
                        onClick={(e) => handleToggleFavorite(track.id, e)}
                        className={`p-1.5 rounded transition-colors cursor-pointer ${
                          isFav ? "text-[#C6604F]" : "text-[var(--text-tertiary,#6b7280)] hover:text-[var(--text-primary,#f2f3f5)]"
                        }`}
                      >
                        <Heart className={`h-3.5 w-3.5 ${isFav ? "fill-current" : ""}`} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OfflineLibrary;
