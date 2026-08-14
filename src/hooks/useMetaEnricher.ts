/**
 * useMetaEnricher — React hook that lazily enriches a track's metadata
 * from MusicBrainz / TheAudioDB / Cover Art Archive.
 *
 * Only fires once per unique (title + artist) pair, results cached in-module.
 */
import { useState, useEffect, useRef } from "react";
import { enrichArtistMeta, enrichTrackCoverArt } from "@/domain/music/musicbrainz";
import type { Track } from "@/domain/music/types";

interface EnrichedMeta {
  coverUrl?: string;
  releaseYear?: string;
  bio?: string;
  artistThumb?: string;
  fanart?: string;
}

// Module-level LRU-style cache (bounded at 200 entries)
const metaCache = new Map<string, EnrichedMeta>();
const MAX_CACHE  = 200;

function cacheKey(track: Track): string {
  return `${track.title.toLowerCase()}|${track.artistName.toLowerCase()}`;
}

type EnrichStatus = "idle" | "loading" | "done";

export function useMetaEnricher(track: Track | null): {
  meta: EnrichedMeta;
  status: EnrichStatus;
} {
  const [meta,   setMeta]   = useState<EnrichedMeta>({});
  const [status, setStatus] = useState<EnrichStatus>("idle");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!track) return;

    const key = cacheKey(track);

    // Already cached
    if (metaCache.has(key)) {
      setMeta(metaCache.get(key)!);
      setStatus("done");
      return;
    }

    // Don't re-enrich external tracks that already have a cover image
    // Only enrich if cover is missing/generic
    const needsCover  = !track.coverImage || track.coverImage.includes("placeholder");
    const needsArtist = true; // Always try to get bio/thumb

    setStatus("loading");
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const enriched: EnrichedMeta = {};

    const promises: Promise<void>[] = [];

    if (needsCover) {
      promises.push(
        enrichTrackCoverArt(track.title, track.artistName).then((result) => {
          if (result.coverUrl) enriched.coverUrl = result.coverUrl;
          if (result.releaseYear) enriched.releaseYear = result.releaseYear;
        }).catch(() => {})
      );
    }

    if (needsArtist) {
      promises.push(
        enrichArtistMeta(track.artistName).then((result) => {
          if (result.bio)       enriched.bio        = result.bio;
          if (result.thumbnail) enriched.artistThumb = result.thumbnail;
          if (result.fanart)    enriched.fanart      = result.fanart;
        }).catch(() => {})
      );
    }

    void Promise.allSettled(promises).then(() => {
      // Evict oldest entry if cache full
      if (metaCache.size >= MAX_CACHE) {
        const firstKey = metaCache.keys().next().value;
        if (firstKey !== undefined) metaCache.delete(firstKey);
      }
      metaCache.set(key, enriched);
      setMeta(enriched);
      setStatus("done");
    });

    return () => {
      abortRef.current?.abort();
    };
  }, [track?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return { meta, status };
}
