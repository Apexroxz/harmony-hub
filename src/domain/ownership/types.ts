/**
 * Ownership domain — all Web3 / blockchain concerns for a track.
 * The music domain does not import from here; UI composes the two.
 */

export type StorageProvider = "ipfs" | "arweave" | "cdn";

export interface RoyaltySplit {
  wallet: string;
  /** Percentage of revenue, 0-100. */
  percentage: number;
}

export interface Ownership {
  trackId: string;
  storageProvider: StorageProvider;
  royaltyContract?: string;
  tokenAddress?: string;
  tokenGated: boolean;
  collectibleEnabled: boolean;
  royaltySplit: RoyaltySplit[];
  ownerWallet: string;
  /** Collect price in SOL, when the track is a collectible. */
  price?: number;
}

export function storageLabel(provider: StorageProvider): string {
  switch (provider) {
    case "ipfs":
      return "IPFS";
    case "arweave":
      return "Arweave";
    case "cdn":
      return "CDN";
  }
}
