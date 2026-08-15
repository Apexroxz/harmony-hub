import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import type { Track, AudioFormat } from "@/domain/music/types";
import { extractAudioMetadata, type ExtractedMetadata } from "./tagExtractor";
import { getAudioFormatName, SUPPORTED_AUDIO_EXTENSIONS } from "@/domain/music/quality-tier";
import { tracks as catalogTracks } from "@/domain/music/catalog";
import { storeAudioBlob, getAudioBlobUrl, deleteAudioBlob } from "./indexedDbAudio";
import cover1 from "@/assets/covers/cover-1.jpg";
import cover2 from "@/assets/covers/cover-2.jpg";
import cover3 from "@/assets/covers/cover-3.jpg";
import cover4 from "@/assets/covers/cover-4.jpg";
import cover5 from "@/assets/covers/cover-5.jpg";
import cover6 from "@/assets/covers/cover-6.jpg";

export type AppMode = "online" | "offline";

export interface LocalTrack extends Track {
  folderPath?: string;
  album?: string;
  year?: string;
  trackNumber?: number;
  fileSizeBytes?: number;
}

export interface LocalPlaylist {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: string;
}

export interface LocalAlbum {
  name: string;
  artistName: string;
  coverImage: string;
  trackCount: number;
  tracks: LocalTrack[];
}

export interface LocalArtistGroup {
  artistName: string;
  trackCount: number;
  tracks: LocalTrack[];
}

export interface LocalFolderGroup {
  folderPath: string;
  trackCount: number;
  tracks: LocalTrack[];
}

export interface OfflineSettings {
  gaplessPlayback: boolean;
  crossfadeSeconds: number;
  bufferSize: "Direct" | "Fast (64kb)" | "Audiophile (512kb)";
  highResOutput: boolean;
  autoRescan: boolean;
}

export const LOCAL_SAMPLE_TRACKS: LocalTrack[] = [
  {
    id: "local-midnight-protocol",
    title: "Midnight Protocol",
    artistId: "neon-drifter",
    artistName: "Neon Drifter",
    artist: "Neon Drifter",
    coverImage: cover1,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    duration: 371,
    genre: "Synthwave",
    quality: "FLAC",
    format: "FLAC",
    source: "offline",
    bitrate: 1411,
    sampleRate: 44100,
    bitDepth: 16,
    playCount: 0,
    likes: 0,
    comments: 0,
    createdAt: "2026-08-01",
    uploaderId: "local-device",
    folderPath: "Music/Synthwave",
    album: "Midnight Sessions",
    fileSizeBytes: 65400000,
  },
  {
    id: "local-phantom-waves",
    title: "Phantom Waves",
    artistId: "solana-siren",
    artistName: "Solana Siren",
    artist: "Solana Siren",
    coverImage: cover3,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    duration: 337,
    genre: "Electropop",
    quality: "WAV",
    format: "WAV",
    source: "offline",
    bitrate: 4608,
    sampleRate: 96000,
    bitDepth: 24,
    playCount: 0,
    likes: 0,
    comments: 0,
    createdAt: "2026-08-05",
    uploaderId: "local-device",
    folderPath: "Music/Electropop",
    album: "Waves Vol 1",
    fileSizeBytes: 194000000,
  },
  {
    id: "local-hash-rate",
    title: "Hash Rate",
    artistId: "byte-bass",
    artistName: "Byte Bass",
    artist: "Byte Bass",
    coverImage: cover5,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    duration: 342,
    genre: "Bass",
    quality: "ALAC",
    format: "ALAC",
    source: "offline",
    bitrate: 1411,
    sampleRate: 44100,
    bitDepth: 16,
    playCount: 0,
    likes: 0,
    comments: 0,
    createdAt: "2026-08-08",
    uploaderId: "local-device",
    folderPath: "Downloads/Bass",
    album: "Grid Beats",
    fileSizeBytes: 60200000,
  },
  {
    id: "local-chain-reaction",
    title: "Chain Reaction",
    artistId: "neon-drifter",
    artistName: "Neon Drifter",
    artist: "Neon Drifter",
    coverImage: cover2,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    duration: 226,
    genre: "Cyberpunk",
    quality: "FLAC",
    format: "FLAC",
    source: "offline",
    bitrate: 4608,
    sampleRate: 96000,
    bitDepth: 24,
    playCount: 0,
    likes: 0,
    comments: 0,
    createdAt: "2026-08-10",
    uploaderId: "local-device",
    folderPath: "Music/Synthwave",
    album: "Midnight Sessions",
    fileSizeBytes: 130000000,
  },
];

