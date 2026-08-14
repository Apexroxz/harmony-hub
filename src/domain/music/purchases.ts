import { toast } from "sonner";
import type { Track } from "./types";

export const PURCHASES_STORAGE_KEY = "layam_purchases";

export function getPurchasedTrackIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const sessionData = sessionStorage.getItem(PURCHASES_STORAGE_KEY);
    const localData = localStorage.getItem(PURCHASES_STORAGE_KEY);
    const sessionIds = sessionData ? (JSON.parse(sessionData) as string[]) : [];
    const localIds = localData ? (JSON.parse(localData) as string[]) : [];
    return Array.from(new Set([...sessionIds, ...localIds]));
  } catch {
    return [];
  }
}

export function isTrackPurchased(trackId: string): boolean {
  const ids = getPurchasedTrackIds();
  return ids.includes(trackId);
}

export function recordTrackPurchase(track: Track): boolean {
  try {
    const current = getPurchasedTrackIds();
    if (!current.includes(track.id)) {
      current.push(track.id);
      sessionStorage.setItem(PURCHASES_STORAGE_KEY, JSON.stringify(current));
      localStorage.setItem(PURCHASES_STORAGE_KEY, JSON.stringify(current));
    }
    return true;
  } catch {
    return false;
  }
}
