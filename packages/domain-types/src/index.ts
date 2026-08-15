/**
 * @layam/domain-types — Shared Pure Music Domain Types
 *
 * Free of Supabase, Auth, Web3, or Admin dependencies.
 */

export type AudioFormat = "FLAC" | "WAV" | "ALAC" | "MP3" | "AAC" | "OPUS" | "DSD" | "AIFF";

export const LOSSLESS_FORMATS: AudioFormat[] = ["FLAC", "WAV", "ALAC", "DSD", "AIFF"];

export interface Track {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  coverImage: string;
  audioUrl: string;
  duration: number; // in seconds
  genre: string;
  quality: AudioFormat;
  bitrate: number; // in kbps
  sampleRate: number; // in Hz
  bitDepth?: number | null;
  playCount: number;
  likes: number;
  comments: number;
  createdAt: string;
  waveform?: number[];
  uploaderId?: string | null;
  price?: number;
  monetized?: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: string;
  updatedAt: string;
  description?: string;
}

export type PlayerStatus = "idle" | "loading" | "playing" | "paused" | "error";

export type SpatialRoomPreset = "off" | "studio" | "hall" | "acoustic" | "vinyl";
export type SoundProfile = "flat" | "warm" | "tube" | "tape" | "crisp";

export interface EqPreset {
  id: string;
  name: string;
  gains: number[];
  preamp?: number;
}
