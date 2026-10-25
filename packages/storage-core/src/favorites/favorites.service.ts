import { getDB, STORES } from "../indexedDbAudio";

export interface FavoriteRecord {
  trackId: string;
  rating?: number; // 1-5 stars
  favoritedAt: number;
}

export class LocalFavoritesService {
  public static async isFavorite(trackId: string): Promise<boolean> {
    try {
      const db = await getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORES.FAVORITES, "readonly");
        const store = tx.objectStore(STORES.FAVORITES);
        const req = store.get(trackId);
        req.onsuccess = () => resolve(!!req.result);
        req.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  public static async toggleFavorite(trackId: string): Promise<boolean> {
    const isFav = await this.isFavorite(trackId);
    const db = await getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.FAVORITES, "readwrite");
      const store = tx.objectStore(STORES.FAVORITES);

      if (isFav) {
        const req = store.delete(trackId);
        req.onsuccess = () => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("layam:favorite-change", {
                detail: { trackId, isFavorite: false },
              })
            );
          }
          resolve(false);
        };
        req.onerror = () => reject(req.error);
      } else {
        const record: FavoriteRecord = {
          trackId,
          favoritedAt: Date.now(),
        };
        const req = store.put(record);
        req.onsuccess = () => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("layam:favorite-change", {
                detail: { trackId, isFavorite: true },
              })
            );
          }
          resolve(true);
        };
        req.onerror = () => reject(req.error);
      }
    });
  }

  public static subscribeFavorites(
    callback: (detail: { trackId: string; isFavorite: boolean }) => void
  ): () => void {
    if (typeof window === "undefined") return () => {};
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ trackId: string; isFavorite: boolean }>;
      if (customEvent.detail) {
        callback(customEvent.detail);
      }
    };
    window.addEventListener("layam:favorite-change", handler);
    return () => window.removeEventListener("layam:favorite-change", handler);
  }

  public static async getAllFavoriteIds(): Promise<string[]> {
    try {
      const db = await getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORES.FAVORITES, "readonly");
        const store = tx.objectStore(STORES.FAVORITES);
        const req = store.getAllKeys();
        req.onsuccess = () => resolve((req.result as string[]) || []);
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  public static async rateTrack(trackId: string, rating: number): Promise<void> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.FAVORITES, "readwrite");
        const store = tx.objectStore(STORES.FAVORITES);
        const record: FavoriteRecord = {
          trackId,
          rating: Math.max(1, Math.min(5, rating)),
          favoritedAt: Date.now(),
        };
        const req = store.put(record);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error("[LocalFavoritesService:RateTrackError]", err);
    }
  }
}
