import { getDB, STORES } from "../indexedDbAudio";

export interface PlayHistoryEntry {
  id: string;
  trackId: string;
  title: string;
  artist: string;
  timestamp: number; // Date.now()
  durationListenedSec: number;
  completed: boolean;
}

export class LocalHistoryService {
  public static async recordPlay(
    trackId: string,
    title: string,
    artist: string,
    durationListenedSec: number,
    completed = false,
  ): Promise<void> {
    try {
      const db = await getDB();
      const entry: PlayHistoryEntry = {
        id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        trackId,
        title,
        artist,
        timestamp: Date.now(),
        durationListenedSec,
        completed,
      };

      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.PLAY_HISTORY, "readwrite");
        const store = tx.objectStore(STORES.PLAY_HISTORY);
        const req = store.put(entry);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error("[LocalHistoryService:RecordPlayError]", err);
    }
  }

  public static async getRecentHistory(limit = 50): Promise<PlayHistoryEntry[]> {
    try {
      const db = await getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORES.PLAY_HISTORY, "readonly");
        const store = tx.objectStore(STORES.PLAY_HISTORY);
        const index = store.index("by_timestamp");
        const req = index.openCursor(null, "prev");
        const results: PlayHistoryEntry[] = [];

        req.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor && results.length < limit) {
            results.push(cursor.value);
            cursor.continue();
          } else {
            resolve(results);
          }
        };

        req.onerror = () => resolve([]);
      });
    } catch (err) {
      console.error("[LocalHistoryService:GetRecentHistoryError]", err);
      return [];
    }
  }

  public static async clearHistory(): Promise<void> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.PLAY_HISTORY, "readwrite");
        const store = tx.objectStore(STORES.PLAY_HISTORY);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error("[LocalHistoryService:ClearHistoryError]", err);
    }
  }

  /**
   * Returns up to `limit` unique track IDs in most-recently-played order.
   * De-duplicates so replaying a track doesn't push it to the front multiple times.
   */
  public static async getRecentlyPlayedIds(limit = 12): Promise<string[]> {
    const history = await LocalHistoryService.getRecentHistory(limit * 5);
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const entry of history) {
      if (!seen.has(entry.trackId)) {
        seen.add(entry.trackId);
        ids.push(entry.trackId);
      }
      if (ids.length >= limit) break;
    }
    return ids;
  }
}
