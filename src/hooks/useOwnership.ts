import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ownershipQueryOptions } from "@/domain/ownership/queries";
import type { Ownership } from "@/domain/ownership/types";
import { useWallet } from "@/lib/wallet";

export interface TrackOwnershipAccess {
  ownership: Ownership | undefined;
  /** True when the track is token gated and the visitor has no wallet connected. */
  locked: boolean;
  tokenGated: boolean;
  collectible: boolean;
  isLoading: boolean;
}

/**
 * Bridges the ownership domain with wallet state so music components never
 * have to touch blockchain fields themselves.
 */
export function useOwnership(trackId: string): TrackOwnershipAccess {
  const { connected } = useWallet();
  const { data, isLoading } = useQuery(ownershipQueryOptions());
  const ownership = data?.[trackId];

  return useMemo(() => {
    const tokenGated = ownership?.tokenGated ?? false;
    return {
      ownership,
      tokenGated,
      collectible: ownership?.collectibleEnabled ?? false,
      locked: tokenGated && !connected,
      isLoading,
    };
  }, [ownership, connected, isLoading]);
}
