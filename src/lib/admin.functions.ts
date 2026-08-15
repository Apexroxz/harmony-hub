import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { AdminService } from "@/domain/admin/admin.service";
import { ModerationService } from "@/domain/admin/moderation.service";
import { AdminAnalyticsService } from "@/domain/admin/admin-analytics.service";

/**
 * Server Functions for Admin Control Plane
 */

export const getAdminOverviewFn = createServerFn({ method: "GET" })
  .handler(async () => {
    return AdminAnalyticsService.getPlatformOverview();
  });

export const getAdminUsersFn = createServerFn({ method: "GET" })
  .validator((input: { query?: string }) => input)
  .handler(async ({ data }) => {
    return AdminService.getUsersList(data?.query);
  });

export const getAdminCreatorsFn = createServerFn({ method: "GET" })
  .handler(async () => {
    return AdminService.getCreatorsList();
  });

export const updateUserStatusFn = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        userId: z.string().min(1),
        status: z.enum(["active", "suspended"]),
        reason: z.string().min(1),
        adminId: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    return AdminService.updateUserStatus(data);
  });

export const verifyCreatorFn = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        creatorId: z.string().min(1),
        verified: z.boolean(),
        adminId: z.string().optional(),
        notes: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    return AdminService.verifyCreator(data);
  });

export const getModerationReportsFn = createServerFn({ method: "GET" })
  .validator((input: { status?: "open" | "under_review" | "resolved" | "dismissed" }) => input)
  .handler(async ({ data }) => {
    return ModerationService.getReports({ status: data?.status });
  });

export const resolveReportFn = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        reportId: z.string().min(1),
        status: z.enum(["open", "under_review", "resolved", "dismissed"]),
        resolutionNotes: z.string().min(1),
        adminId: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    return ModerationService.resolveReport(data);
  });

export const takedownTrackFn = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        trackId: z.string().min(1),
        reason: z.string().min(1),
        adminId: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    return ModerationService.takedownTrack(data);
  });

export const getAdminAuditLogsFn = createServerFn({ method: "GET" })
  .validator((input: { limit?: number; resourceType?: string }) => input)
  .handler(async ({ data }) => {
    return AdminService.getAuditLogs(data);
  });
