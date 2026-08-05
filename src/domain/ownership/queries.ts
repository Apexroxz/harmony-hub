import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Ownership, RoyaltySplit, StorageProvider } from "./types";

const sel = (s: string): string => s;

interface OwnershipRow {
  track_id: string;
  storage_provider: string;
  royalty_contract: string | null;
  token_address: string | null;
  token_gated: boolean;
  collectible_enabled: boolean;
  royalty_split: unknown;
  owner_wallet: string | null;
  price: number | null;
}

const COLUMNS =
  "track_id,storage_provider,royalty_contract,token_address,token_gated,collectible_enabled,royalty_split,owner_wallet,price";

function toSplit(value: unknown): RoyaltySplit[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return [];
    const record = entry as Record<string, unknown>;
    const wallet = typeof record["wallet"] === "string" ? record["wallet"] : null;
    const percentage = typeof record["percentage"] === "number" ? record["percentage"] : null;
    return wallet != null && percentage != null ? [{ wallet, percentage }] : [];
  });
}

function toOwnership(row: OwnershipRow): Ownership {
  return {
    trackId: row.track_id,
    storageProvider: row.storage_provider as StorageProvider,
    tokenGated: row.token_gated,
    collectibleEnabled: row.collectible_enabled,
    royaltySplit: toSplit(row.royalty_split),
    ownerWallet: row.owner_wallet ?? "unassigned",
    ...(row.royalty_contract ? { royaltyContract: row.royalty_contract } : {}),
    ...(row.token_address ? { tokenAddress: row.token_address } : {}),
    ...(row.price != null ? { price: row.price } : {}),
  };
}

async function fetchOwnershipRegistry(): Promise<Record<string, Ownership>> {
  const { data, error } = await supabase
    .from("track_ownership")
    .select(sel(COLUMNS))
    .returns<OwnershipRow[]>();
  if (error) throw error;

  const byTrackId: Record<string, Ownership> = {};
  for (const row of data ?? []) byTrackId[row.track_id] = toOwnership(row);
  return byTrackId;
}

export const ownershipQueryKey = ["ownership"] as const;

export function ownershipQueryOptions() {
  return queryOptions({
    queryKey: ownershipQueryKey,
    queryFn: fetchOwnershipRegistry,
    staleTime: 60_000,
  });
}