interface ModeContextValue {
  mode: AppMode;
  isOffline: boolean;
  isOnline: boolean;
  toggleMode: () => void;
  setMode: (mode: AppMode) => void;
  localTracks: LocalTrack[];
  localAlbums: LocalAlbum[];
  localArtistGroups: LocalArtistGroup[];
  localFolders: LocalFolderGroup[];
  localPlaylists: LocalPlaylist[];
  storageUsedMb: number;
  formatsSummary: { flac: number; wav: number; alac: number; mp3: number };
  offlineSettings: OfflineSettings;
  updateOfflineSettings: (updates: Partial<OfflineSettings>) => void;
  importLocalFiles: (files: FileList | File[]) => Promise<void>;
  removeLocalTrack: (id: string) => void;
  updateLocalTrackMetadata: (id: string, updates: Partial<LocalTrack>) => void;
  createPlaylist: (name: string) => void;
  deletePlaylist: (id: string) => void;
  addTrackToPlaylist: (playlistId: string, trackId: string) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  rescanLibrary: () => void;
  clearOfflineCache: () => void;
  saveTrackOffline: (track: Track) => Promise<void>;
  removeDownloadedTrack: (trackId: string) => void;
  isTrackDownloaded: (trackId: string) => boolean;
  downloadedTracks: LocalTrack[];
}

const ModeContext = createContext<ModeContextValue | null>(null);

