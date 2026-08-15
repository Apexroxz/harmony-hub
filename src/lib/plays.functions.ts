import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

/**
 * In-Memory Sliding Window Rate Limiter for Audio Stream Accounting.
 * Protects against automated play-count inflation and bot looping.
 */
interface PlayRecord {
  lastPlayedAt: number;
  playCountWindow: number;
  windowStart: number;
}

// Map: `${clientIdentifier}:${trackId}` -> PlayRecord
const playHistoryMap = new Map<string, PlayRecord>();

// Cleanup stale rate limit records every 10 minutes
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupStaleRecords(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  const maxAge = 15 * 60 * 1000; // 15 mins
  for (const [key, record] of playHistoryMap.entries()) {
    if (now - record.lastPlayedAt > maxAge) {
      playHistoryMap.delete(key);
    }
  }
}

/**
 * Track Play Request Validation Schema
 */
const RecordPlaySchema = z.object({
  trackId: z
    .string()
    .trim()
    .min(1, "Track ID is required")
    .max(128, "Track ID exceeds maximum length")
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid track ID format"),
  durationSec: z.number().min(0).max(86400).optional(),
  sessionToken: z.string().max(128).optional(),
});

export const recordPlay = createServerFn({ method: "POST" })
  .inputValidator((input) => RecordPlaySchema.parse(input))
  .handler(async ({ data }) => {
    const now = Date.now();
    cleanupStaleRecords(now);

    // Extract client identifier from request headers or IP
    let clientKey = "anon";
    try {
      const request = getRequest();
      if (request?.headers) {
        const clientIp =
          request.headers.get("cf-connecting-ip") ||
          request.headers.get("x-real-ip") ||
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          "local";
        const authHeader = request.headers.get("authorization") || "";
        clientKey = `${clientIp}:${authHeader.slice(-16)}`;
      }
    } catch {
      // In non-HTTP or isolated execution contexts
      clientKey = data.sessionToken ? `token:${data.sessionToken.slice(0, 16)}` : "global-anon";
    }

    const rateKey = `${clientKey}:${data.trackId}`;
    const existing = playHistoryMap.get(rateKey);

    // Cooldown rule: Reject rapid duplicate plays of the same track within 10 seconds
    const MIN_PLAY_COOLDOWN_MS = 10_000;
    if (existing && now - existing.lastPlayedAt < MIN_PLAY_COOLDOWN_MS) {
      return {
        success: true,
        throttled: true,
        reason: "cooldown_active",
        cooldownRemainingSec: Math.ceil((MIN_PLAY_COOLDOWN_MS - (now - existing.lastPlayedAt)) / 1000),
      };
    }

    // Velocity rule: Max 20 recorded plays per client/IP per 5-minute rolling window
    const WINDOW_DURATION_MS = 5 * 60 * 1000;
    const MAX_PLAYS_PER_WINDOW = 25;

    if (!existing || now - existing.windowStart > WINDOW_DURATION_MS) {
      playHistoryMap.set(rateKey, {
        lastPlayedAt: now,
        playCountWindow: 1,
        windowStart: now,
      });
    } else {
      if (existing.playCountWindow >= MAX_PLAYS_PER_WINDOW) {
        return {
          success: true,
          throttled: true,
          reason: "rate_limit_exceeded",
          cooldownRemainingSec: Math.ceil((WINDOW_DURATION_MS - (now - existing.windowStart)) / 1000),
        };
      }
      existing.playCountWindow += 1;
      existing.lastPlayedAt = now;
    }

    // Persist verified stream to database via admin client
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error: readError } = await supabaseAdmin
      .from("tracks")
      .select("play_count")
      .eq("id", data.trackId)
      .maybeSingle();

    if (readError) {
      console.error("[RecordPlay] Database read error:", readError);
      throw new Error("Unable to fetch track play count");
    }

    if (!row) {
      return { success: true, playCount: 0, throttled: false };
    }

    const next = (row.play_count ?? 0) + 1;
    const { error: writeError } = await supabaseAdmin
      .from("tracks")
      .update({ play_count: next })
      .eq("id", data.trackId);

    if (writeError) {
      console.error("[RecordPlay] Database write error:", writeError);
      throw new Error("Unable to update track play count");
    }

    return { success: true, playCount: next, throttled: false };
  });

