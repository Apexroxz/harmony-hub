import { LocalArtworkCacheService } from "../artwork/artwork.service";
import { LocalLyricsService } from "../lyrics/lyrics.service";
import type { StoredTrackLyrics } from "../lyrics/lyrics.schema";
import { parseAnyLyricFormat } from "../lyrics/lyrics.parser";

export interface OnlineMetadataResult {
  artworkUrl?: string;
  artist?: string;
  album?: string;
  lyrics?: StoredTrackLyrics;
  source: "itunes_lrclib" | "local_embedded";
}

const OPT_IN_STORAGE_KEY = "layam_fetch_online_metadata_opt_in";

export class OnlineMetadataService {
  /**
   * Checks if user has explicitly enabled online metadata fetching.
   * Default is STRICTLY FALSE (opt-in only).
   */
  public static isOptInEnabled(): boolean {
    try {
      return localStorage.getItem(OPT_IN_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  }

  /**
   * Sets the user's explicit opt-in preference.
   */
  public static setOptIn(enabled: boolean): void {
    try {
      localStorage.setItem(OPT_IN_STORAGE_KEY, enabled ? "true" : "false");
    } catch (err) {
      console.warn("[OnlineMetadataService] Failed to persist opt-in state:", err);
    }
  }

  /**
   * Fetches high-res artwork from iTunes Search API and LRCLIB synchronized lyrics.
   * Caches all assets in IndexedDB so they are permanently available offline.
   *
   * If opt-in is disabled or request fails, returns null silently.
   */
  public static async fetchOnlineMetadata(
    trackId: string,
    title: string,
    artist?: string,
    album?: string,
    durationSeconds?: number,
    onProgress?: (status: string) => void,
  ): Promise<OnlineMetadataResult | null> {
    // 1. Strict Opt-In Gate: Never connect without explicit user consent
    if (!this.isOptInEnabled()) {
      return null;
    }

    // 2. Check if offline
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return null;
    }

    const cleanTitle = title.replace(/\.[^.]+$/, "").trim();
    const cleanArtist = (artist || "").trim();
    const query = cleanArtist ? `${cleanTitle} ${cleanArtist}` : cleanTitle;

    let artworkUrl: string | undefined;
    let fetchedLyrics: StoredTrackLyrics | undefined;

    try {
      onProgress?.("Searching online metadata...");

      // ── Step A: High-Res Album Artwork via iTunes API ──
      try {
        const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`;
        const res = await fetch(itunesUrl, { signal: AbortSignal.timeout(4000) });
        if (res.ok) {
          const data = await res.json();
          if (data.results && data.results.length > 0) {
            const hit = data.results[0];
            if (hit.artworkUrl100) {
              // Upgrade to 1200x1200 high-res audiophile artwork
              const highResUrl = hit.artworkUrl100.replace("100x100bb", "1200x1200bb");
              artworkUrl = highResUrl;
              
              // Cache artwork in IndexedDB for permanent offline use
              try {
                const imgRes = await fetch(highResUrl, { signal: AbortSignal.timeout(5000) });
                if (imgRes.ok) {
                  const blob = await imgRes.blob();
                  await LocalArtworkCacheService.cacheArtwork(trackId, blob, blob.type || "image/jpeg");
                }
              } catch {
                // Keep the direct URL if blob fetch fails
              }
            }
          }
        }
      } catch (err) {
        // Silently continue to lyrics
      }

      // ── Step B: Synchronized & Plain Lyrics via LRCLIB ──
      try {
        onProgress?.("Fetching synced lyrics...");
        const params = new URLSearchParams({
          track_name: cleanTitle,
        });
        if (cleanArtist) params.append("artist_name", cleanArtist);
        if (album) params.append("album_name", album);
        if (durationSeconds && durationSeconds > 0) {
          params.append("duration", Math.round(durationSeconds).toString());
        }

        const lrcUrl = `https://lrclib.net/api/get?${params.toString()}`;
        const lrcRes = await fetch(lrcUrl, { signal: AbortSignal.timeout(4000) });
        if (lrcRes.ok) {
          const lrcData = await lrcRes.json();
          const rawText = lrcData.syncedLyrics || lrcData.plainLyrics;
          if (rawText) {
            const { format, lines, isSynced } = parseAnyLyricFormat(
              rawText,
              lrcData.syncedLyrics ? "online.lrc" : "online.txt"
            );

            fetchedLyrics = {
              trackId,
              title: lrcData.trackName || cleanTitle,
              artist: lrcData.artistName || cleanArtist,
              album: lrcData.albumName || album,
              format,
              rawText,
              lines,
              isSynced,
              source: "lrclib_online",
              importedAt: new Date().toISOString(),
            };

            // Cache lyrics in IndexedDB for offline access
            await LocalLyricsService.saveLyrics(fetchedLyrics);
          }
        }
      } catch {
        // Silently ignore lyrics fetch errors
      }

      onProgress?.("");

      if (artworkUrl || fetchedLyrics) {
        return {
          artworkUrl,
          artist: cleanArtist,
          album,
          lyrics: fetchedLyrics,
          source: "itunes_lrclib",
        };
      }

      return null;
    } catch {
      onProgress?.("");
      return null;
    }
  }
}
