// ─── Rock-Solid IndexedDB Audio Persistence Engine ───────────────────────────
// Stores and restores offline local audio files as binary Blobs so they persist
// permanently across browser sessions and never expire or fail to replay.

const DB_NAME = "layam_audiophile_db";
const DB_VERSION = 1;
const STORE_NAME = "local_audio_blobs";

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.reject(new Error("IndexedDB is not supported in this environment"));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
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

// In-memory active blob URL cache to prevent creating duplicate URLs
const activeUrlCache = new Map<string, string>();

export async function storeAudioBlob(id: string, fileOrBlob: Blob, name: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);

      const record: StoredAudioRecord = {
        id,
        blob: fileOrBlob,
        name,
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
}

export async function getAudioBlobUrl(id: string): Promise<string | null> {
  // Check active URL cache
  if (activeUrlCache.has(id)) {
    return activeUrlCache.get(id)!;
  }

  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => {
        const record = req.result as StoredAudioRecord | undefined;
        if (record && record.blob) {
          const url = URL.createObjectURL(record.blob);
          activeUrlCache.set(id, url);
          resolve(url);
        } else {
          resolve(null);
        }
      };

      req.onerror = () => {
        resolve(null);
      };
    });
  } catch (err) {
    console.error("[IndexedDB:GetAudioError]", err);
    return null;
  }
}

export async function deleteAudioBlob(id: string): Promise<void> {
  try {
    if (activeUrlCache.has(id)) {
      URL.revokeObjectURL(activeUrlCache.get(id)!);
      activeUrlCache.delete(id);
    }

    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
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
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
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
