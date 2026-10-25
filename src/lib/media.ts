import { supabase } from "@/integrations/supabase/client";

export const PUBLIC_BUCKETS = ["covers", "previews"] as const;
export const PRIVATE_BUCKETS = ["audio", "stems", "vault"] as const;

export type MediaBucket =
  | (typeof PUBLIC_BUCKETS)[number]
  | (typeof PRIVATE_BUCKETS)[number];

/** Signed links TTL for private streaming sessions (6 hours default). */
const SIGNED_TTL_SECONDS = 60 * 60 * 6;

const memo = new Map<string, string>();

/**
 * Resolves storage object paths to accessible URLs.
 * - Public buckets ("covers", "previews"): uses fast public CDN URLs.
 * - Private buckets ("audio", "stems", "vault"): generates cryptographically signed URLs.
 */
export async function signedUrls(
  bucket: MediaBucket,
  paths: string[],
): Promise<Map<string, string>> {
  const resolved = new Map<string, string>();
  const unique = Array.from(new Set(paths.filter(Boolean)));
  const missing: string[] = [];

  for (const path of unique) {
    const cached = memo.get(`${bucket}:${path}`);
    if (cached) resolved.set(path, cached);
    else missing.push(path);
  }

  if (missing.length > 0) {
    if (bucket === "covers" || bucket === "previews") {
      // Fast path for public buckets
      for (const path of missing) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        if (data?.publicUrl) {
          memo.set(`${bucket}:${path}`, data.publicUrl);
          resolved.set(path, data.publicUrl);
        }
      }
    } else {
      // Private bucket batch signed URL generation
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrls(missing, SIGNED_TTL_SECONDS);
        if (error) throw error;
        for (const entry of data ?? []) {
          if (entry.path && entry.signedUrl) {
            memo.set(`${bucket}:${entry.path}`, entry.signedUrl);
            resolved.set(entry.path, entry.signedUrl);
          }
        }
      } catch (err) {
        console.warn(`[MediaService] Error signing URLs for bucket "${bucket}":`, err);
      }
    }
  }

  return resolved;
}

/**
 * Uploads a media asset to the designated public or private storage bucket.
 */
export async function uploadMedia(
  bucket: MediaBucket,
  path: string,
  file: File,
): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    ...(file.type ? { contentType: file.type } : {}),
    upsert: false,
  });
  if (error) throw error;
  return path;
}
