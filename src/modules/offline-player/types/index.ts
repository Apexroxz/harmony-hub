/**
 * Layam Offline Player v1 — Pure Domain & Module Types
 *
 * 100% Client-side. Zero network, Supabase, Auth, Web3, or Admin dependencies.
 */

export type OfflineAudioFormat = "FLAC" | "WAV" | "ALAC" | "MP3" | "AAC" | "OPUS" | "DSD" | "AIFF";

export interface OfflineTrack {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  artist: string;
  coverImage: string;
  audioUrl?: string; // Optional runtime blob URL, always rehydrated dynamically
  duration: number; // in seconds
  genre: string;
  quality: OfflineAudioFormat | string;
  format: OfflineAudioFormat | string;
  source: "offline";
  bitrate: number; // in kbps
  sampleRate: number; // in Hz (e.g., 44100, 96000, 192000)
  bitDepth?: number | null; // (e.g., 16, 24, 32)
  playCount: number;
  likes: number;
  comments: number;
  createdAt: string;
  uploaderId?: string | null;
  folderPath?: string;
  album?: string;
  year?: string;
  trackNumber?: string;
  fileSizeBytes?: number;
  waveform?: number[];
}

export interface OfflineAlbum {
  name: string;
  artistName: string;
  coverImage: string;
  tracks: OfflineTrack[];
  trackCount: number;
  year?: string;
}

export interface OfflineArtistGroup {
  artistName: string;
  tracks: OfflineTrack[];
  trackCount: number;
}

export interface OfflineFolderGroup {
  folderPath: string;
  tracks: OfflineTrack[];
  trackCount: number;
}

export interface OfflinePlaylist {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: string;
  updatedAt: string;
  description?: string;
}

export interface OfflineSettings {
  preferredQuality: "lossless" | "high" | "standard";
  autoScanOnMount: boolean;
  normalizeVolume: boolean;
  dither24Bit: boolean;
  stereoWidthPercent: number;
  activeEqPresetId: string;
}

export type OfflinePlayerStatus = "idle" | "loading" | "playing" | "paused" | "error";

export type OfflineSpatialRoomPreset = "off" | "studio" | "hall" | "acoustic" | "vinyl";
export type OfflineSoundProfile = "flat" | "warm" | "tube" | "tape" | "crisp";

export interface OfflineEqPreset {
  id: string;
  name: string;
  gains: number[];
  preamp?: number;
}

export interface OfflineStorageStats {
  totalTracks: number;
  totalBytes: number;
  totalMb: number;
  formatDistribution: Record<string, number>;
}
