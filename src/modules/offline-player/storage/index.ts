/**
 * Layam Offline Player v1 — Local Storage & Persistence Boundaries
 *
 * Encapsulates IndexedDB binary storage, metadata extraction, deduplication, and playlist persistence.
 */

import type {
  OfflineTrack,
  OfflineAlbum,
  OfflineArtistGroup,
  OfflineFolderGroup,
  OfflinePlaylist,
  OfflineSettings,
  OfflineStorageStats,
} from "../types";
import {
  OfflineService,
  storeAudioBlob,
  getAudioBlob,
  getAudioBlobUrl,
  deleteAudioBlob,
  clearAllAudioBlobs,
  extractAudioMetadata,
  type LocalTrack,
  type LocalPlaylist,
  type ExtractedMetadata,
  LOCAL_SAMPLE_TRACKS,
  DEFAULT_OFFLINE_SETTINGS,
} from "@layam/storage-core";

export interface IOfflineStorageService {
  getTracks(): OfflineTrack[];
  saveTracks(tracks: OfflineTrack[]): void;
  getPlaylists(): OfflinePlaylist[];
  savePlaylists(playlists: OfflinePlaylist[]): void;
  getSettings(): OfflineSettings;
  saveSettings(settings: OfflineSettings): void;
  importFiles(files: FileList | File[]): Promise<OfflineTrack[]>;
  getAlbums(): OfflineAlbum[];
  getArtistGroups(): OfflineArtistGroup[];
  getFolderGroups(): OfflineFolderGroup[];
  getStorageStats(): OfflineStorageStats;
}

export interface IOfflineIndexedDbService {
  storeBlob(id: string, fileOrBlob: File | Blob, name?: string): Promise<string | void>;
  getBlob(id: string): Promise<Blob | null>;
  getBlobUrl(id: string): Promise<string | null>;
  deleteBlob(id: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Migration Bridge: Re-exports existing storage functions typed under the offline module.
 */
export const offlineStorage = {
  getTracks: () => OfflineService.getTracks() as unknown as OfflineTrack[],
  saveTracks: (tracks: OfflineTrack[]) => OfflineService.saveTracks(tracks as unknown as LocalTrack[]),
  getPlaylists: () => OfflineService.getPlaylists() as unknown as OfflinePlaylist[],
  savePlaylists: (playlists: OfflinePlaylist[]) =>
    OfflineService.savePlaylists(playlists as unknown as LocalPlaylist[]),
  getSettings: () => OfflineService.getSettings() as unknown as OfflineSettings,
  saveSettings: (settings: OfflineSettings) => OfflineService.saveSettings(settings as any),
  importFiles: (files: FileList | File[]) =>
    OfflineService.importFiles(files) as unknown as Promise<OfflineTrack[]>,
  getAlbums: () => OfflineService.getAlbums() as unknown as OfflineAlbum[],
  getArtistGroups: () => OfflineService.getArtistGroups() as unknown as OfflineArtistGroup[],
  getFolderGroups: () => OfflineService.getFolderGroups() as unknown as OfflineFolderGroup[],
  LOCAL_SAMPLE_TRACKS: LOCAL_SAMPLE_TRACKS as unknown as OfflineTrack[],
  DEFAULT_OFFLINE_SETTINGS,
};

export const offlineIndexedDb: IOfflineIndexedDbService = {
  storeBlob: storeAudioBlob,
  getBlob: getAudioBlob,
  getBlobUrl: getAudioBlobUrl,
  deleteBlob: deleteAudioBlob,
  clear: clearAllAudioBlobs,
};

export { extractAudioMetadata, type ExtractedMetadata };
