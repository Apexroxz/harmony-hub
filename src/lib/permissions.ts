/**
 * Layam Platform Role-Based Access Control (RBAC) & Permission Engine
 * 
 * Defines standard system roles, role hierarchies, and granular permission checking
 * for both client-side UI guards and server-side authorization middleware.
 */

export const SYSTEM_ROLES = [
  "listener",
  "creator",
  "moderator",
  "content_admin",
  "finance_admin",
  "admin",
  "super_admin",
] as const;

export type SystemRole = (typeof SYSTEM_ROLES)[number];

// Backward-compatible alias mapping:
// "artist" -> "creator"
// "developer" -> "super_admin"
export type LegacyRole = "artist" | "developer";
export type UserRole = SystemRole | LegacyRole;

export type AdminRole = "moderator" | "content_admin" | "finance_admin" | "super_admin";

export type AdminPermission =
  | "moderate_content"
  | "manage_users"
  | "verify_creators"
  | "view_financials"
  | "manage_catalog"
  | "manage_platform_settings";

export type Permission =
  | "play:stream"
  | "play:offline"
  | "social:like"
  | "social:repost"
  | "social:comment"
  | "store:purchase"
  | "creator:upload"
  | "creator:splits"
  | "creator:dashboard"
  | "creator:cashout"
  | "creator:stems"
  | "mod:flag"
  | "mod:delete_comment"
  | "mod:unpublish_track"
  | "admin:verify_artist"
  | "admin:manage_catalog"
  | "admin:audit_logs"
  | "super:bypass_all"
  | "super:manage_roles"
  | AdminPermission;

/**
 * Maps legacy/alias role names to canonical SystemRole.
 */
export function normalizeRole(role?: string | null): SystemRole {
  if (!role) return "listener";
  const lower = role.toLowerCase().trim();
  if (lower === "artist") return "creator";
  if (lower === "developer") return "super_admin";
  if (SYSTEM_ROLES.includes(lower as SystemRole)) {
    return lower as SystemRole;
  }
  return "listener";
}

/**
 * Numeric hierarchy for role comparison (higher number = greater privileges).
 */
export const ROLE_HIERARCHY: Record<SystemRole, number> = {
  listener: 10,
  creator: 20,
  moderator: 30,
  content_admin: 35,
  finance_admin: 38,
  admin: 40,
  super_admin: 50,
};

/**
 * Permission matrix defining capabilities granted to each role tier.
 */
export const ROLE_PERMISSIONS: Record<SystemRole, Permission[]> = {
  listener: [
    "play:stream",
    "play:offline",
    "social:like",
    "social:repost",
    "social:comment",
    "store:purchase",
  ],
  creator: [
    "play:stream",
    "play:offline",
    "social:like",
    "social:repost",
    "social:comment",
    "store:purchase",
    "creator:upload",
    "creator:splits",
    "creator:dashboard",
    "creator:cashout",
    "creator:stems",
  ],
  moderator: [
    "play:stream",
    "play:offline",
    "social:like",
    "social:repost",
    "social:comment",
    "store:purchase",
    "mod:flag",
    "mod:delete_comment",
    "mod:unpublish_track",
    "moderate_content",
  ],
  content_admin: [
    "play:stream",
    "play:offline",
    "social:like",
    "social:repost",
    "social:comment",
    "store:purchase",
    "creator:upload",
    "creator:dashboard",
    "mod:flag",
    "mod:delete_comment",
    "mod:unpublish_track",
    "admin:verify_artist",
    "admin:manage_catalog",
    "moderate_content",
    "verify_creators",
    "manage_catalog",
  ],
  finance_admin: [
    "play:stream",
    "play:offline",
    "social:like",
    "social:repost",
    "social:comment",
    "store:purchase",
    "creator:dashboard",
    "creator:cashout",
    "view_financials",
    "admin:audit_logs",
  ],
  admin: [
    "play:stream",
    "play:offline",
    "social:like",
    "social:repost",
    "social:comment",
    "store:purchase",
    "creator:upload",
    "creator:splits",
    "creator:dashboard",
    "creator:cashout",
    "creator:stems",
    "mod:flag",
    "mod:delete_comment",
    "mod:unpublish_track",
    "admin:verify_artist",
    "admin:manage_catalog",
    "admin:audit_logs",
    "moderate_content",
    "manage_users",
    "verify_creators",
    "view_financials",
    "manage_catalog",
    "manage_platform_settings",
  ],
  super_admin: [
    "play:stream",
    "play:offline",
    "social:like",
    "social:repost",
    "social:comment",
    "store:purchase",
    "creator:upload",
    "creator:splits",
    "creator:dashboard",
    "creator:cashout",
    "creator:stems",
    "mod:flag",
    "mod:delete_comment",
    "mod:unpublish_track",
    "admin:verify_artist",
    "admin:manage_catalog",
    "admin:audit_logs",
    "moderate_content",
    "manage_users",
    "verify_creators",
    "view_financials",
    "manage_catalog",
    "manage_platform_settings",
    "super:bypass_all",
    "super:manage_roles",
  ],
};

/**
 * Checks if a given role meets or exceeds the required target role in the hierarchy.
 */
export function hasRole(currentRole: UserRole | undefined | null, requiredRole: UserRole): boolean {
  const normCurrent = normalizeRole(currentRole);
  const normRequired = normalizeRole(requiredRole);
  return ROLE_HIERARCHY[normCurrent] >= ROLE_HIERARCHY[normRequired];
}

/**
 * Checks if a role is granted a specific permission.
 */
export function hasPermission(currentRole: UserRole | undefined | null, permission: Permission): boolean {
  const norm = normalizeRole(currentRole);
  // Super admin possesses all permissions
  if (norm === "super_admin") return true;
  const perms = ROLE_PERMISSIONS[norm] ?? [];
  return perms.includes(permission);
}

/**
 * Convenience role helpers
 */
export function isListenerRole(role?: UserRole | null): boolean {
  return normalizeRole(role) === "listener";
}

export function isCreatorRole(role?: UserRole | null): boolean {
  const norm = normalizeRole(role);
  return norm === "creator" || norm === "admin" || norm === "super_admin";
}

export function isModeratorRole(role?: UserRole | null): boolean {
  const norm = normalizeRole(role);
  return norm === "moderator" || norm === "admin" || norm === "super_admin";
}

export function isAdminRole(role?: UserRole | null): boolean {
  const norm = normalizeRole(role);
  return norm === "admin" || norm === "super_admin";
}

export function isSuperAdminRole(role?: UserRole | null): boolean {
  return normalizeRole(role) === "super_admin";
}
