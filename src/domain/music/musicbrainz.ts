/**
 * MusicBrainz + TheAudioDB metadata enrichment service.
 *
 * MusicBrainz: free, no key, rate-limited to 1 req/s. We use it for:
 *   - Recording search (title + artist → duration, release date, MBID)
 *   - Cover Art Archive (release MBID → hi-res JPEG)
 *
 * TheAudioDB: free tier (key=523532). We use it for:
 *   - Artist bio, high-res artist thumbnail, fanart
 */

const MB_HOST   = "https://musicbrainz.org/ws/2";
const CAA_HOST  = "https://coverartarchive.org";
const TADB_HOST = "https://www.theaudiodb.com/api/v1/json/523532";

// User-Agent required by MusicBrainz policy
const MB_UA = "Layam/1.0 (https://layam.app)";

// ── Types ──────────────────────────────────────────────────────────────────

export interface EnrichedArtistMeta {
  bio?: string;
  thumbnail?: string;
  fanart?: string;
  mbid?: string;
}

export interface EnrichedTrackMeta {
  coverUrl?: string;
  releaseYear?: string;
  mbid?: string;
  releaseMbid?: string;
}

// ── MusicBrainz recording search ─────────────────────────────────────────

interface MBRecording {
  id: string;
  title: string;
  length?: number;
  "first-release-date"?: string;
  releases?: Array<{
    id: string;
    title: string;
    date?: string;
    "release-group"?: { "primary-type"?: string };
  }>;
  "artist-credit"?: Array<{
    name?: string;
    artist?: { id?: string; name?: string };
  }>;
}

interface MBSearchResult {
  recordings?: MBRecording[];
}

/** Search MusicBrainz for a recording. Returns the best match or null. */
export async function searchMBRecording(
  title: string,
  artist: string,
  signal?: AbortSignal | null
): Promise<MBRecording | null> {
  try {
    const q = encodeURIComponent(`recording:"${title}" AND artist:"${artist}"`);
    const url = `${MB_HOST}/recording/?query=${q}&fmt=json&limit=3`;

    const init: RequestInit = {
      headers: { "User-Agent": MB_UA, Accept: "application/json" },
    };
    if (signal != null) init.signal = signal;

    const res = await fetch(url, init);
    if (!res.ok) return null;

    const data = (await res.json()) as MBSearchResult;
    return data.recordings?.[0] ?? null;
  } catch {
    return null;
  }
}

// ── Cover Art Archive ─────────────────────────────────────────────────────

interface CAAImage {
  image: string;
  front?: boolean;
  types?: string[];
  thumbnails?: { small?: string; large?: string; "500"?: string };
}

interface CAAResponse {
  images?: CAAImage[];
}

/** Fetch the front cover art URL for a MusicBrainz release ID. */
export async function fetchCoverArt(
  releaseMbid: string,
  signal?: AbortSignal | null
): Promise<string | null> {
  try {
    const url = `${CAA_HOST}/release/${releaseMbid}`;
    const init: RequestInit = { redirect: "follow" };
    if (signal != null) init.signal = signal;
    const res = await fetch(url, init);
    if (!res.ok) return null;
    const data = (await res.json()) as CAAResponse;
    const front =
      data.images?.find((i) => i.front || i.types?.includes("Front")) ??
      data.images?.[0];
    return front?.thumbnails?.["500"] ?? front?.image ?? null;
  } catch {
    return null;
  }
}

/** Convenience: search for a recording and return its cover art URL. */
export async function enrichTrackCoverArt(
  title: string,
  artist: string
): Promise<EnrichedTrackMeta> {
  const ac    = new AbortController();
  const timer = setTimeout(() => ac.abort(), 6000);

  try {
    const recording = await searchMBRecording(title, artist, ac.signal);
    if (!recording) return {};

    const release = recording.releases?.find(
      (r) => r["release-group"]?.["primary-type"] === "Album"
    ) ?? recording.releases?.[0];

    const releaseMbid  = release?.id;
    const releaseYear  = (release?.date ?? recording["first-release-date"] ?? "").slice(0, 4) || undefined;

    const result: EnrichedTrackMeta = {
      mbid: recording.id,
      ...(releaseMbid   ? { releaseMbid }  : {}),
      ...(releaseYear   ? { releaseYear }   : {}),
    };

    if (releaseMbid) {
      const art = await fetchCoverArt(releaseMbid, ac.signal);
      if (art) result.coverUrl = art;
    }

    return result;
  } finally {
    clearTimeout(timer);
  }
}

// ── TheAudioDB artist enrichment ──────────────────────────────────────────

interface TADBArtist {
  strArtist?: string;
  strBiographyEN?: string;
  strArtistThumb?: string;
  strArtistFanart?: string;
  strArtistFanart2?: string;
  strMusicBrainzID?: string;
}

interface TADBResponse {
  artists?: TADBArtist[] | null;
}

/** Lookup an artist's bio and art from TheAudioDB. No key required for free tier. */
export async function enrichArtistMeta(
  artistName: string
): Promise<EnrichedArtistMeta> {
  if (!artistName.trim()) return {};

  const ac    = new AbortController();
  const timer = setTimeout(() => ac.abort(), 5000);

  try {
    const url = `${TADB_HOST}/search.php?s=${encodeURIComponent(artistName)}`;
    const res = await fetch(url, {
      signal: ac.signal,
      headers: { Accept: "application/json" },
    });

    if (!res.ok) return {};

    const data   = (await res.json()) as TADBResponse;
    const artist = data.artists?.[0];
    if (!artist) return {};

    const result: EnrichedArtistMeta = {};
    const bio  = artist.strBiographyEN?.slice(0, 500);
    const thumb = artist.strArtistThumb;
    const fanart = artist.strArtistFanart ?? artist.strArtistFanart2;
    const mbid  = artist.strMusicBrainzID;
    if (bio)    result.bio       = bio;
    if (thumb)  result.thumbnail = thumb;
    if (fanart) result.fanart    = fanart;
    if (mbid)   result.mbid      = mbid;
    return result;
  } catch {
    return {};
  } finally {
    clearTimeout(timer);
  }
}

// ── MusicBrainz artist search ─────────────────────────────────────────────

interface MBArtist {
  id: string;
  name: string;
}

interface MBArtistSearch {
  artists?: MBArtist[];
}

/** Returns just the MBID for an artist name (for Cover Art lookups). */
export async function searchMBArtistId(
  artistName: string,
  signal?: AbortSignal | null
): Promise<string | null> {
  try {
    const q   = encodeURIComponent(`artist:"${artistName}"`);
    const url = `${MB_HOST}/artist/?query=${q}&fmt=json&limit=1`;
    const init: RequestInit = {
      headers: { "User-Agent": MB_UA, Accept: "application/json" },
    };
    if (signal != null) init.signal = signal;
    const res = await fetch(url, init);
    if (!res.ok) return null;
    const data = (await res.json()) as MBArtistSearch;
    return data.artists?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

// ── MusicBrainz recording search (by artist) ─────────────────────────────

/** Fetch recordings from MusicBrainz for a given artist name. Returns up to `limit` tracks. */
export async function fetchMBTracksByArtist(
  artistName: string,
  limit = 10
): Promise<MBRecording[]> {
  try {
    const q   = encodeURIComponent(`artist:"${artistName}"`);
    const url = `${MB_HOST}/recording/?query=${q}&fmt=json&limit=${limit}`;
    const res = await fetch(url, {
      headers: { "User-Agent": MB_UA, Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as MBSearchResult;
    return data.recordings ?? [];
  } catch {
    return [];
  }
}
