export type OwnershipType = "master" | "publishing" | "collaborator" | "license";

export type SplitStatus = "pending" | "approved" | "rejected" | "archived";

export type RoyaltyEventType = "stream" | "purchase" | "tip" | "subscription" | "license";

export type PayoutProvider = "stripe" | "bank_transfer" | "usdc" | "solana";

export type PayoutStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

export interface CreatorAsset {
  id: string;
  trackId: string;
  creatorId: string;
  creatorName?: string;
  ownershipType: OwnershipType;
  percentage: number;
  createdAt: string;
}

export interface RevenueSplit {
  id: string;
  trackId: string;
  creatorId: string;
  creatorName?: string;
  percentage: number;
  status: SplitStatus;
  approvedAt?: string | null;
  createdAt: string;
}

export interface RoyaltyTransaction {
  id: string;
  trackId: string | null;
  creatorId: string;
  eventType: RoyaltyEventType;
  amount: number;
  currency: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ArtistTip {
  id: string;
  senderId?: string | null;
  senderName?: string;
  senderAvatar?: string;
  artistId: string;
  amount: number;
  currency: string;
  paymentMethod?: string;
  message?: string;
  createdAt: string;
}

export interface ArtistSubscription {
  id: string;
  userId: string;
  artistId: string;
  tier: string;
  status: "active" | "cancelled" | "past_due" | "paused";
  createdAt: string;
}

export interface PayoutAccount {
  id: string;
  creatorId: string;
  provider: PayoutProvider;
  accountStatus: "unverified" | "pending" | "verified" | "suspended";
  accountDetails?: Record<string, unknown>;
  verifiedAt?: string | null;
  createdAt: string;
}

export interface PayoutBatch {
  id: string;
  creatorId: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  processedAt?: string | null;
  createdAt: string;
}

export interface CreatorEarningsSummary {
  creatorId: string;
  totalStreams: number;
  grossRevenueUsd: number;
  availableBalanceUsd: number;
  pendingBalanceUsd: number;
  lifetimeEarningsUsd: number;
  activeTracksCount: number;
  subscribersCount: number;
  tipsReceivedCount: number;
  splitsSummary: {
    asMasterOwner: number;
    asCollaborator: number;
  };
}

export interface RevenueHistoryPoint {
  date: string;
  streamsRevenue: number;
  purchasesRevenue: number;
  tipsRevenue: number;
  subscriptionsRevenue: number;
  total: number;
}
