import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { catalogQueryKey, catalogQueryOptions } from "@/domain/music/queries";
import type { Track } from "@/domain/music/types";
import { useAuth } from "@/lib/auth";

const sel = (s: string): string => s;

interface EngagementRow {
  track_id: string;
}

interface LibraryContextValue {
  /** Every published track, newest first. */
  allTracks: Track[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  /** Repost counters live outside the Track model. */
  repostCounts: Record<string, number>;
  likedIds: string[];
  repostedIds: string[];
  toggleLike: (id: string) => void;
  toggleRepost: (id: string) => void;
  /** True while the visitor cannot engage because they are signed out. */
  canEngage: boolean;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

const likesKey = (userId: string | null) => ["me", "likes", userId] as const;
const repostsKey = (userId: string | null) => ["me", "reposts", userId] as const;

export function LibraryProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const catalog = useQuery(catalogQueryOptions());

  const likes = useQuery({
    queryKey: likesKey(userId),
    enabled: userId != null,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("likes")
        .select(sel("track_id"))
        .eq("user_id", userId!);
      if (error) throw error;
      return ((data as EngagementRow[]) ?? []).map((row) => row.track_id);
    },
  });

  const reposts = useQuery({
    queryKey: repostsKey(userId),
    enabled: userId != null,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reposts")
        .select(sel("track_id"))
        .eq("user_id", userId!);
      if (error) throw error;
      return ((data as EngagementRow[]) ?? []).map((row) => row.track_id);
    },
  });

  const likedIds = likes.data ?? [];
  const repostedIds = reposts.data ?? [];

  const engagementMutation = useMutation({
    mutationFn: async ({
      table,
      trackId,
      remove,
    }: {
      table: "likes" | "reposts";
      trackId: string;
      remove: boolean;
    }) => {
      if (!userId) throw new Error("Sign in to do that");
      if (remove) {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq("user_id", userId)
          .eq("track_id", trackId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table).insert({ user_id: userId, track_id: trackId });
        if (error) throw error;
      }
    },
    // Optimistic: flip the id in the user's list immediately.
    onMutate: async ({ table, trackId, remove }) => {
      const key = table === "likes" ? likesKey(userId) : repostsKey(userId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<string[]>(key) ?? [];
      queryClient.setQueryData<string[]>(
        key,
        remove ? previous.filter((id) => id !== trackId) : [trackId, ...previous],
      );
      return { key, previous };
    },
    onError: (error, _vars, context) => {
      if (context) queryClient.setQueryData(context.key, context.previous);
      toast.error(error instanceof Error ? error.message : "That didn't save");
    },
    onSettled: (_data, _error, _vars, context) => {
      if (context) void queryClient.invalidateQueries({ queryKey: context.key });
      void queryClient.invalidateQueries({ queryKey: catalogQueryKey });
    },
  });

  const requireAuth = useCallback((): boolean => {
    if (userId) return true;
    toast.error("Sign in to save likes and reposts", {
      description: "Head to the sign-in page to create an account.",
    });
    return false;
  }, [userId]);

  const toggleLike = useCallback(
    (id: string) => {
      if (!requireAuth()) return;
      engagementMutation.mutate({ table: "likes", trackId: id, remove: likedIds.includes(id) });
    },
    [engagementMutation, likedIds, requireAuth],
  );

  const toggleRepost = useCallback(
    (id: string) => {
      if (!requireAuth()) return;
      engagementMutation.mutate({
        table: "reposts",
        trackId: id,
        remove: repostedIds.includes(id),
      });
    },
    [engagementMutation, repostedIds, requireAuth],
  );

  const value = useMemo<LibraryContextValue>(
    () => ({
      allTracks: catalog.data?.tracks ?? [],
      repostCounts: catalog.data?.repostCounts ?? {},
      isLoading: catalog.isPending,
      error: catalog.error,
      refetch: () => void catalog.refetch(),
      likedIds,
      repostedIds,
      toggleLike,
      toggleRepost,
      canEngage: userId != null,
    }),
    [catalog, likedIds, repostedIds, toggleLike, toggleRepost, userId],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used within a LibraryProvider");
  return ctx;
}
