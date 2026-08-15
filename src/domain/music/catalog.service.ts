import { supabase } from "@/integrations/supabase/client";
import { signedUrls } from "@/lib/media";
import { FALLBACK_TRACKS } from "./fallback";
import { artists as fallbackArtists, tracks as fallbackTracks } from "./catalog";
import { searchAudiusTracks } from "./audius";
import { searchJamendoTracks } from "./jamendo";
import { searchAppleMusicTracks } from "./appleMusic";
import type { Artist, AudioFormat, Track } from "./types";

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

export interface CatalogData {
  tracks: Track[];
  artists: Artist[];
  repostCounts: Record<string, number>;
}

/**
 * Unified Catalog Service
 * 
 * Provides a single source of truth for resolving tracks, artists, and discographies
 * across Supabase database, external providers (Apple Music, Audius, Jamendo),
 * and zero-network fallback caches.
 */
export class CatalogService {
  private static cache: CatalogData | null = null;
  private static cacheTimestamp = 0;
  private static readonly TTL_MS = 60_000; // 1 minute in-memory cache

  /**
   * Fetches the complete unified catalog (artists + tracks + social counters).
   */
  public static async getCatalog(forceRefresh = false): Promise<CatalogData> {
    const now = Date.now();
    if (!forceRefresh && this.cache && now - this.cacheTimestamp < this.TTL_MS) {
      return this.cache;
    }

    try {
      const [artistsResult, tracksResult] = await Promise.all([
        supabase
          .from("artists")
          .select(ARTIST_COLUMNS)
          .order("followers", { ascending: false })
          .returns<ArtistRow[]>(),
        supabase
          .from("tracks")
          .select(TRACK_COLUMNS)
          .order("created_at", { ascending: false })
          .returns<TrackRow[]>(),
      ]);

      const artistRows = artistsResult.data ?? [];
      const trackRows = tracksResult.data ?? [];

      const [coverLinks, audioLinks] = await Promise.all([
        signedUrls("covers", [
          ...artistRows.flatMap((a) => (a.avatar_path ? [a.avatar_path] : [])),
          ...trackRows.flatMap((t) => (t.cover_path ? [t.cover_path] : [])),
        ]),
        signedUrls(
          "audio",
          trackRows.flatMap((t) => (t.audio_path ? [t.audio_path] : [])),
        ),
      ]);

      const dbArtists: Artist[] = artistRows.map((row) => ({
        id: row.id,
        name: row.name,
        handle: row.handle,
        avatar: (row.avatar_path ? coverLinks.get(row.avatar_path) : null) ?? row.avatar_url ?? "",
        bio: row.bio,
        followers: row.followers,
        verified: row.verified,
      }));

      // Merge fallback artists
      const artistMap = new Map<string, Artist>();
      for (const a of fallbackArtists) artistMap.set(a.id, a);
      for (const a of dbArtists) artistMap.set(a.id, a);
      const artists = Array.from(artistMap.values());

      const namesById = new Map(artists.map((a) => [a.id, a.name]));

      const dbTracks: Track[] = trackRows.map((row) => {
        const peaks = toPeaks(row.waveform);
        return {
          id: row.id,
          title: row.title,
          artistId: row.artist_id,
          artistName: namesById.get(row.artist_id) ?? "Independent Artist",
          coverImage:
            (row.cover_path ? coverLinks.get(row.cover_path) : null) ?? row.cover_url ?? "",
          audioUrl:
            (row.audio_path ? audioLinks.get(row.audio_path) : null) ?? row.audio_url ?? "",
          duration: row.duration,
          genre: row.genre,
          quality: row.quality as AudioFormat,
          bitrate: row.bitrate,
          sampleRate: row.sample_rate,
          ...(row.bit_depth != null ? { bitDepth: row.bit_depth } : {}),
          playCount: row.play_count,
          likes: row.like_count,
          comments: row.comment_count,
          createdAt: row.created_at,
          ...(peaks ? { waveform: peaks } : {}),
          uploaderId: row.uploader_id,
        };
      });

      // Merge fallback tracks
      const trackMap = new Map<string, Track>();
      for (const t of FALLBACK_TRACKS) trackMap.set(t.id, t);
      for (const t of fallbackTracks) trackMap.set(t.id, t);
      for (const t of dbTracks) trackMap.set(t.id, t);
      const tracks = Array.from(trackMap.values());

      const repostCounts: Record<string, number> = {};
      for (const row of trackRows) repostCounts[row.id] = row.repost_count;

      this.cache = { tracks, artists, repostCounts };
      this.cacheTimestamp = now;
      return this.cache;
    } catch (err) {
      console.warn("[CatalogService] Database uncontactable; returning fallback catalog:", err);
      // Construct fallback catalog
      const trackMap = new Map<string, Track>();
      for (const t of FALLBACK_TRACKS) trackMap.set(t.id, t);
      for (const t of fallbackTracks) trackMap.set(t.id, t);

      return {
        tracks: Array.from(trackMap.values()),
        artists: fallbackArtists,
        repostCounts: {},
      };
    }
  }

