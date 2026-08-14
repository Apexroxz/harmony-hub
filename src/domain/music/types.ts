/**
 * Music domain — pure listening-experience model.
 * Nothing in this module knows about wallets, tokens or storage networks.
 */

export type AudioFormat = "FLAC" | "WAV" | "ALAC" | "MP3" | "AAC" | "OPUS";

/** Formats that carry a bit-perfect master. */
export const LOSSLESS_FORMATS: AudioFormat[] = ["FLAC", "WAV", "ALAC"];

export interface Artist {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  bio: string;
  followers: number;
  verified: boolean;
}

export interface Track {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  coverImage: string;
  audioUrl: string;
  /** Length in seconds. */
  duration: number;
  genre: string;
  /** Delivery format of the stream, e.g. "FLAC". */
  quality: AudioFormat;
  /** Average bitrate in kbps. */
  bitrate: number;
  /** Sample rate in Hz, e.g. 44100 or 96000. */
  sampleRate: number;
  /** Bit depth for lossless masters. */
  bitDepth?: number;
  playCount: number;
  likes: number;
  comments: number;
  /** ISO date the track was published. */
  createdAt: string;
  /** Normalised 0-1 peaks generated from the master at upload time. */
  waveform?: number[];
  /** Account that published the track, when it came through the upload flow. */
  uploaderId?: string | null;
  /** USD price. 0 or undefined = free. */
  price?: number;
  /** true = download gated behind purchase. */
  monetized?: boolean;
  /** User IDs who bought this track. */
  purchasedBy?: string[];
}

/** The audio-spec slice of a track, for components that only render specs. */
export type AudioSpec = Pick<Track, "quality" | "bitrate" | "sampleRate" | "bitDepth">;

export function isLossless(spec: AudioSpec): boolean {
  return LOSSLESS_FORMATS.includes(spec.quality);
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

/** Short badge label, e.g. "FLAC 24/96" or "MP3 320". */
export function qualityLabel(spec: AudioSpec): string {
  if (isLossless(spec)) {
    const khz = (spec.sampleRate / 1000).toFixed(spec.sampleRate % 1000 === 0 ? 0 : 1);
    return spec.bitDepth ? `${spec.quality} ${spec.bitDepth}/${khz}` : `${spec.quality} ${khz}kHz`;
  }
  return `${spec.quality} ${spec.bitrate}`;
}

/** Longer, human description used on detail pages. */
export function qualityDescription(spec: AudioSpec): string {
  const khz = (spec.sampleRate / 1000).toFixed(spec.sampleRate % 1000 === 0 ? 0 : 1);
  const depth = spec.bitDepth ? `${spec.bitDepth}-bit / ` : "";
  const tier = isLossless(spec) ? "Lossless" : "Lossy";
  return `${tier} ${spec.quality} — ${depth}${khz} kHz, ${spec.bitrate} kbps`;
}

export function estimatedSizeMb(spec: AudioSpec, durationSeconds: number): number {
  return (spec.bitrate * durationSeconds) / 8 / 1024;
}
