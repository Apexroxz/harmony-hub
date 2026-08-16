import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_CATEGORIES = new Set(["general", "audio_dsp", "bug", "idea"]);
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const MAX_MESSAGE_LENGTH = 5000;
const MAX_EMAIL_LENGTH = 255;
const MAX_STRING_FIELD_LENGTH = 50;

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
    // Basic payload size guard (max ~50 KB)
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 50 * 1024) {
      return new Response(
        JSON.stringify({ success: false, error: "Payload exceeds maximum allowed size (50KB)." }),
        {
          status: 413,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON body." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const {
      category,
      message,
      email,
      app_version,
      platform,
      os_version,
    } = body || {};

    // ── 1. Validate Category ──
    if (!category || typeof category !== "string" || !ALLOWED_CATEGORIES.has(category)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid category. Must be one of: ${Array.from(ALLOWED_CATEGORIES).join(", ")}.`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── 2. Validate Message ──
    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Message is required and must be a string." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length < 1) {
      return new Response(
        JSON.stringify({ success: false, error: "Message cannot be empty." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Message is too long. Maximum length is ${MAX_MESSAGE_LENGTH} characters.`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── 3. Validate Optional Email ──
    let sanitizedEmail: string | null = null;
    if (email !== undefined && email !== null && typeof email === "string" && email.trim().length > 0) {
      const trimmedEmail = email.trim();
      if (trimmedEmail.length > MAX_EMAIL_LENGTH || !EMAIL_REGEX.test(trimmedEmail)) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid email format." }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      sanitizedEmail = trimmedEmail;
    }

    // ── 4. Sanitize Context Metadata ──
    const sanitizedAppVersion =
      typeof app_version === "string" && app_version.trim().length > 0
        ? app_version.trim().slice(0, MAX_STRING_FIELD_LENGTH)
        : "1.0.0-offline";

    const sanitizedPlatform =
      typeof platform === "string" && platform.trim().length > 0
        ? platform.trim().slice(0, MAX_STRING_FIELD_LENGTH)
        : "web";

    const sanitizedOsVersion =
      typeof os_version === "string" && os_version.trim().length > 0
        ? os_version.trim().slice(0, MAX_STRING_FIELD_LENGTH)
        : null;

    // ── 5. Insert Record into Supabase ──
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[submit-feedback] Missing Supabase environment configuration");
      return new Response(
        JSON.stringify({ success: false, error: "Backend service configuration error." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: insertError } = await supabase.from("feedback").insert({
      category,
      message: trimmedMessage,
      email: sanitizedEmail,
      app_version: sanitizedAppVersion,
      platform: sanitizedPlatform,
      os_version: sanitizedOsVersion,
      status: "open",
    });

    if (insertError) {
      console.error("[submit-feedback] Database insert error:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to record feedback." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Feedback submitted successfully.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: any) {
    console.error("[submit-feedback] Unexpected error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
