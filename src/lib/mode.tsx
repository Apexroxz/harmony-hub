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
import type { Track } from "@/domain/music/types";
import {
  OfflineService,
  type LocalTrack,
  type LocalAlbum,
  type LocalArtistGroup,
  type LocalFolderGroup,
  type LocalPlaylist,
  type OfflineSettings,
  LOCAL_SAMPLE_TRACKS,
  DEFAULT_OFFLINE_SETTINGS,
} from "./offline.service";

export type AppMode = "online" | "offline";

export {
  type LocalTrack,
  type LocalAlbum,
  type LocalArtistGroup,
  type LocalFolderGroup,
  type LocalPlaylist,
  type OfflineSettings,
  LOCAL_SAMPLE_TRACKS,
  DEFAULT_OFFLINE_SETTINGS,
};

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

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "online" || saved === "offline") return saved;
    }
    return "online";
  });

  const [tracks, setTracks] = useState<LocalTrack[]>(() => OfflineService.getTracks());
  const [playlists, setPlaylists] = useState<LocalPlaylist[]>(() => OfflineService.getPlaylists());
  const [settings, setSettings] = useState<OfflineSettings>(() => OfflineService.getSettings());

  // Subscribe to offline storage updates
  useEffect(() => {
    const unsubscribe = OfflineService.subscribe(() => {
      setTracks(OfflineService.getTracks());
      setPlaylists(OfflineService.getPlaylists());
      setSettings(OfflineService.getSettings());
    });
    return unsubscribe;
  }, []);

  const setMode = useCallback((newMode: AppMode) => {
    setModeState(newMode);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, newMode);
    }
    toast.info(newMode === "offline" ? "Switched to Offline Mode" : "Switched to Online Streaming", {
      description:
        newMode === "offline"
          ? "Local audiophile player active. Zero network requests."
          : "Full streaming catalog, store, and community active.",
    });
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === "online" ? "offline" : "online");
  }, [mode, setMode]);

  // Derived library models
  const localAlbums = useMemo(() => OfflineService.groupAlbums(tracks), [tracks]);
  const localArtistGroups = useMemo(() => OfflineService.groupArtists(tracks), [tracks]);
  const localFolders = useMemo(() => OfflineService.groupFolders(tracks), [tracks]);

  const storageUsedMb = useMemo(() => {
    const totalBytes = tracks.reduce((acc, t) => acc + (t.fileSizeBytes || 0), 0);
    return Math.round((totalBytes / (1024 * 1024)) * 10) / 10;
  }, [tracks]);

  const formatsSummary = useMemo(() => {
    const summary = { flac: 0, wav: 0, alac: 0, mp3: 0 };
    tracks.forEach((t) => {
      const fmt = (t.quality || t.format || "").toLowerCase();
      if (fmt.includes("flac")) summary.flac++;
      else if (fmt.includes("wav")) summary.wav++;
      else if (fmt.includes("alac")) summary.alac++;
      else summary.mp3++;
    });
    return summary;
  }, [tracks]);

  const importLocalFiles = useCallback(async (files: FileList | File[]) => {
    const count = Array.from(files).length;
    if (count === 0) return;
    toast.loading(`Importing and analyzing ${count} local audio files...`, { id: "import" });
    try {
      const newTracks = await OfflineService.importFiles(files);
      toast.success(`Successfully imported ${newTracks.length} tracks to Offline Library!`, {
        id: "import",
      });
    } catch (err) {
      toast.error("Failed to import local audio files", { id: "import" });
    }
  }, []);

  const removeLocalTrack = useCallback((id: string) => {
    void OfflineService.removeDownloadedTrack(id);
    toast.success("Track removed from offline library");
  }, []);

  const updateLocalTrackMetadata = useCallback((id: string, updates: Partial<LocalTrack>) => {
    OfflineService.updateMetadata(id, updates);
    toast.success("Track metadata updated");
  }, []);

  const createPlaylist = useCallback((name: string) => {
    OfflineService.createPlaylist(name);
    toast.success(`Playlist "${name}" created`);
  }, []);

  const deletePlaylist = useCallback((id: string) => {
    OfflineService.deletePlaylist(id);
    toast.success("Playlist deleted");
  }, []);

  const addTrackToPlaylist = useCallback((playlistId: string, trackId: string) => {
    OfflineService.addTrackToPlaylist(playlistId, trackId);
    toast.success("Track added to playlist");
  }, []);

  const removeTrackFromPlaylist = useCallback((playlistId: string, trackId: string) => {
    OfflineService.removeTrackFromPlaylist(playlistId, trackId);
    toast.success("Track removed from playlist");
  }, []);

  const updateOfflineSettings = useCallback((updates: Partial<OfflineSettings>) => {
    const updated = { ...settings, ...updates };
    OfflineService.saveSettings(updated);
    toast.success("Offline settings saved");
  }, [settings]);

  const rescanLibrary = useCallback(() => {
    setTracks(OfflineService.getTracks());
    toast.success("Offline library rescanned and refreshed");
  }, []);

  const clearOfflineCache = useCallback(() => {
    OfflineService.saveTracks(LOCAL_SAMPLE_TRACKS);
    toast.success("Offline cache cleared; restored sample library");
  }, []);

  const saveTrackOffline = useCallback(async (track: Track) => {
    await OfflineService.saveTrackOffline(track);
    toast.success(`Saved "${track.title}" to offline vault`);
  }, []);

  const removeDownloadedTrack = useCallback((trackId: string) => {
    void OfflineService.removeDownloadedTrack(trackId);
    toast.success("Removed track from offline downloads");
  }, []);

  const isTrackDownloaded = useCallback((trackId: string) => {
    return OfflineService.isTrackDownloaded(trackId);
  }, []);

  const downloadedTracks = useMemo(
    () => tracks.filter((t) => t.folderPath === "Saved Offline" || t.id.startsWith("local-")),
    [tracks],
  );

  return (
    <ModeContext.Provider
      value={{
        mode,
        isOffline: mode === "offline",
        isOnline: mode === "online",
        toggleMode,
        setMode,
        localTracks: tracks,
        localAlbums,
        localArtistGroups,
        localFolders,
        localPlaylists: playlists,
        storageUsedMb,
        formatsSummary,
        offlineSettings: settings,
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
      }}
    >
      {children}
    </ModeContext.Provider>
  );
}

export function useAppMode(): ModeContextValue {
  const context = useContext(ModeContext);
  if (!context) {
    throw new Error("useAppMode must be used within a ModeProvider");
  }
  return context;
}
