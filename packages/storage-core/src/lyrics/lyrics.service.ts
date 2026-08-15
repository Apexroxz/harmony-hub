import { getDB, STORES } from "../indexedDbAudio";
import type { StoredTrackLyrics, LyricFormat } from "./lyrics.schema";
import { parseAnyLyricFormat } from "./lyrics.parser";

export class LocalLyricsService {
  /**
   * Retrieves lyrics for a track from the local IndexedDB vault.
   */
  public static async getLyrics(trackId: string): Promise<StoredTrackLyrics | null> {
    try {
      const db = await getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORES.LYRICS, "readonly");
        const store = tx.objectStore(STORES.LYRICS);
        const req = store.get(trackId);

        req.onsuccess = () => {
          resolve((req.result as StoredTrackLyrics) || null);
        };
        req.onerror = () => resolve(null);
      });
    } catch (err) {
      console.error("[LocalLyricsService:GetLyricsError]", err);
      return null;
    }
  }

  /**
   * Saves or updates track lyrics in the local IndexedDB vault.
   */
  public static async saveLyrics(lyrics: StoredTrackLyrics): Promise<void> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.LYRICS, "readwrite");
        const store = tx.objectStore(STORES.LYRICS);
        const req = store.put(lyrics);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error("[LocalLyricsService:SaveLyricsError]", err);
    }
  }

  /**
   * Imports lyrics from an uploaded LRC, SRT, or TXT file.
   */
  public static async importLyricsFromFile(
    trackId: string,
    title: string,
    artist: string | undefined,
    file: File,
  ): Promise<StoredTrackLyrics> {
    const rawText = await file.text();
    const { format, lines, isSynced } = parseAnyLyricFormat(rawText, file.name);

    const storedLyrics: StoredTrackLyrics = {
      trackId,
      title,
      artist,
      format,
      rawText,
      lines,
      isSynced,
      source: "manual_import",
      importedAt: new Date().toISOString(),
    };

    await this.saveLyrics(storedLyrics);
    return storedLyrics;
  }

  /**
   * Auto-detects sidecar lyrics file (e.g. song.lrc alongside song.flac).
   */
  public static findSidecarLyricsFile(
    audioFileName: string,
    fileBatch: FileList | File[],
  ): File | null {
    const baseName = audioFileName.replace(/\.[^.]+$/, "").toLowerCase();
    const files = Array.from(fileBatch);

    return (
      files.find((f) => {
        const fBase = f.name.replace(/\.[^.]+$/, "").toLowerCase();
        const fExt = f.name.split(".").pop()?.toLowerCase() || "";
        return fBase === baseName && (fExt === "lrc" || fExt === "txt" || fExt === "srt");
      }) || null
    );
  }

  /**
   * Generates formatted content for exporting lyrics.
   */
  public static async exportLyrics(
    trackId: string,
    exportFormat: "txt" | "lrc" | "json",
  ): Promise<{ filename: string; content: string; mimeType: string } | null> {
    const lyrics = await this.getLyrics(trackId);
    if (!lyrics) return null;

    const safeTitle = (lyrics.title || "lyrics").replace(/[^a-zA-Z0-9_-]/g, "_");

    if (exportFormat === "json") {
      return {
        filename: `${safeTitle}_lyrics.json`,
        content: JSON.stringify(lyrics, null, 2),
        mimeType: "application/json",
      };
    }

    if (exportFormat === "lrc") {
      let lrcContent = lyrics.rawText;
      if (!lyrics.isSynced && lyrics.lines.length > 0) {
        lrcContent = lyrics.lines
          .map((l) => {
            const m = Math.floor(l.time / 60);
            const s = Math.floor(l.time % 60);
            const ms = Math.floor((l.time % 1) * 100);
            const ts = `[${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(ms).padStart(2, "0")}]`;
            return `${ts} ${l.text}`;
          })
          .join("\n");
      }

      return {
        filename: `${safeTitle}.lrc`,
        content: lrcContent,
        mimeType: "text/plain",
      };
    }

    // Plain text export
    const plainText = lyrics.lines.map((l) => l.text).join("\n");
    return {
      filename: `${safeTitle}.txt`,
      content: plainText,
      mimeType: "text/plain",
    };
  }

  /**
   * Deletes lyrics for a track from local vault.
   */
  public static async deleteLyrics(trackId: string): Promise<void> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.LYRICS, "readwrite");
        const store = tx.objectStore(STORES.LYRICS);
        const req = store.delete(trackId);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error("[LocalLyricsService:DeleteLyricsError]", err);
    }
  }
}
