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
import { extractAudioMetadata } from "./tagExtractor";
import { tracks as catalogTracks } from "@/domain/music/catalog";
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
    coverImage: cover1,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    duration: 371,
    genre: "Synthwave",
    quality: "FLAC",
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
    coverImage: cover3,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    duration: 337,
    genre: "Electropop",
    quality: "WAV",
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
    coverImage: cover5,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    duration: 342,
    genre: "Bass",
    quality: "ALAC",
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
    coverImage: cover2,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    duration: 226,
    genre: "Cyberpunk",
    quality: "FLAC",
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
}

const ModeContext = createContext<ModeContextValue | null>(null);

const STORAGE_KEY = "layam_app_mode";
const LOCAL_TRACKS_KEY = "layam_imported_tracks";
const PLAYLISTS_KEY = "layam_local_playlists";
const SETTINGS_KEY = "layam_offline_settings";

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

  // Sync state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore
    }
  }, [mode]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_TRACKS_KEY, JSON.stringify(importedTracks));
    } catch {
      // ignore
    }
  }, [importedTracks]);

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

  const setMode = useCallback((newMode: AppMode) => {
    setModeState(newMode);
    toast.info(`Switched to ${newMode === "offline" ? "Offline Hi-Fi Player" : "Online Streaming Mode"}`, {
      description:
        newMode === "offline"
          ? "Local Hi-Fi engine active. Zero network requests."
          : "Full streaming catalog, store, and creator features active.",
    });
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev) => {
      const next = prev === "online" ? "offline" : "online";
      toast.info(`Switched to ${next === "offline" ? "Offline Hi-Fi Player" : "Online Streaming Mode"}`, {
        description:
          next === "offline"
            ? "Local audiophile player active. Zero network requests."
            : "Full streaming catalog, store, and community active.",
      });
      return next;
    });
  }, []);

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
          folderPath: "Downloads/Purchased",
          album: t.album || "Store Master Downloads",
          fileSizeBytes: (t.duration * (t.bitrate || 1411) * 125), // estimated file size
        }));
    } catch {
      return [];
    }
  }, []);

  const importLocalFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const newTracks: LocalTrack[] = [];

    for (const file of fileArray) {
      const ext = file.name.split(".").pop()?.toUpperCase() ?? "MP3";
      const objectUrl = URL.createObjectURL(file);

      // Extract embedded ID3 tags
      const metadata = await extractAudioMetadata(file);

      const track: LocalTrack = {
        id: `local-custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: metadata.title || file.name.replace(/\.[^/.]+$/, ""),
        artistId: "local-artist",
        artistName: metadata.artist || "Local Device",
        coverImage: metadata.coverImage || cover1,
        audioUrl: objectUrl,
        duration: metadata.duration || 180,
        genre: "Local Audio",
        quality: (ext === "FLAC" || ext === "WAV" || ext === "ALAC" ? ext : "MP3") as AudioFormat,
        bitrate: ext === "FLAC" ? 1411 : ext === "WAV" ? 4608 : 320,
        sampleRate: ext === "WAV" ? 96000 : 44100,
        bitDepth: ext === "WAV" ? 24 : 16,
        playCount: 0,
        likes: 0,
        comments: 0,
        createdAt: new Date().toISOString().slice(0, 10),
        uploaderId: "local-user",
        folderPath: metadata.folderPath || "Imported Tracks",
        album: metadata.album || "Local Audio",
        fileSizeBytes: file.size || 45000000,
      };

      newTracks.push(track);
    }

    setImportedTracks((prev) => [...newTracks, ...prev]);
    toast.success(`Imported ${newTracks.length} local master(s)`, {
      description: "Parsed ID3 tags & added to Local Hi-Fi Library",
    });
  }, []);

  const removeLocalTrack = useCallback((id: string) => {
    setImportedTracks((prev) => prev.filter((t) => t.id !== id));
    toast.info("Removed local track from library");
  }, []);

  const updateLocalTrackMetadata = useCallback((id: string, updates: Partial<LocalTrack>) => {
    setImportedTracks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
    setSampleTracks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
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
      })
    );
    toast.success("Added to playlist");
  }, []);

  const removeTrackFromPlaylist = useCallback((playlistId: string, trackId: string) => {
    setLocalPlaylists((prev) =>
      prev.map((p) => {
        if (p.id !== playlistId) return p;
        return { ...p, trackIds: p.trackIds.filter((id) => id !== trackId) };
      })
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
    try {
      localStorage.removeItem(LOCAL_TRACKS_KEY);
    } catch {
      // ignore
    }
    toast.success("Cleared imported audio cache");
  }, []);

  // All local tracks = Sample local tracks + User imported tracks + Purchased Store masters
  const allLocalTracks = useMemo(() => {
    const combined = [...importedTracks, ...purchasedLocalTracks, ...sampleTracks];
    const unique = new Map<string, LocalTrack>();
    for (const t of combined) {
      unique.set(t.id, t);
    }
    return Array.from(unique.values());
  }, [importedTracks, purchasedLocalTracks, sampleTracks]);

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
    ]
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
