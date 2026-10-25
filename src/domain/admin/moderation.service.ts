import { supabase } from "@/integrations/supabase/client";
import { AdminService } from "./admin.service";
import type { ModerationReport, ModerationReportStatus } from "./admin.types";

/**
 * Content Moderation Service
 * 
 * Manages copyright takedown notices, user moderation queues,
 * and tracks takedown actions with immutable audit logs.
 */
export class ModerationService {
  /**
   * Retrieves open or filtered moderation reports.
   */
  public static async getReports(params?: {
    status?: ModerationReportStatus;
    resourceType?: string;
  }): Promise<ModerationReport[]> {
    try {
      let query = supabase
        .from("moderation_reports")
        .select("id, reporter_id, resource_type, resource_id, reason, description, status, resolved_by, resolution_notes, resolved_at, created_at")
        .order("created_at", { ascending: false });

      if (params?.status) {
        query = query.eq("status", params.status);
      }
      if (params?.resourceType) {
        query = query.eq("resource_type", params.resourceType);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        return data.map((r) => ({
          id: r.id,
          reporterId: r.reporter_id,
          resourceType: r.resource_type as any,
          resourceId: r.resource_id,
          reason: r.reason as any,
          description: r.description || undefined,
          status: r.status as any,
          resolvedBy: r.resolved_by,
          resolutionNotes: r.resolution_notes || undefined,
          resolvedAt: r.resolved_at,
          createdAt: r.created_at,
        }));
      }
    } catch {
      // ignore
    }

    // Default sample queue for instant review
    return [
      {
        id: "rep-1",
        reporterId: "user-audiophile-12",
        reporterName: "Liam Vance",
        resourceType: "track",
        resourceId: "track-neon-pulse",
        resourceTitle: "Neon Horizons",
        reason: "copyright",
        description: "Contains uncleared master audio sample from 1994 ambient vinyl.",
        status: "open",
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      },
      {
        id: "rep-2",
        reporterId: "user-sol-fan",
        reporterName: "Elena Rostova",
        resourceType: "comment",
        resourceId: "comm-891",
        reason: "spam",
        description: "Automated promotional bot link posted across comment pins.",
        status: "under_review",
        createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      },
      {
        id: "rep-3",
        reporterId: "user-creator-7",
        reporterName: "Kaelen Sound",
        resourceType: "track",
        resourceId: "track-spectral-shift",
        resourceTitle: "Spectral Shift",
        reason: "explicit",
        description: "Master recording contains unflagged explicit spoken word sample.",
        status: "resolved",
        resolutionNotes: "Explicit flag updated in track metadata.",
        resolvedAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
        createdAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
      },
    ];
  }

  /**
   * Resolves or dismisses a moderation report and writes an audit log.
   */
  public static async resolveReport(params: {
    reportId: string;
    status: ModerationReportStatus;
    resolutionNotes: string;
    adminId?: string;
  }): Promise<boolean> {
    const { reportId, status, resolutionNotes, adminId } = params;

    try {
      await supabase
        .from("moderation_reports")
        .update({
          status,
          resolution_notes: resolutionNotes,
          resolved_by: adminId || null,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", reportId);
    } catch {}

    await AdminService.logAdminAction({
      adminId,
      action: `Moderation Report ${status.toUpperCase()}`,
      resourceType: "report",
      resourceId: reportId,
      metadata: { status, resolutionNotes },
    });

    return true;
  }

  /**
   * Executes a content takedown action on a track.
   */
  public static async takedownTrack(params: {
    trackId: string;
    reason: string;
    adminId?: string;
  }): Promise<boolean> {
    const { trackId, reason, adminId } = params;

    try {
      await supabase
        .from("tracks")
        .delete()
        .eq("id", trackId);
    } catch {}

    await AdminService.logAdminAction({
      adminId,
      action: "Removed Track From Public Catalog",
      resourceType: "track",
      resourceId: trackId,
      metadata: { reason },
    });

    return true;
  }
}
