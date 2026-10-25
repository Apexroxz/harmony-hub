import type { Track } from "./types";

export const PURCHASES_STORAGE_KEY = "layam_purchases";
const PURCHASES_EVENT = "layam:purchases-updated";

export interface PurchaseRecord {
  trackId: string;
  purchasedAt: string;
  pricePaid?: number;
  paymentMethod?: "card" | "sol" | "usdc" | "promo";
  transactionSignature?: string;
}

/**
 * Unified Purchase Service
 * 
 * Manages DRM-free master track purchases with single-source-of-truth storage
 * across tabs, offline sessions, and database synchronizers.
 */
export class PurchaseService {
  private static cachedIds: string[] | null = null;

  /**
   * Retrieves all purchased track IDs from storage.
   */
  public static getPurchasedTrackIds(): string[] {
    if (this.cachedIds) return this.cachedIds;
    if (typeof window === "undefined") return [];

    try {
      const localData = localStorage.getItem(PURCHASES_STORAGE_KEY);
      const sessionData = sessionStorage.getItem(PURCHASES_STORAGE_KEY);

      const localIds: string[] = localData ? JSON.parse(localData) : [];
      const sessionIds: string[] = sessionData ? JSON.parse(sessionData) : [];

      const merged = Array.from(new Set([...localIds, ...sessionIds]));
      this.cachedIds = merged;
      return merged;
    } catch {
      return [];
    }
  }

  /**
   * Checks if a track ID has been purchased by the current user/device.
   */
  public static isTrackPurchased(trackId: string): boolean {
    if (!trackId) return false;
    const ids = this.getPurchasedTrackIds();
    return ids.includes(trackId);
  }

  /**
   * Records a new master track purchase and broadcasts changes to all listeners.
   */
  public static recordPurchase(
    track: Track | string,
    details?: Partial<PurchaseRecord>,
  ): boolean {
    const trackId = typeof track === "string" ? track : track.id;
    if (!trackId) return false;

    try {
      const current = this.getPurchasedTrackIds();
      if (!current.includes(trackId)) {
        const next = [...current, trackId];
        this.cachedIds = next;

        if (typeof window !== "undefined") {
          const serialized = JSON.stringify(next);
          localStorage.setItem(PURCHASES_STORAGE_KEY, serialized);
          sessionStorage.setItem(PURCHASES_STORAGE_KEY, serialized);

          // Dispatch custom event for reactive UI components
          window.dispatchEvent(
            new CustomEvent(PURCHASES_EVENT, { detail: { trackId, details } }),
          );
        }
      }
      return true;
    } catch (err) {
      console.error("[PurchaseService] Failed to record purchase:", err);
      return false;
    }
  }

  /**
   * Filters an array of tracks to return only those owned by the user.
   */
  public static getPurchasedTracks(availableTracks: Track[]): Track[] {
    const purchasedIds = new Set(this.getPurchasedTrackIds());
    return availableTracks.filter((t) => purchasedIds.has(t.id));
  }

  /**
   * Clears purchase ledger (e.g. on complete sign out / factory reset).
   */
  public static clearPurchases(): void {
    this.cachedIds = [];
    if (typeof window !== "undefined") {
      localStorage.removeItem(PURCHASES_STORAGE_KEY);
      sessionStorage.removeItem(PURCHASES_STORAGE_KEY);
      window.dispatchEvent(new CustomEvent(PURCHASES_EVENT));
    }
  }

  /**
   * Subscribes to purchase updates across components and browser tabs.
   */
  public static subscribe(callback: () => void): () => void {
    if (typeof window === "undefined") return () => {};

    const handleUpdate = () => {
      this.cachedIds = null;
      callback();
    };

    window.addEventListener(PURCHASES_EVENT, handleUpdate);
    window.addEventListener("storage", (e) => {
      if (e.key === PURCHASES_STORAGE_KEY) {
        this.cachedIds = null;
        callback();
      }
    });

    return () => {
      window.removeEventListener(PURCHASES_EVENT, handleUpdate);
    };
  }
}

// Backward-compatible exports
export const getPurchasedTrackIds = PurchaseService.getPurchasedTrackIds.bind(PurchaseService);
export const isTrackPurchased = PurchaseService.isTrackPurchased.bind(PurchaseService);
export const recordTrackPurchase = PurchaseService.recordPurchase.bind(PurchaseService);
export const getPurchasedTracks = PurchaseService.getPurchasedTracks.bind(PurchaseService);
