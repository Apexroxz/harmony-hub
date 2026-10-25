import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_PLATFORMS = new Set(["macos", "windows", "linux", "android", "ios", "web"]);
const ALLOWED_CHANNELS = new Set(["stable", "beta", "dev"]);

interface SemVer {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
}

/**
 * Parses semantic versions including prerelease suffixes (e.g., '1.0.0-offline', '1.0.1-beta.1', 'v1.0.0').
 */
function parseSemVer(v: string): SemVer | null {
  if (!v || typeof v !== "string") return null;
  const clean = v.trim().replace(/^v/i, "");
  const dashIdx = clean.indexOf("-");
  let core = clean;
  let prerelease: string | undefined = undefined;

  if (dashIdx !== -1) {
    core = clean.slice(0, dashIdx);
    prerelease = clean.slice(dashIdx + 1).toLowerCase();
  }

  const parts = core.split(".").map((p) => parseInt(p, 10));
  if (parts.some(isNaN) || parts.length < 1 || parts.length > 3) return null;

  return {
    major: parts[0] ?? 0,
    minor: parts[1] ?? 0,
    patch: parts[2] ?? 0,
    prerelease,
  };
}

/**
 * Compares two semantic version strings.
 * Returns:
 *   > 0 if vA > vB
 *   < 0 if vA < vB
 *   0 if vA === vB
 *
 * Interpretation for '-offline' tag:
 * In standard SemVer rules, a prerelease/tag version (e.g. '1.0.0-offline')
 * has lower precedence than the final official release ('1.0.0').
 * When comparing '1.0.0-offline' with '1.0.0-offline', they are equal.
 */
function compareSemVer(vAStr: string, vBStr: string): number {
  const a = parseSemVer(vAStr);
  const b = parseSemVer(vBStr);

  if (!a || !b) return vAStr.localeCompare(vBStr);

  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;

  // Handle prerelease comparison
  if (a.prerelease && !b.prerelease) return -1;
  if (!a.prerelease && b.prerelease) return 1;
  if (a.prerelease && b.prerelease) {
    return a.prerelease.localeCompare(b.prerelease);
  }

  return 0;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed. Only POST is accepted." }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON request body." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { current_version, platform, channel } = body || {};

    // ── 1. Validate current_version ──
    if (!current_version || typeof current_version !== "string" || !parseSemVer(current_version)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid or missing 'current_version'. Must be a valid semantic version string.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── 2. Validate platform ──
    const targetPlatform = typeof platform === "string" ? platform.toLowerCase().trim() : "web";
    if (!ALLOWED_PLATFORMS.has(targetPlatform)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid platform '${targetPlatform}'. Must be one of: ${Array.from(ALLOWED_PLATFORMS).join(", ")}.`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── 3. Validate channel ──
    const targetChannel = typeof channel === "string" ? channel.toLowerCase().trim() : "stable";
    if (!ALLOWED_CHANNELS.has(targetChannel)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid channel '${targetChannel}'. Must be one of: ${Array.from(ALLOWED_CHANNELS).join(", ")}.`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── 4. Query active releases from Supabase ──
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("[check-update] Missing Supabase environment configuration");
      return new Response(
        JSON.stringify({ success: false, error: "Backend service configuration error." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: releases, error: dbError } = await supabase
      .from("app_releases")
      .select(
        "version, platform, channel, release_title, release_notes, published_at, download_url, installer_type, sha256, signature, minimum_supported_version",
      )
      .eq("platform", targetPlatform)
      .eq("channel", targetChannel)
      .eq("is_active", true)
      .order("published_at", { ascending: false });

    if (dbError) {
      console.error("[check-update] Database query error:", dbError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to query releases." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // If no releases exist for this platform/channel yet, return clean up-to-date response
    if (!releases || releases.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          current_version,
          latest_version: current_version,
          update_available: false,
          update_required: false,
          release: null,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Find the newest version using semantic version ordering
    const sortedReleases = [...releases].sort((a, b) => compareSemVer(b.version, a.version));
    const latestRelease = sortedReleases[0];

    const isNewer = compareSemVer(latestRelease.version, current_version) > 0;
    const isRequired =
      Boolean(latestRelease.minimum_supported_version) &&
      compareSemVer(current_version, latestRelease.minimum_supported_version!) < 0;

    return new Response(
      JSON.stringify({
        success: true,
        current_version,
        latest_version: latestRelease.version,
        update_available: isNewer,
        update_required: isRequired,
        release: {
          version: latestRelease.version,
          channel: latestRelease.channel,
          release_title: latestRelease.release_title,
          release_notes: latestRelease.release_notes,
          published_at: latestRelease.published_at,
          download_url: latestRelease.download_url,
          installer_type: latestRelease.installer_type,
          sha256: latestRelease.sha256,
          signature: latestRelease.signature,
          minimum_supported_version: latestRelease.minimum_supported_version,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: any) {
    console.error("[check-update] Unexpected error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
