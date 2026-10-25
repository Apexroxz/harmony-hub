import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { signedUrls } from "@/lib/media";
import { searchAudiusTracks } from "./audius";
import { searchJamendoTracks } from "./jamendo";
import { FALLBACK_TRACKS } from "./fallback";
import type { Artist, AudioFormat, Track } from "./types";

/** Keeps supabase-js from type-parsing the select string (huge tsc win). */
const sel = (s: string): string => s;

interface ArtistRow {
  id: string;
  name: string;
  handle: string;
  bio: string;
  avatar_path: string | null;
  avatar_url: string | null;
  followers: number;
  verified: boolean;
}

interface TrackRow {
  id: string;
  title: string;
  artist_id: string;
  uploader_id: string | null;
  cover_path: string | null;
  cover_url: string | null;
  audio_path: string | null;
  audio_url: string | null;
  duration: number;
  genre: string;
  quality: string;
  bitrate: number;
  sample_rate: number;
  bit_depth: number | null;
  waveform: unknown;
  play_count: number;
  like_count: number;
  comment_count: number;
  repost_count: number;
  created_at: string;
}

const ARTIST_COLUMNS = "id,name,handle,bio,avatar_path,avatar_url,followers,verified";
const TRACK_COLUMNS =
  "id,title,artist_id,uploader_id,cover_path,cover_url,audio_path,audio_url,duration,genre,quality,bitrate,sample_rate,bit_depth,waveform,play_count,like_count,comment_count,repost_count,created_at";

function toPeaks(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const peaks = value.filter((n): n is number => typeof n === "number");
  return peaks.length > 0 ? peaks : undefined;
}

import { CatalogService, type CatalogData } from "./catalog.service";

export type Catalog = CatalogData;

async function fetchCatalog(): Promise<Catalog> {
  return CatalogService.getCatalog();
}

export const catalogQueryKey = ["catalog"] as const;

export function catalogQueryOptions() {
  return queryOptions({
    queryKey: catalogQueryKey,
    queryFn: fetchCatalog,
    staleTime: 30_000,
  });
}

import { searchAppleMusicTracks } from "./appleMusic";

/** Live multi-engine search combining Apple Music Master + Audius Web3 + Jamendo CC. */
async function fetchSearch(query: string): Promise<{ tracks: Track[]; artists: Artist[] }> {
  if (!query.trim()) return { tracks: [], artists: [] };
  const [apple, audius, jamendo] = await Promise.all([
    searchAppleMusicTracks(query, 12),
    searchAudiusTracks(query, 8),
    searchJamendoTracks(query, 10),
  ]);
  const seen = new Set<string>();
  const tracks: Track[] = [];
  const artistsMap = new Map<string, Artist>();
  for (const t of [...apple.tracks, ...audius.tracks, ...jamendo.tracks]) {
    if (!seen.has(t.id)) {
      seen.add(t.id);
      tracks.push(t);
    }
  }
  for (const a of [...apple.artists, ...audius.artists, ...jamendo.artists]) {
    if (!artistsMap.has(a.id)) artistsMap.set(a.id, a);
  }
  return { tracks, artists: Array.from(artistsMap.values()) };
}

export function searchQueryOptions(query: string) {
  return queryOptions({
    queryKey: ["search", query] as const,
    queryFn: () => fetchSearch(query),
    enabled: query.trim().length > 0,
    staleTime: 60_000,
  });
}

export function findTrack(catalog: Catalog | undefined, id: string): Track | undefined {
  return catalog?.tracks.find((t) => t.id === id);
}

export function findArtist(catalog: Catalog | undefined, id: string): Artist | undefined {
  return catalog?.artists.find((a) => a.id === id);
}

export function tracksByArtist(catalog: Catalog | undefined, artistId: string): Track[] {
  return catalog?.tracks.filter((t) => t.artistId === artistId) ?? [];
}
