/**
 * Layam Offline Player v1 — State & Context Module Boundaries
 *
 * Defines the state contracts for offline playback, queue management, and local library.
 */

import type {
  OfflineTrack,
  OfflineAlbum,
  OfflineArtistGroup,
  OfflineFolderGroup,
  OfflinePlaylist,
  OfflinePlayerStatus,
  OfflineEqPreset,
  OfflineSpatialRoomPreset,
  OfflineSoundProfile,
} from "../types";
import { usePlayer as useBasePlayer } from "@/lib/player";
import { useAppMode as useBaseAppMode } from "@/lib/mode";

export interface OfflinePlayerState {
  currentTrack: OfflineTrack | null;
  status: OfflinePlayerStatus;
  isPlaying: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  queue: OfflineTrack[];
  queueIndex: number;
  eqEnabled: boolean;
  activePresetId: string;
  soundProfile: OfflineSoundProfile;
  spatialRoom: OfflineSpatialRoomPreset;
  stereoWidth: number;
  isShuffle: boolean;
  isRepeat: boolean;
  errorMessage: string | null;
}

export interface OfflineLibraryState {
  tracks: OfflineTrack[];
  albums: OfflineAlbum[];
  artists: OfflineArtistGroup[];
  folders: OfflineFolderGroup[];
  playlists: OfflinePlaylist[];
  importFiles: (files: FileList | File[]) => Promise<OfflineTrack[]>;
  removeTrack: (trackId: string) => void;
  updateTrackMetadata: (trackId: string, updates: Partial<OfflineTrack>) => void;
  createPlaylist: (name: string) => void;
  deletePlaylist: (playlistId: string) => void;
  addTrackToPlaylist: (playlistId: string, trackId: string) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
}

/**
 * Migration Bridge: Re-exports base state hooks typed to offline module specifications.
 */
export function useOfflinePlayer() {
  const base = useBasePlayer();
  return {
    ...base,
    currentTrack: base.currentTrack as unknown as OfflineTrack | null,
    queue: base.queue as unknown as OfflineTrack[],
    playOfflineTrack: (track: OfflineTrack, queue?: OfflineTrack[]) =>
      base.playTrack(track as any, queue as any),
  };
}

export function useOfflineLibrary() {
  const base = useBaseAppMode();
  return {
    tracks: base.localTracks as unknown as OfflineTrack[],
    albums: base.localAlbums as unknown as OfflineAlbum[],
    artists: base.localArtistGroups as unknown as OfflineArtistGroup[],
    folders: base.localFolders as unknown as OfflineFolderGroup[],
    playlists: base.localPlaylists as unknown as OfflinePlaylist[],
    importFiles: base.importLocalFiles as unknown as (files: FileList | File[]) => Promise<OfflineTrack[]>,
    removeTrack: base.removeLocalTrack,
    updateTrackMetadata: base.updateLocalTrackMetadata as unknown as (trackId: string, updates: Partial<OfflineTrack>) => void,
    createPlaylist: base.createPlaylist,
    deletePlaylist: base.deletePlaylist,
    addTrackToPlaylist: base.addTrackToPlaylist,
    removeTrackFromPlaylist: base.removeTrackFromPlaylist,
  };
}
