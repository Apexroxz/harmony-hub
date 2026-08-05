import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Play counting runs server-side so the counter cannot be written directly by
 * clients and no publicly callable database function has to be exposed.
 */
export const recordPlay = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ trackId: z.string().min(1).max(200) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error: readError } = await supabaseAdmin
      .from("tracks")
      .select("play_count")
      .eq("id", data.trackId)
      .maybeSingle();
    if (readError) throw readError;
    if (!row) return { playCount: 0 };

    const next = (row.play_count ?? 0) + 1;
    const { error: writeError } = await supabaseAdmin
      .from("tracks")
      .update({ play_count: next })
      .eq("id", data.trackId);
    if (writeError) throw writeError;

    return { playCount: next };
  });
