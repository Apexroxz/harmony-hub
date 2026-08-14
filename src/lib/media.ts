import { supabase } from "@/integrations/supabase/client";

/** Signed links live long enough for a listening session. */
const SIGNED_TTL_SECONDS = 60 * 60 * 6;

const memo = new Map<string, string>();

/**
 * Resolves storage object paths to signed URLs in one round trip per bucket.
 * Both media buckets are private, so every playable/renderable URL is signed.
 */
export async function signedUrls(
  bucket: "covers" | "audio",
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
  }

  return resolved;
}

/** Uploads a file and returns its storage path. */
export async function uploadMedia(
  bucket: "covers" | "audio",
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
