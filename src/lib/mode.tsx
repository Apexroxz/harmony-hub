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
import cover1 from "@/assets/covers/cover-1.jpg";
import cover3 from "@/assets/covers/cover-3.jpg";
import cover5 from "@/assets/covers/cover-5.jpg";

export type AppMode = "online" | "offline";

export interface LocalTrack extends Track {
  folderPath?: string;
  album?: string;
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
    playCount: 4200,
    likes: 310,
    comments: 42,
    createdAt: "2026-08-01",
    uploaderId: "local-device",
    folderPath: "Music/Synthwave",
    album: "Midnight Sessions",
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
    playCount: 8900,
    likes: 620,
    comments: 88,
    createdAt: "2026-08-05",
    uploaderId: "local-device",
    folderPath: "Music/Electropop",
    album: "Waves Vol 1",
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
    playCount: 1500,
    likes: 120,
    comments: 14,
    createdAt: "2026-08-08",
    uploaderId: "local-device",
    folderPath: "Downloads/Bass",
    album: "Grid Beats",
  },
];

interface ModeContextValue {
  mode: AppMode;
  isOffline: boolean;
  isOnline: boolean;
  toggleMode: () => void;
  setMode: (mode: AppMode) => void;
  localTracks: LocalTrack[];
  importLocalFiles: (files: FileList | File[]) => Promise<void>;
  removeLocalTrack: (id: string) => void;
  updateLocalTrackMetadata: (id: string, updates: Partial<LocalTrack>) => void;
}

const ModeContext = createContext<ModeContextValue | null>(null);

const STORAGE_KEY = "layam_app_mode";
const LOCAL_TRACKS_KEY = "layam_imported_tracks";

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
        // ignore parse error
      }
    }
    return [];
  });

  const [sampleTracks, setSampleTracks] = useState<LocalTrack[]>(LOCAL_SAMPLE_TRACKS);

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

  const setMode = useCallback((newMode: AppMode) => {
    setModeState(newMode);
    toast.info(`Switched to ${newMode === "offline" ? "Offline Mode" : "Online Mode"}`, {
      description:
        newMode === "offline"
          ? "Playing local & cached music. Online features paused."
          : "Streaming & Web3 features re-enabled.",
    });
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev) => (prev === "online" ? "offline" : "online"));
  }, []);

  const importLocalFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const newTracks: LocalTrack[] = [];

    for (const file of fileArray) {
      const ext = file.name.split(".").pop()?.toUpperCase() ?? "MP3";
      const objectUrl = URL.createObjectURL(file);

      // Extract embedded ID3 tags (Title, Artist, Album, Cover Artwork, Folder Path)
      const metadata = await extractAudioMetadata(file);

      const track: LocalTrack = {
        id: `local-custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: metadata.title || file.name.replace(/\.[^/.]+$/, ""),
        artistId: "local-artist",
        artistName: metadata.artist || "Local Device",
        coverImage: metadata.coverImage || cover1,
        audioUrl: objectUrl,
        duration: metadata.duration || 180,
        genre: "Local File",
        quality: (ext === "FLAC" || ext === "WAV" || ext === "ALAC" ? ext : "MP3") as AudioFormat,
        bitrate: 1411,
        sampleRate: 44100,
        bitDepth: 16,
        playCount: 1,
        likes: 0,
        comments: 0,
        createdAt: new Date().toISOString().slice(0, 10),
        uploaderId: "local-user",
        folderPath: metadata.folderPath || "Local Tracks",
        album: metadata.album || "Local Library",
      };

      newTracks.push(track);
    }

    setImportedTracks((prev) => [...newTracks, ...prev]);
    toast.success(`Imported ${newTracks.length} local track(s)`, {
      description: "Extracted ID3 metadata & added to Offline Library",
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
    toast.success("Updated local track tags & artwork");
  }, []);

  const allLocalTracks = useMemo(() => {
    return [...importedTracks, ...sampleTracks];
  }, [importedTracks, sampleTracks]);

  const value = useMemo<ModeContextValue>(
    () => ({
      mode,
      isOffline: mode === "offline",
      isOnline: mode === "online",
      toggleMode,
      setMode,
      localTracks: allLocalTracks,
      importLocalFiles,
      removeLocalTrack,
      updateLocalTrackMetadata,
    }),
    [mode, toggleMode, setMode, allLocalTracks, importLocalFiles, removeLocalTrack, updateLocalTrackMetadata]
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
