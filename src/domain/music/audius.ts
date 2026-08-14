import type { AudioFormat, Track, Artist } from "./types";

interface AudiusUser {
  id: string;
  name: string;
  handle: string;
  bio?: string;
  profile_picture?: {
    "150x150"?: string;
    "480x480"?: string;
  };
}

interface AudiusTrackItem {
  id: string;
  title: string;
  user: AudiusUser;
  artwork?: {
    "150x150"?: string;
    "480x480"?: string;
    "1000x1000"?: string;
  };
  duration: number;
  genre?: string;
  play_count?: number;
  favorite_count?: number;
  repost_count?: number;
  mood?: string;
  release_date?: string;
}

const AUDIUS_APP_NAME = "LAYAM_MUSIC_PLAYER";
const AUDIUS_HOST = "https://api.audius.co";

// Genre map — Audius uses these exact strings in the genre field
export const AUDIUS_GENRE_MAP: Record<string, string> = {
  Electronic: "Electronic",
  Ambient: "Electronic",
  "Hip-Hop": "Hip-Hop/Rap",
  Rock: "Rock",
  Pop: "Pop",
  Jazz: "Jazz",
  Classical: "Classical",
  Indie: "Alternative",
  Folk: "Folk",
  Acoustic: "Acoustic",
};

function itemToTrack(item: AudiusTrackItem): { track: Track; artist: Artist } {
  const artistId = item.user?.id ? `audius-artist-${item.user.id}` : "audius-artist-unknown";
  const artistName = item.user?.name || "Audius Artist";
  const handle = item.user?.handle ? `@${item.user.handle}` : "@audius";
  const avatarUrl =
    item.user?.profile_picture?.["480x480"] ||
    item.user?.profile_picture?.["150x150"] ||
    item.artwork?.["480x480"] ||
    item.artwork?.["150x150"] ||
    "";

  const coverUrl =
    item.artwork?.["480x480"] ||
    item.artwork?.["1000x1000"] ||
    item.artwork?.["150x150"] ||
    avatarUrl ||
    "";

  const streamUrl = `${AUDIUS_HOST}/v1/tracks/${item.id}/stream?app_name=${AUDIUS_APP_NAME}`;

  const track: Track = {
    id: `audius-${item.id}`,
    title: item.title,
    artistId,
    artistName,
    coverImage: coverUrl,
    audioUrl: streamUrl,
    duration: item.duration || 180,
    genre: item.genre || "Electronic",
    quality: "FLAC" as AudioFormat,
    bitrate: 1411,
    sampleRate: 44100,
    bitDepth: 16,
    playCount: item.play_count || 1000,
    likes: item.favorite_count || 100,
    comments: item.repost_count || 20,
    createdAt:
      item.release_date?.split("T")[0] ?? new Date().toISOString().split("T")[0] ?? "2026-01-01",
  };

  const artist: Artist = {
    id: artistId,
    name: artistName,
    handle,
    avatar: avatarUrl,
    bio: item.user?.bio || "Web3 Artist on Audius",
    followers: 1200,
    verified: true,
  };

  return { track, artist };
}

async function fetchAudiusRaw(params: {
  genre?: string;
  query?: string;
  limit?: number;
  offset?: number;
}): Promise<{ tracks: Track[]; artists: Artist[] }> {
  try {
    const limit = params.limit ?? 12;

    let url: string;
    if (params.query) {
      // Full-text search
      const q = encodeURIComponent(params.query);
      url = `${AUDIUS_HOST}/v1/tracks/search?query=${q}&app_name=${AUDIUS_APP_NAME}&limit=${limit}`;
    } else if (params.genre) {
      // Genre trending
      const g = encodeURIComponent(params.genre);
      url = `${AUDIUS_HOST}/v1/tracks/trending?app_name=${AUDIUS_APP_NAME}&limit=${limit}&genre=${g}`;
    } else {
      // Overall trending
      url = `${AUDIUS_HOST}/v1/tracks/trending?app_name=${AUDIUS_APP_NAME}&limit=${limit}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!res.ok) {
      console.warn("[Audius] HTTP error:", res.status);
      return { tracks: [], artists: [] };
    }

    const json = (await res.json()) as { data?: AudiusTrackItem[] };
    const items = json.data ?? [];

    const tracks: Track[] = [];
    const artistsMap = new Map<string, Artist>();

    for (const item of items) {
      if (!item.id || !item.title) continue;
      const { track, artist } = itemToTrack(item);
      tracks.push(track);
      if (!artistsMap.has(artist.id)) artistsMap.set(artist.id, artist);
    }

    console.log(`[Audius] ✓ ${tracks.length} tracks`);
    return { tracks, artists: Array.from(artistsMap.values()) };
  } catch (error) {
    console.warn("[Audius] Fetch error:", error);
    return { tracks: [], artists: [] };
  }
}

/** Fetch trending tracks (home/catalog view). */
export function fetchAudiusTrendingTracks(): Promise<{ tracks: Track[]; artists: Artist[] }> {
  return fetchAudiusRaw({ limit: 12 });
}

/** Fetch trending tracks for a specific genre. */
export function fetchAudiusByGenre(
  genre: string,
  limit = 12,
): Promise<{ tracks: Track[]; artists: Artist[] }> {
  const audiusGenre = AUDIUS_GENRE_MAP[genre];
  if (!audiusGenre) return fetchAudiusRaw({ limit });
  return fetchAudiusRaw({ genre: audiusGenre, limit });
}

/** Full-text search across Audius tracks. */
export function searchAudiusTracks(
  query: string,
  limit = 10,
): Promise<{ tracks: Track[]; artists: Artist[] }> {
  if (!query.trim()) return Promise.resolve({ tracks: [], artists: [] });
  return fetchAudiusRaw({ query: query.trim(), limit });
}
