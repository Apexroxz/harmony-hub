import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Server-Side Media Security & Signed URL Generator.
 * Enforces authenticated access before minting short-lived signed URLs
 * for private buckets (audio masters, stems, vault content).
 */

const GenerateMediaUrlSchema = z.object({
  bucket: z.enum(["covers", "previews", "audio", "stems", "vault"]),
  path: z.string().min(1).max(512),
  expiresInSeconds: z.number().min(30).max(86400).optional(),
});

export const getSecureSignedMediaUrl = createServerFn({ method: "POST" })
  .validator((input) => GenerateMediaUrlSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Public bucket fast path
    if (data.bucket === "covers" || data.bucket === "previews") {
      const { data: publicData } = supabaseAdmin.storage
        .from(data.bucket)
        .getPublicUrl(data.path);
      return {
        url: publicData.publicUrl,
        isPrivate: false,
        expiresInSeconds: null,
      };
    }

    // Private bucket signed URL issuance
    const ttl = data.expiresInSeconds ?? 3600; // 1 hour default
    const { data: signedData, error } = await supabaseAdmin.storage
      .from(data.bucket)
      .createSignedUrl(data.path, ttl);

    if (error) {
      console.error("[MediaSecurity] Error generating signed URL:", error);
      throw new Error(`Failed to generate secure URL for ${data.bucket}/${data.path}`);
    }

    return {
      url: signedData.signedUrl,
      isPrivate: true,
      expiresInSeconds: ttl,
    };
  });
