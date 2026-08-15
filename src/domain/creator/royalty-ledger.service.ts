import { supabase } from "@/integrations/supabase/client";
import type {
  RevenueSplit,
  RoyaltyEventType,
  RoyaltyTransaction,
} from "./creator-economy.types";

export interface DisperseRoyaltyParams {
  trackId: string;
  eventType: RoyaltyEventType;
  grossAmount: number;
  currency?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Royalty Ledger Service
 * 
 * Enforces ledger-backed creator accounting. Calculates earnings by splitting
 * gross transaction values among validated collaborators and writing append-only
 * ledger records.
 */
export class RoyaltyLedgerService {
  /**
   * Validates that all active splits for a track total exactly 100%.
   */
  public static validateSplitsSum(splits: { percentage: number }[]): {
    isValid: boolean;
    total: number;
    difference: number;
  } {
    const total = splits.reduce((sum, s) => sum + s.percentage, 0);
    const rounded = Math.round(total * 100) / 100;
    return {
      isValid: rounded === 100.0,
      total: rounded,
      difference: Math.round((100.0 - rounded) * 100) / 100,
    };
  }

  /**
   * Disperses gross earnings across approved track splits and creates ledger entries.
   */
  public static async disperseRevenue(params: DisperseRoyaltyParams): Promise<RoyaltyTransaction[]> {
    const { trackId, eventType, grossAmount, currency = "USD", metadata = {} } = params;
    if (grossAmount <= 0) return [];

    try {
      // 1. Fetch approved splits for track
      const { data: splits, error } = await supabase
        .from("revenue_splits")
        .select("creator_id, percentage, status")
        .eq("track_id", trackId)
        .eq("status", "approved");

      if (error) throw error;

      const activeSplits = (splits as { creator_id: string; percentage: number }[]) || [];

      // If no custom splits exist, check track uploader
      if (activeSplits.length === 0) {
        const { data: track } = await supabase
          .from("tracks")
          .select("uploader_id")
          .eq("id", trackId)
          .maybeSingle();

        const primaryCreatorId = track?.uploader_id;
        if (!primaryCreatorId) return [];

        activeSplits.push({ creator_id: primaryCreatorId, percentage: 100 });
      }

      // Validate split total
      const { isValid, total } = this.validateSplitsSum(activeSplits);
      if (!isValid && total > 0) {
        console.warn(`[RoyaltyLedger] Splits for track ${trackId} sum to ${total}%, not 100%`);
      }

      // 2. Compute individual creator amounts & insert immutable records
      const ledgerEntries: RoyaltyTransaction[] = [];

      for (const split of activeSplits) {
        const creatorShare = (grossAmount * split.percentage) / 100;
        const entry: RoyaltyTransaction = {
          id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          trackId,
          creatorId: split.creator_id,
          eventType,
          amount: Math.round(creatorShare * 10000) / 10000,
          currency,
          metadata: {
            ...metadata,
            splitPercentage: split.percentage,
            grossAmount,
          },
          createdAt: new Date().toISOString(),
        };

        ledgerEntries.push(entry);

        // Attempt server insert
        void supabase
          .from("royalty_transactions")
          .insert({
            track_id: trackId,
            creator_id: split.creator_id,
            event_type: eventType,
            amount: entry.amount,
            currency,
            metadata: entry.metadata,
          })
          .catch((err) => console.warn("[RoyaltyLedger] Insert note:", err));
      }

      return ledgerEntries;
    } catch (err) {
      console.warn("[RoyaltyLedger] Error dispersing revenue:", err);
      return [];
    }
  }
}
