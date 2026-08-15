/**
 * Layam Offline Player — Local Lyrics Data Architecture
 */

export interface LyricTimestampLine {
  time: number; // in seconds
  text: string;
}

export type LyricFormat = "synced_lrc" | "plain_text" | "srt" | "embedded";

export interface StoredTrackLyrics {
  trackId: string;
  title: string;
  artist?: string;
  format: LyricFormat;
  rawText: string;
  lines: LyricTimestampLine[];
  isSynced: boolean;
  source: "embedded" | "sidecar" | "manual_import" | "catalog";
  importedAt: string;
}