  /**
   * Resolves a single track by its unique ID across database, external providers, and fallbacks.
   */
  public static async getTrackById(id: string): Promise<Track | undefined> {
    if (!id) return undefined;

    // 1. Check in-memory cache / catalog
    const catalog = await this.getCatalog();
    const found = catalog.tracks.find((t) => t.id === id);
    if (found) return found;

    // 2. Query Supabase directly if missing from cache
    try {
      const { data: row } = await supabase
        .from("tracks")
        .select(TRACK_COLUMNS)
        .eq("id", id)
        .maybeSingle<TrackRow>();

      if (row) {
        const [coverLinks, audioLinks] = await Promise.all([
          row.cover_path ? signedUrls("covers", [row.cover_path]) : Promise.resolve(new Map()),
          row.audio_path ? signedUrls("audio", [row.audio_path]) : Promise.resolve(new Map()),
        ]);

        const artist = await this.getArtistById(row.artist_id);
        const peaks = toPeaks(row.waveform);

        return {
          id: row.id,
          title: row.title,
          artistId: row.artist_id,
          artistName: artist?.name ?? "Independent Artist",
          coverImage:
            (row.cover_path ? coverLinks.get(row.cover_path) : null) ?? row.cover_url ?? "",
          audioUrl:
            (row.audio_path ? audioLinks.get(row.audio_path) : null) ?? row.audio_url ?? "",
          duration: row.duration,
          genre: row.genre,
          quality: row.quality as AudioFormat,
          bitrate: row.bitrate,
          sampleRate: row.sample_rate,
          ...(row.bit_depth != null ? { bitDepth: row.bit_depth } : {}),
          playCount: row.play_count,
          likes: row.like_count,
          comments: row.comment_count,
          createdAt: row.created_at,
          ...(peaks ? { waveform: peaks } : {}),
          uploaderId: row.uploader_id,
        };
      }
    } catch {
      // ignore
    }

    // 3. Check static catalogue
    return fallbackTracks.find((t) => t.id === id) ?? FALLBACK_TRACKS.find((t) => t.id === id);
  }

  /**
   * Resolves an artist profile by ID.
   */
  public static async getArtistById(id: string): Promise<Artist | undefined> {
    if (!id) return undefined;

    const catalog = await this.getCatalog();
    const found = catalog.artists.find((a) => a.id === id);
    if (found) return found;

    try {
      const { data: row } = await supabase
        .from("artists")
        .select(ARTIST_COLUMNS)
        .eq("id", id)
        .maybeSingle<ArtistRow>();

      if (row) {
        const coverLinks = row.avatar_path
          ? await signedUrls("covers", [row.avatar_path])
          : new Map();

        return {
          id: row.id,
          name: row.name,
          handle: row.handle,
          avatar:
            (row.avatar_path ? coverLinks.get(row.avatar_path) : null) ?? row.avatar_url ?? "",
          bio: row.bio,
          followers: row.followers,
          verified: row.verified,
        };
      }
    } catch {
      // ignore
    }

    return fallbackArtists.find((a) => a.id === id);
  }

  /**
   * Returns all tracks created by a specific artist.
   */
  public static async getTracksByArtist(artistId: string): Promise<Track[]> {
    const catalog = await this.getCatalog();
    return catalog.tracks.filter((t) => t.artistId === artistId);
  }

  /**
   * Synchronous track resolver from static dataset for offline instant render.
   */
  public static getStaticTrack(id: string): Track | undefined {
    return fallbackTracks.find((t) => t.id === id) ?? FALLBACK_TRACKS.find((t) => t.id === id);
  }

  /**
   * Synchronous artist resolver from static dataset for offline instant render.
   */
  public static getStaticArtist(id: string): Artist | undefined {
    return fallbackArtists.find((a) => a.id === id);
  }

  /**
   * Multi-provider federated search aggregator across local catalog + external APIs.
   */
  public static async search(query: string): Promise<{ tracks: Track[]; artists: Artist[] }> {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return { tracks: [], artists: [] };

    const catalog = await this.getCatalog();

    const catalogTrackHits = catalog.tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(trimmed) ||
        t.artistName.toLowerCase().includes(trimmed) ||
        t.genre.toLowerCase().includes(trimmed),
    );

    const catalogArtistHits = catalog.artists.filter(
      (a) =>
        a.name.toLowerCase().includes(trimmed) ||
        a.handle.toLowerCase().includes(trimmed) ||
        (a.bio && a.bio.toLowerCase().includes(trimmed)),
    );

    // Parallel external search (Audius + Jamendo + Apple Music)
    const [audiusResult, jamendoResult, appleResult] = await Promise.allSettled([
      searchAudiusTracks(trimmed),
      searchJamendoTracks(trimmed),
      searchAppleMusicTracks(trimmed),
    ]);

    const externalTracks: Track[] = [
      ...(appleResult.status === "fulfilled" ? appleResult.value.tracks : []),
      ...(audiusResult.status === "fulfilled" ? audiusResult.value.tracks : []),
      ...(jamendoResult.status === "fulfilled" ? jamendoResult.value.tracks : []),
    ];

    const externalArtists: Artist[] = [
      ...(audiusResult.status === "fulfilled" ? audiusResult.value.artists : []),
      ...(jamendoResult.status === "fulfilled" ? jamendoResult.value.artists : []),
    ];

    // Deduplicate merged results
    const seenTracks = new Set<string>();
    const mergedTracks: Track[] = [];
    for (const t of [...catalogTrackHits, ...externalTracks]) {
      if (!seenTracks.has(t.id)) {
        seenTracks.add(t.id);
        mergedTracks.push(t);
      }
    }

    const seenArtists = new Set<string>();
    const mergedArtists: Artist[] = [];
    for (const a of [...catalogArtistHits, ...externalArtists]) {
      if (!seenArtists.has(a.id)) {
        seenArtists.add(a.id);
        mergedArtists.push(a);
      }
    }

    return { tracks: mergedTracks, artists: mergedArtists };
  }
}
