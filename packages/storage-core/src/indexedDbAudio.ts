// ─── Rock-Solid IndexedDB Audio Persistence Engine ───────────────────────────
// Stores and restores offline local audio files, lyrics, favorites, play history,
// artwork cache, and acoustic analysis with zero data loss and schema version migration.

const DB_NAME = "layam_audiophile_db";
const DB_VERSION = 2; // Upgraded from v1 to v2 for extended offline intelligence

export const STORES = {
  AUDIO_BLOBS: "local_audio_blobs",
  LYRICS: "lyrics",
  FAVORITES: "favorites",
  PLAY_HISTORY: "play_history",
  ARTWORK_CACHE: "artwork_cache",
  AUDIO_ANALYSIS: "audio_analysis",
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.reject(new Error("IndexedDB is not supported in this environment"));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;

        // V1 Store: Preserves all existing user audio blobs
        if (!db.objectStoreNames.contains(STORES.AUDIO_BLOBS)) {
          db.createObjectStore(STORES.AUDIO_BLOBS, { keyPath: "id" });
        }

        // V2 Stores: Backward-compatible additions
        if (!db.objectStoreNames.contains(STORES.LYRICS)) {
          db.createObjectStore(STORES.LYRICS, { keyPath: "trackId" });
        }

        if (!db.objectStoreNames.contains(STORES.FAVORITES)) {
          db.createObjectStore(STORES.FAVORITES, { keyPath: "trackId" });
        }

        if (!db.objectStoreNames.contains(STORES.PLAY_HISTORY)) {
          const historyStore = db.createObjectStore(STORES.PLAY_HISTORY, { keyPath: "id" });
          historyStore.createIndex("by_timestamp", "timestamp", { unique: false });
          historyStore.createIndex("by_trackId", "trackId", { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.ARTWORK_CACHE)) {
          db.createObjectStore(STORES.ARTWORK_CACHE, { keyPath: "hash" });
        }

        if (!db.objectStoreNames.contains(STORES.AUDIO_ANALYSIS)) {
          db.createObjectStore(STORES.AUDIO_ANALYSIS, { keyPath: "trackId" });
        }

        console.info(`[IndexedDB] Schema upgraded smoothly from v${oldVersion} to v${DB_VERSION}`);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  return dbPromise;
}

export interface StoredAudioRecord {
  id: string;
  blob: Blob;
  name: string;
  type: string;
  updatedAt: number;
}

// In-memory active blob URL cache to prevent creating duplicate URLs within same session
const activeUrlCache = new Map<string, string>();

export function getCachedAudioBlobUrl(id: string): string | null {
  return activeUrlCache.get(id) || null;
}

export function setCachedAudioBlobUrl(id: string, url: string): void {
  activeUrlCache.set(id, url);
}

export async function storeAudioBlob(
  id: string,
  fileOrBlob: Blob,
  name = "audio_master",
): Promise<string> {
  const url = URL.createObjectURL(fileOrBlob);
  activeUrlCache.set(id, url);

  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.AUDIO_BLOBS, "readwrite");
      const store = tx.objectStore(STORES.AUDIO_BLOBS);

      const record: StoredAudioRecord = {
        id,
        blob: fileOrBlob,
        name: name || (fileOrBlob as File).name || "audio_master",
        type: fileOrBlob.type || "audio/mpeg",
        updatedAt: Date.now(),
      };

      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error("[IndexedDB:StoreAudioError]", err);
  }

  return url;
}

export async function getAudioBlob(id: string): Promise<Blob | null> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.AUDIO_BLOBS, "readonly");
      const store = tx.objectStore(STORES.AUDIO_BLOBS);
      const req = store.get(id);

      req.onsuccess = () => {
        const record = req.result as StoredAudioRecord | undefined;
        resolve(record?.blob || null);
      };

      req.onerror = () => {
        resolve(null);
      };
    });
  } catch (err) {
    console.error("[IndexedDB:GetAudioBlobError]", err);
    return null;
  }
}

export async function getAudioBlobUrl(id: string): Promise<string | null> {
  // Check active memory URL cache for this session
  if (activeUrlCache.has(id)) {
    const cached = activeUrlCache.get(id)!;
    if (cached && cached.startsWith("blob:")) {
      return cached;
    }
  }

  try {
    const blob = await getAudioBlob(id);
    if (blob) {
      const url = URL.createObjectURL(blob);
      activeUrlCache.set(id, url);
      return url;
    }
    return null;
  } catch (err) {
    console.error("[IndexedDB:GetAudioUrlError]", err);
    return null;
  }
}

export async function deleteAudioBlob(id: string): Promise<void> {
  try {
    if (activeUrlCache.has(id)) {
      try {
        URL.revokeObjectURL(activeUrlCache.get(id)!);
      } catch {}
      activeUrlCache.delete(id);
    }

    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.AUDIO_BLOBS, "readwrite");
      const store = tx.objectStore(STORES.AUDIO_BLOBS);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error("[IndexedDB:DeleteAudioError]", err);
  }
}

export async function getAllStoredAudioIds(): Promise<string[]> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.AUDIO_BLOBS, "readonly");
      const store = tx.objectStore(STORES.AUDIO_BLOBS);
      const req = store.getAllKeys();
      req.onsuccess = () => {
        resolve((req.result as string[]) || []);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function clearAllAudioBlobs(): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.AUDIO_BLOBS, "readwrite");
      const store = tx.objectStore(STORES.AUDIO_BLOBS);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error("[IndexedDB:ClearAudioError]", err);
  }
}
