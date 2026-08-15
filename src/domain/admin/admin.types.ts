export type AdminRole = "moderator" | "content_admin" | "finance_admin" | "super_admin";

export type AdminPermission =
  | "moderate_content"
  | "manage_users"
  | "verify_creators"
  | "view_financials"
  | "manage_catalog"
  | "manage_platform_settings";

export interface AdminPermissionRecord {
  id: string;
  userId: string;
  role: AdminRole;
  permissions: AdminPermission[];
  grantedBy?: string | null;
  createdAt: string;
}

export interface AdminAuditLog {
  id: string;
  adminId: string | null;
  adminEmail?: string;
  adminName?: string;
  action: string;
  resourceType: "user" | "creator" | "track" | "report" | "payout" | "setting";
  resourceId: string;
  metadata: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

export type ModerationReportStatus = "open" | "under_review" | "resolved" | "dismissed";

export interface ModerationReport {
  id: string;
  reporterId: string | null;
  reporterName?: string;
  resourceType: "track" | "user" | "comment" | "creator";
  resourceId: string;
  resourceTitle?: string;
  reason: "copyright" | "explicit" | "spam" | "harassment" | "fraud" | "other";
  description?: string;
  status: ModerationReportStatus;
  resolvedBy?: string | null;
  resolutionNotes?: string;
  resolvedAt?: string | null;
  createdAt: string;
}

export interface AdminUserRecord {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: string;
  status: "active" | "suspended" | "pending";
  createdAt: string;
  lastActiveAt?: string;
  streamsCount: number;
  tipsGivenCount: number;
}

export interface AdminCreatorRecord {
  id: string;
  name: string;
  avatar: string;
  verified: boolean;
  status: "active" | "under_review" | "suspended";
  tracksCount: number;
  totalStreams: number;
  royaltyEarnedUsd: number;
  subscribersCount: number;
  joinedAt: string;
}

export interface PlatformOverviewMetrics {
  totalUsers: number;
  activeListeners: number;
  totalCreators: number;
  totalTracks: number;
  totalStreams: number;
  grossRevenueUsd: number;
  pendingPayoutsUsd: number;
  openReportsCount: number;
  auditEventsCount: number;
}
