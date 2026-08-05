import type { Ownership } from "./types";

const ownershipRecords: Ownership[] = [
  {
    trackId: "midnight-protocol",
    storageProvider: "ipfs",
    tokenGated: false,
    collectibleEnabled: true,
    royaltyContract: "RoyaltyV1v9dK2s1pQhJ8mZbT4",
    royaltySplit: [{ wallet: "7xKXtg2CW87d97TXJSDpbD5jBkheTuwA", percentage: 100 }],
    ownerWallet: "7xKXtg2CW87d97TXJSDpbD5jBkheTuwA",
  },
  {
    trackId: "chain-reaction",
    storageProvider: "arweave",
    tokenGated: true,
    collectibleEnabled: true,
    tokenAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTuwA",
    royaltyContract: "RoyaltyV1v9dK2s1pQhJ8mZbT4",
    royaltySplit: [
      { wallet: "7xKXtg2CW87d97TXJSDpbD5jBkheTuwA", percentage: 85 },
      { wallet: "4bQMtg9ZW21c55TXJSDpbD5jBkheTuwF", percentage: 15 },
    ],
    ownerWallet: "7xKXtg2CW87d97TXJSDpbD5jBkheTuwA",
    price: 0.5,
  },
  {
    trackId: "phantom-waves",
    storageProvider: "ipfs",
    tokenGated: false,
    collectibleEnabled: false,
    royaltySplit: [{ wallet: "8sLPtg5QW44b21TXJSDpbD5jBkheTuwD", percentage: 100 }],
    ownerWallet: "8sLPtg5QW44b21TXJSDpbD5jBkheTuwD",
  },
  {
    trackId: "validator-dreams",
    storageProvider: "cdn",
    tokenGated: true,
    collectibleEnabled: true,
    tokenAddress: "9yMNtg4DX98d98TXJSDpbD5jBkheTuwB",
    royaltyContract: "RoyaltyV1kP4r7tYbN2xW9qLc",
    royaltySplit: [{ wallet: "8sLPtg5QW44b21TXJSDpbD5jBkheTuwD", percentage: 100 }],
    ownerWallet: "8sLPtg5QW44b21TXJSDpbD5jBkheTuwD",
    price: 1.2,
  },
  {
    trackId: "hash-rate",
    storageProvider: "arweave",
    tokenGated: false,
    collectibleEnabled: true,
    royaltySplit: [{ wallet: "2fRTtg8JX77e33TXJSDpbD5jBkheTuwE", percentage: 100 }],
    ownerWallet: "2fRTtg8JX77e33TXJSDpbD5jBkheTuwE",
  },
  {
    trackId: "genesis-block",
    storageProvider: "ipfs",
    tokenGated: true,
    collectibleEnabled: true,
    tokenAddress: "3zKPtg7EX65d97TXJSDpbD5jBkheTuwC",
    royaltyContract: "RoyaltyV1kP4r7tYbN2xW9qLc",
    royaltySplit: [{ wallet: "2fRTtg8JX77e33TXJSDpbD5jBkheTuwE", percentage: 100 }],
    ownerWallet: "2fRTtg8JX77e33TXJSDpbD5jBkheTuwE",
    price: 0.8,
  },
];

const byTrackId = new Map(ownershipRecords.map((o) => [o.trackId, o]));

export function getOwnershipByTrackId(trackId: string): Ownership | undefined {
  return byTrackId.get(trackId);
}

/** Registers ownership for tracks created at runtime (e.g. uploads). */
export function registerOwnership(record: Ownership): void {
  byTrackId.set(record.trackId, record);
}

export { ownershipRecords };