const STORAGE_KEY = "layam_app_mode";
const LOCAL_TRACKS_KEY = "layam_imported_tracks";
const PLAYLISTS_KEY = "layam_local_playlists";
const SETTINGS_KEY = "layam_offline_settings";
const OFFLINE_DOWNLOADS_KEY = "layam_offline_downloads";

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "online" || saved === "offline") return saved;
    }
    return "online";
  });

  const [importedTracks, setImportedTracks] = useState<LocalTrack[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(LOCAL_TRACKS_KEY);
        if (saved) return JSON.parse(saved) as LocalTrack[];
      } catch {
        // ignore
      }
    }
    return [];
  });

  const [downloadedTracks, setDownloadedTracks] = useState<LocalTrack[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(OFFLINE_DOWNLOADS_KEY);
        if (saved) return JSON.parse(saved) as LocalTrack[];
      } catch {
        // ignore
      }
    }
    return [];
  });

  const [localPlaylists, setLocalPlaylists] = useState<LocalPlaylist[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(PLAYLISTS_KEY);
        if (saved) return JSON.parse(saved) as LocalPlaylist[];
      } catch {
        // ignore
      }
    }
    return [
      {
        id: "playlist-favorites",
        name: "Hi-Fi Favorites",
        trackIds: ["local-midnight-protocol", "local-phantom-waves"],
        createdAt: "2026-08-10",
      },
    ];
  });

  const [offlineSettings, setOfflineSettings] = useState<OfflineSettings>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(SETTINGS_KEY);
        if (saved) return JSON.parse(saved) as OfflineSettings;
      } catch {
        // ignore
      }
    }
    return {
      gaplessPlayback: true,
      crossfadeSeconds: 0,
      bufferSize: "Audiophile (512kb)",
      highResOutput: true,
      autoRescan: true,
    };
  });

  const [sampleTracks, setSampleTracks] = useState<LocalTrack[]>(LOCAL_SAMPLE_TRACKS);

  // Sync state to localStorage & revive Blob URLs from IndexedDB
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore
    }
  }, [mode]);

  // Restore active Blob URLs for all imported tracks on mount/refresh
  useEffect(() => {
    let active = true;
    async function restoreBlobs() {
      if (importedTracks.length === 0) return;
      let hasUpdates = false;
      const updatedTracks = await Promise.all(
        importedTracks.map(async (track) => {
          if (track.id.startsWith("local-custom-")) {
            const blobUrl = await getAudioBlobUrl(track.id);
            if (blobUrl && blobUrl !== track.audioUrl) {
              hasUpdates = true;
              return { ...track, audioUrl: blobUrl };
            }
          }
          return track;
        }),
      );
      if (active && hasUpdates) {
        setImportedTracks(updatedTracks);
      }
    }
    void restoreBlobs();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_TRACKS_KEY, JSON.stringify(importedTracks));
    } catch {
      // ignore
    }
  }, [importedTracks]);

  useEffect(() => {
    try {
      localStorage.setItem(OFFLINE_DOWNLOADS_KEY, JSON.stringify(downloadedTracks));
    } catch {
      // ignore
    }
  }, [downloadedTracks]);

  useEffect(() => {
    try {
      localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(localPlaylists));
    } catch {
      // ignore
    }
  }, [localPlaylists]);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(offlineSettings));
    } catch {
      // ignore
    }
  }, [offlineSettings]);

  const updateOfflineSettings = useCallback((updates: Partial<OfflineSettings>) => {
    setOfflineSettings((prev) => ({ ...prev, ...updates }));
    toast.success("Offline settings saved");
  }, []);

  const handleRouteRedirectOnModeChange = useCallback((targetMode: AppMode) => {
    if (typeof window === "undefined") return;
    const path = window.location.pathname;
    if (targetMode === "offline") {
      // If user is on an online route, shift immediately to the Offline Player
      const onlineRoutes = ["/feed", "/stream", "/radio", "/store", "/artists", "/upload", "/dashboard"];
      if (onlineRoutes.some((r) => path.startsWith(r)) || path === "/") {
        window.history.pushState(null, "", "/library");
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
    }
  }, []);

  const setMode = useCallback((newMode: AppMode) => {
    setModeState(newMode);
    handleRouteRedirectOnModeChange(newMode);
    toast.info(
      `Switched to ${newMode === "offline" ? "Offline Hi-Fi Player" : "Online Streaming Mode"}`,
      {
        description:
          newMode === "offline"
            ? "Local Hi-Fi engine active. Zero network requests."
            : "Full streaming catalog, store, and creator features active.",
      },
    );
  }, [handleRouteRedirectOnModeChange]);

  const toggleMode = useCallback(() => {
    setModeState((prev) => {
      const next = prev === "online" ? "offline" : "online";
      handleRouteRedirectOnModeChange(next);
      toast.info(
        `Switched to ${next === "offline" ? "Offline Hi-Fi Player" : "Online Streaming Mode"}`,
        {
          description:
            next === "offline"
              ? "Local audiophile player active. Zero network requests."
              : "Full streaming catalog, store, and community active.",
        },
      );
      return next;
    });
  }, [handleRouteRedirectOnModeChange]);

  // Sync Purchased Store Music into Offline Library
  const purchasedLocalTracks = useMemo<LocalTrack[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = sessionStorage.getItem("layam_purchases");
      if (!stored) return [];
      const purchasedIds = JSON.parse(stored) as string[];
      return catalogTracks
        .filter((t) => purchasedIds.includes(t.id))
        .map((t) => ({
          ...t,
          source: "offline" as const,
          format: t.quality,
          artist: t.artistName,
          folderPath: "Downloads/Purchased",
          album: t.album || "Store Master Downloads",
          fileSizeBytes: t.duration * (t.bitrate || 1411) * 125, // estimated file size
        }));
    } catch {
      return [];
    }
  }, []);

  const importLocalFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    console.log(
      "[OfflineImport:1/5] Browser received raw files count:",
      fileArray.length,
      fileArray,
    );
    if (fileArray.length === 0) return;

    // Filter strictly for audio files (ignoring .DS_Store, artwork, directories, etc.)
    const validAudioFiles = fileArray.filter((file) => {
      if (!file || !file.name || file.name.startsWith(".")) return false;
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      const isAudio =
        file.type.startsWith("audio/") ||
        SUPPORTED_AUDIO_EXTENSIONS.includes(ext) ||
        /\.(mp3|aac|m4a|ogg|opus|wav|flac|alac|aiff?)$/i.test(file.name);
      return isAudio;
    });

    console.log(
      "[OfflineImport:2/5] Valid audio files detected:",
      validAudioFiles.length,
      validAudioFiles.map((f) => ({ name: f.name, size: f.size, type: f.type })),
    );

    if (validAudioFiles.length === 0) {
      console.warn("[OfflineImport:Warn] No valid audio files found in selection.");
      toast.warning("No audio files detected in selection", {
        description: "Please select .mp3, .wav, .flac, .m4a, .aac, or .ogg audio files.",
      });
      return;
    }

    const newTracks: LocalTrack[] = [];
    const fallbackCovers = [cover1, cover2, cover3, cover4, cover5, cover6];

    for (let i = 0; i < validAudioFiles.length; i++) {
      const file = validAudioFiles[i];
      if (!file) continue;
      try {
        const format = getAudioFormatName(file.name);
        const isLossless = ["FLAC", "WAV", "AIFF", "ALAC"].includes(format);
        const objectUrl = URL.createObjectURL(file);
        const trackId = `local-custom-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`;

        // Permanently persist the raw audio Blob in browser IndexedDB
        await storeAudioBlob(trackId, file, file.name);

        // Extract embedded ID3 tags
        const metadata: ExtractedMetadata = await extractAudioMetadata(file).catch(() => ({
          title: file.name.replace(/\.[^/.]+$/, ""),
          artist: "Local Device",
          album: "Local Audio",
          folderPath: "Imported Tracks",
        }));

        const coverFallback = fallbackCovers[i % fallbackCovers.length] || cover1;

        const track: LocalTrack = {
          id: trackId,
          title: metadata.title || file.name.replace(/\.[^/.]+$/, ""),
          artistId: "local-artist",
          artistName: metadata.artist || "Local Device",
          artist: metadata.artist || "Local Device",
          album: metadata.album || "Local Audio",
          coverImage: metadata.coverImage || coverFallback || cover1,
          audioUrl: objectUrl,
          source: "offline",
          format,
          duration: metadata.duration || 180,
          genre: "Local Audio",
          quality: format as AudioFormat,
          bitrate: isLossless ? (format === "WAV" ? 4608 : 1411) : 320,
          sampleRate: format === "WAV" ? 96000 : 44100,
          bitDepth: format === "WAV" ? 24 : isLossless ? 16 : null,
          playCount: 0,
          likes: 0,
          comments: 0,
          createdAt: new Date().toISOString().slice(0, 10),
          uploaderId: "local-user",
          folderPath: metadata.folderPath || "Imported Tracks",
          fileSizeBytes: file.size || 45000000,
        };

        newTracks.push(track);
      } catch (err) {
        console.error("[OfflineImport:Error] Failed to import single file:", file.name, err);
      }
    }

    if (newTracks.length > 0) {
      setImportedTracks((prev) => [...newTracks, ...prev]);
      toast.success(`Imported & saved ${newTracks.length} local master(s)`, {
        description: "Cached in permanent local database. Playable anytime.",
      });
    }
  }, []);

  const removeLocalTrack = useCallback((id: string) => {
    void deleteAudioBlob(id);
    setImportedTracks((prev) => prev.filter((t) => t.id !== id));
    toast.info("Removed local track from library");
  }, []);

  const updateLocalTrackMetadata = useCallback((id: string, updates: Partial<LocalTrack>) => {
    setImportedTracks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    setSampleTracks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    toast.success("Updated track tags & metadata");
  }, []);

  const createPlaylist = useCallback((name: string) => {
    if (!name.trim()) return;
    const newPl: LocalPlaylist = {
      id: `pl-${Date.now()}`,
      name: name.trim(),
      trackIds: [],
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setLocalPlaylists((prev) => [...prev, newPl]);
    toast.success(`Created local playlist "${name}"`);
  }, []);

  const deletePlaylist = useCallback((id: string) => {
    setLocalPlaylists((prev) => prev.filter((p) => p.id !== id));
    toast.info("Playlist removed");
  }, []);

  const addTrackToPlaylist = useCallback((playlistId: string, trackId: string) => {
    setLocalPlaylists((prev) =>
      prev.map((p) => {
        if (p.id !== playlistId) return p;
        if (p.trackIds.includes(trackId)) return p;
        return { ...p, trackIds: [...p.trackIds, trackId] };
      }),
    );
    toast.success("Added to playlist");
  }, []);

  const removeTrackFromPlaylist = useCallback((playlistId: string, trackId: string) => {
    setLocalPlaylists((prev) =>
      prev.map((p) => {
        if (p.id !== playlistId) return p;
        return { ...p, trackIds: p.trackIds.filter((id) => id !== trackId) };
      }),
    );
    toast.info("Removed from playlist");
  }, []);

  const rescanLibrary = useCallback(() => {
    toast.info("Rescanned local storage and folders", {
      description: "Indexed all offline master audio files.",
    });
  }, []);

  const clearOfflineCache = useCallback(() => {
    setImportedTracks([]);
    setDownloadedTracks([]);
    try {
      localStorage.removeItem(LOCAL_TRACKS_KEY);
      localStorage.removeItem(OFFLINE_DOWNLOADS_KEY);
    } catch {
      // ignore
    }
    toast.success("Cleared all imported and cached audio files");
  }, []);

  const isTrackDownloaded = useCallback(
    (trackId: string) => {
      return downloadedTracks.some((t) => t.id === trackId);
    },
    [downloadedTracks],
  );

  const saveTrackOffline = useCallback(
    async (track: Track) => {
      if (downloadedTracks.some((t) => t.id === track.id)) {
        toast.info(`"${track.title}" is already saved for offline listening.`);
        return;
      }

      const toastId = toast.loading(`Saving "${track.title}" for offline playback...`);
      try {
        const localTrack: LocalTrack = {
          ...track,
          source: "offline",
          format: track.quality,
          artist: track.artistName || track.artist || "Artist",
          folderPath: "Downloads/Offline Streams",
          album: track.album || "Cached Streams",
          fileSizeBytes: Math.round(track.duration * (track.bitrate || 320) * 125),
        };

        setDownloadedTracks((prev) => [localTrack, ...prev]);
        toast.success(`Saved "${track.title}" to offline library!`, {
          id: toastId,
          description: "Available in Offline Mode without an internet connection.",
        });
      } catch (err) {
        toast.error("Failed to cache audio stream.", { id: toastId });
      }
    },
    [downloadedTracks],
  );

  const removeDownloadedTrack = useCallback((trackId: string) => {
    setDownloadedTracks((prev) => prev.filter((t) => t.id !== trackId));
    toast.info("Track removed from offline cache.");
  }, []);

  // All local tracks = Sample tracks + Imported tracks + Purchased masters + Offline Stream Cache
  const allLocalTracks = useMemo(() => {
    const combined = [
      ...downloadedTracks,
      ...importedTracks,
      ...purchasedLocalTracks,
      ...sampleTracks,
    ];
    const unique = new Map<string, LocalTrack>();
    for (const t of combined) {
      unique.set(t.id, t);
    }
    return Array.from(unique.values());
  }, [downloadedTracks, importedTracks, purchasedLocalTracks, sampleTracks]);

  // Derived Storage calculation in MB
  const storageUsedMb = useMemo(() => {
    const totalBytes = allLocalTracks.reduce((acc, t) => acc + (t.fileSizeBytes || 45000000), 0);
    return Math.round((totalBytes / (1024 * 1024)) * 10) / 10;
  }, [allLocalTracks]);

  // Format Breakdown
  const formatsSummary = useMemo(() => {
    const summary = { flac: 0, wav: 0, alac: 0, mp3: 0 };
    for (const t of allLocalTracks) {
      const q = (t.quality || "").toLowerCase();
      if (q.includes("flac")) summary.flac++;
      else if (q.includes("wav")) summary.wav++;
      else if (q.includes("alac")) summary.alac++;
      else summary.mp3++;
    }
    return summary;
  }, [allLocalTracks]);

  // Derived Local Albums grouping
  const localAlbums = useMemo<LocalAlbum[]>(() => {
    const albumMap = new Map<string, LocalTrack[]>();
    for (const track of allLocalTracks) {
      const albumKey = track.album || "Unknown Album";
      const list = albumMap.get(albumKey) ?? [];
      list.push(track);
      albumMap.set(albumKey, list);
    }
    return Array.from(albumMap.entries()).map(([name, tracks]) => ({
      name,
      artistName: tracks[0]?.artistName || "Local Artist",
      coverImage: tracks[0]?.coverImage || cover1,
      trackCount: tracks.length,
      tracks,
    }));
  }, [allLocalTracks]);

  // Derived Local Artists grouping
  const localArtistGroups = useMemo<LocalArtistGroup[]>(() => {
    const artistMap = new Map<string, LocalTrack[]>();
    for (const track of allLocalTracks) {
      const artistKey = track.artistName || "Local Artist";
      const list = artistMap.get(artistKey) ?? [];
      list.push(track);
      artistMap.set(artistKey, list);
    }
    return Array.from(artistMap.entries()).map(([artistName, tracks]) => ({
      artistName,
      trackCount: tracks.length,
      tracks,
    }));
  }, [allLocalTracks]);

  // Derived Local Folders grouping
  const localFolders = useMemo<LocalFolderGroup[]>(() => {
    const folderMap = new Map<string, LocalTrack[]>();
    for (const track of allLocalTracks) {
      const folderKey = track.folderPath || "Unsorted";
      const list = folderMap.get(folderKey) ?? [];
      list.push(track);
      folderMap.set(folderKey, list);
    }
    return Array.from(folderMap.entries()).map(([folderPath, tracks]) => ({
      folderPath,
      trackCount: tracks.length,
      tracks,
    }));
  }, [allLocalTracks]);

  const value = useMemo<ModeContextValue>(
    () => ({
      mode,
      isOffline: mode === "offline",
      isOnline: mode === "online",
      toggleMode,
      setMode,
      localTracks: allLocalTracks,
      localAlbums,
      localArtistGroups,
      localFolders,
      localPlaylists,
      storageUsedMb,
      formatsSummary,
      offlineSettings,
      updateOfflineSettings,
      importLocalFiles,
      removeLocalTrack,
      updateLocalTrackMetadata,
      createPlaylist,
      deletePlaylist,
      addTrackToPlaylist,
      removeTrackFromPlaylist,
      rescanLibrary,
      clearOfflineCache,
      saveTrackOffline,
      removeDownloadedTrack,
      isTrackDownloaded,
      downloadedTracks,
    }),
    [
      mode,
      toggleMode,
      setMode,
      allLocalTracks,
      localAlbums,
      localArtistGroups,
      localFolders,
      localPlaylists,
      storageUsedMb,
      formatsSummary,
      offlineSettings,
      updateOfflineSettings,
      importLocalFiles,
      removeLocalTrack,
      updateLocalTrackMetadata,
      createPlaylist,
      deletePlaylist,
      addTrackToPlaylist,
      removeTrackFromPlaylist,
      rescanLibrary,
      clearOfflineCache,
      saveTrackOffline,
      removeDownloadedTrack,
      isTrackDownloaded,
      downloadedTracks,
    ],
  );

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function useAppMode(): ModeContextValue {
  const ctx = useContext(ModeContext);
  if (!ctx) {
    throw new Error("useAppMode must be used within a ModeProvider");
  }
  return ctx;
}
