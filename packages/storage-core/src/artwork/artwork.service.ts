import { getDB, STORES } from "../indexedDbAudio";

export interface StoredArtworkRecord {
  hash: string;
  blob: Blob | string;
  mimeType: string;
  cachedAt: number;
}

export class LocalArtworkCacheService {
  private static memoryCache = new Map<string, string>();

  public static async getArtwork(hash: string): Promise<string | null> {
    if (this.memoryCache.has(hash)) {
      return this.memoryCache.get(hash)!;
    }

    try {
      const db = await getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORES.ARTWORK_CACHE, "readonly");
        const store = tx.objectStore(STORES.ARTWORK_CACHE);
        const req = store.get(hash);

        req.onsuccess = () => {
          const rec = req.result as StoredArtworkRecord | undefined;
          if (rec) {
            let url: string;
            if (typeof rec.blob === "string") {
              url = rec.blob;
            } else {
              url = URL.createObjectURL(rec.blob);
            }
            this.memoryCache.set(hash, url);
            resolve(url);
          } else {
            resolve(null);
          }
        };

        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  public static async cacheArtwork(
    hash: string,
    imageBlobOrDataUrl: Blob | string,
    mimeType = "image/jpeg",
  ): Promise<void> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.ARTWORK_CACHE, "readwrite");
        const store = tx.objectStore(STORES.ARTWORK_CACHE);
        const record: StoredArtworkRecord = {
          hash,
          blob: imageBlobOrDataUrl,
          mimeType,
          cachedAt: Date.now(),
        };
        const req = store.put(record);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error("[LocalArtworkCacheService:CacheArtworkError]", err);
    }
  }
}
