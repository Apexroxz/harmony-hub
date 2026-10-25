import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  OfflineService,
  type LocalTrack,
  type LocalAlbum,
  type LocalArtistGroup,
  type LocalFolderGroup,
  type LocalPlaylist,
} from "@layam/storage-core";
import { analytics } from "../services/analytics/analytics.service";

interface LocalVaultContextValue {
  // Local Library State
  localTracks: LocalTrack[];
  localAlbums: LocalAlbum[];
  localArtistGroups: LocalArtistGroup[];
  localFolders: LocalFolderGroup[];
  localPlaylists: LocalPlaylist[];
  importLocalFiles: (
    files: FileList | File[],
    onProgress?: (progress: { current: number; total: number; filename: string; stage: string }) => void
  ) => Promise<LocalTrack[]>;
  removeLocalTrack: (trackId: string) => Promise<void>;
  createPlaylist: (name: string) => LocalPlaylist;
  deletePlaylist: (playlistId: string) => void;
  addTrackToPlaylist: (playlistId: string, trackId: string) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  updateTrackTags: (trackId: string, updates: Partial<LocalTrack>) => void;
  refreshLibrary: () => void;
  // About modal visibility
  isAboutOpen: boolean;
  setIsAboutOpen: (open: boolean) => void;
}

const LocalVaultContext = createContext<LocalVaultContextValue | null>(null);

export function LocalVaultProvider({ children }: { children: ReactNode }) {
  const [localTracks, setLocalTracks] = useState<LocalTrack[]>(() => OfflineService.getTracks());
  const [localPlaylists, setLocalPlaylists] = useState<LocalPlaylist[]>(() => OfflineService.getPlaylists());
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  // Track initial app open
  useEffect(() => {
    void analytics.track("APP_OPENED");
  }, []);

  // Subscribe to Offline Storage events
  const refreshLibrary = useCallback(() => {
    const tracks = OfflineService.getTracks();
    console.log("[LocalVaultProvider] refreshLibrary called, tracks count:", tracks.length);
    setLocalTracks(tracks);
    setLocalPlaylists(OfflineService.getPlaylists());
  }, []);

  useEffect(() => {
    const unsub = OfflineService.subscribe(refreshLibrary);
    window.addEventListener("layam:offline-updated", refreshLibrary);
    window.addEventListener("storage", refreshLibrary);
    return () => {
      unsub();
      window.removeEventListener("layam:offline-updated", refreshLibrary);
      window.removeEventListener("storage", refreshLibrary);
    };
  }, [refreshLibrary]);

  const importLocalFiles = useCallback(
    async (
      files: FileList | File[],
      onProgress?: (progress: { current: number; total: number; filename: string; stage: string }) => void
    ) => {
      const imported = await OfflineService.importFiles(files, onProgress);
      refreshLibrary();
      void analytics.track("IMPORT_COMPLETED", { count: imported.length });
      return imported;
    },
    [refreshLibrary],
  );

  const removeLocalTrack = useCallback(
    async (trackId: string) => {
      await OfflineService.removeDownloadedTrack(trackId);
      refreshLibrary();
    },
    [refreshLibrary],
  );

  const createPlaylist = useCallback(
    (name: string) => {
      const pl = OfflineService.createPlaylist(name);
      refreshLibrary();
      void analytics.track("PLAYLIST_CREATED");
      return pl;
    },
    [refreshLibrary],
  );

  const deletePlaylist = useCallback(
    (playlistId: string) => {
      OfflineService.deletePlaylist(playlistId);
      refreshLibrary();
    },
    [refreshLibrary],
  );

  const addTrackToPlaylist = useCallback(
    (playlistId: string, trackId: string) => {
      OfflineService.addTrackToPlaylist(playlistId, trackId);
      refreshLibrary();
    },
    [refreshLibrary],
  );

  const removeTrackFromPlaylist = useCallback(
    (playlistId: string, trackId: string) => {
      OfflineService.removeTrackFromPlaylist(playlistId, trackId);
      refreshLibrary();
    },
    [refreshLibrary],
  );

  const updateTrackTags = useCallback(
    (trackId: string, updates: Partial<LocalTrack>) => {
      OfflineService.updateTrackMetadata(trackId, updates);
      refreshLibrary();
    },
    [refreshLibrary],
  );

  const localAlbums = OfflineService.groupAlbums(localTracks);
  const localArtistGroups = OfflineService.groupArtists(localTracks);
  const localFolders = OfflineService.groupFolders(localTracks);

  const value: LocalVaultContextValue = {
    localTracks,
    localAlbums,
    localArtistGroups,
    localFolders,
    localPlaylists,
    importLocalFiles,
    removeLocalTrack,
    createPlaylist,
    deletePlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    updateTrackTags,
    refreshLibrary,
    isAboutOpen,
    setIsAboutOpen,
  };

  return (
    <LocalVaultContext.Provider value={value}>
      {children}
    </LocalVaultContext.Provider>
  );
}

export function useLocalVault() {
  const context = useContext(LocalVaultContext);
  if (!context) {
    throw new Error("useLocalVault must be used within a LocalVaultProvider");
  }
  return context;
}

// Backward compatibility alias
export const useOfflinePlayer = useLocalVault;
