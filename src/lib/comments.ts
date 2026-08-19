import { supabase } from "@/integrations/supabase/client";

export interface TrackComment {
  id: string;
  trackId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  timestampSeconds: number;
  content: string;
  createdAt: string;
  likes: number;
}

const COMMENTS_STORAGE_KEY = "layam_track_comments";

const DEFAULT_COMMENTS: Record<string, TrackComment[]> = {
  "midnight-protocol": [
    {
      id: "c-1",
      trackId: "midnight-protocol",
      userId: "u-audiophile",
      userName: "Alex Rivers",
      userAvatar:
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
      timestampSeconds: 14,
      content: "That low frequency analog sub-bass is crystal clear on planar headphones! 🔥",
      createdAt: "2026-08-10",
      likes: 12,
    },
    {
      id: "c-2",
      trackId: "midnight-protocol",
      userId: "u-producer",
      userName: "Maya Lin",
      userAvatar:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
      timestampSeconds: 65,
      content: "The reverb decay on this synth lead is masterclass production.",
      createdAt: "2026-08-12",
      likes: 8,
    },
    {
      id: "c-3",
      trackId: "midnight-protocol",
      userId: "u-dj",
      userName: "Kaelen Voss",
      userAvatar:
        "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80",
      timestampSeconds: 124,
      content: "Drop is pure euphoria. Buying the 24-bit FLAC master right now!",
      createdAt: "2026-08-14",
      likes: 19,
    },
  ],
  "chain-reaction": [
    {
      id: "c-4",
      trackId: "chain-reaction",
      userId: "u-soundeng",
      userName: "Sarah Chen",
      userAvatar:
        "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80",
      timestampSeconds: 28,
      content: "96kHz/24-bit WAV master dynamic range is insane. Zero distortion!",
      createdAt: "2026-08-08",
      likes: 15,
    },
    {
      id: "c-5",
      trackId: "chain-reaction",
      userId: "u-synthfan",
      userName: "Dmitri K",
      userAvatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
      timestampSeconds: 105,
      content: "Spatial imaging here is wild in 3D binaural mode!",
      createdAt: "2026-08-11",
      likes: 7,
    },
  ],
  "phantom-waves": [
    {
      id: "c-6",
      trackId: "phantom-waves",
      userId: "u-vocalist",
      userName: "Elena Rostova",
      userAvatar:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      timestampSeconds: 45,
      content: "Vocals are crisp and warm, perfectly placed in the stereo field.",
      createdAt: "2026-08-13",
      likes: 21,
    },
  ],
};

function getLocalCachedComments(trackId: string): TrackComment[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(COMMENTS_STORAGE_KEY);
    if (!stored) return [];
    const map = JSON.parse(stored) as Record<string, TrackComment[]>;
    return map[trackId] ?? [];
  } catch {
    return [];
  }
}

function saveLocalCachedComment(comment: TrackComment): void {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(COMMENTS_STORAGE_KEY);
    const map = stored ? (JSON.parse(stored) as Record<string, TrackComment[]>) : {};
    const list = map[comment.trackId] ?? [];
    map[comment.trackId] = [comment, ...list];
    localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

/**
 * Fetches comments for a track from Supabase database with fallback to local cache.
 */
export async function fetchCommentsForTrack(trackId: string): Promise<TrackComment[]> {
  try {
    const { data: dbRows, error } = await supabase
      .from("comments")
      .select("id, body, timestamp_seconds, created_at, user_id")
      .eq("track_id", trackId)
      .order("timestamp_seconds", { ascending: true });

    if (error) throw error;

    if (dbRows && dbRows.length > 0) {
      // Fetch associated profiles
      const userIds = Array.from(new Set(dbRows.map((r) => r.user_id)));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

      const formatted: TrackComment[] = dbRows.map((row) => {
        const prof = profileMap.get(row.user_id);
        return {
          id: row.id,
          trackId,
          userId: row.user_id,
          userName: (prof as any)?.display_name || "Audiophile Member",
          userAvatar: (prof as any)?.avatar_url || undefined,
          timestampSeconds: row.timestamp_seconds ?? 0,
          content: row.body,
          createdAt: row.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
          likes: 0,
        };
      });

      // Merge with sample comments if present
      const defaults = DEFAULT_COMMENTS[trackId] ?? [];
      const combined = [...formatted, ...defaults];
      const unique = new Map<string, TrackComment>();
      for (const c of combined) unique.set(c.id, c);

      return Array.from(unique.values()).sort((a, b) => a.timestampSeconds - b.timestampSeconds);
    }
  } catch (err) {
    console.warn("[CommentsService] Database comments fetch note:", err);
  }

  // Fallback to local and sample comments
  const local = getLocalCachedComments(trackId);
  const defaults = DEFAULT_COMMENTS[trackId] ?? [];
  const combined = [...local, ...defaults];
  const unique = new Map<string, TrackComment>();
  for (const c of combined) unique.set(c.id, c);

  return Array.from(unique.values()).sort((a, b) => a.timestampSeconds - b.timestampSeconds);
}

/**
 * Synchronously retrieves cached/default comments.
 */
export function getCommentsForTrack(trackId: string): TrackComment[] {
  const local = getLocalCachedComments(trackId);
  const defaults = DEFAULT_COMMENTS[trackId] ?? [];
  const combined = [...local, ...defaults];
  const unique = new Map<string, TrackComment>();
  for (const c of combined) unique.set(c.id, c);

  return Array.from(unique.values()).sort((a, b) => a.timestampSeconds - b.timestampSeconds);
}

/**
 * Adds a new comment, persisting to Supabase and updating local cache.
 */
export async function postCommentToTrack(
  trackId: string,
  timestampSeconds: number,
  content: string,
  userInfo?: { id?: string; name?: string; avatarUrl?: string },
): Promise<TrackComment> {
  const cleanContent = content.trim();
  const clampedTimestamp = Math.max(0, Math.round(timestampSeconds));
  const tempId = `comment-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const newComment: TrackComment = {
    id: tempId,
    trackId,
    userId: userInfo?.id || `user-${Date.now()}`,
    userName: userInfo?.name || "Anonymous Listener",
    userAvatar:
      userInfo?.avatarUrl ||
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    timestampSeconds: clampedTimestamp,
    content: cleanContent,
    createdAt: new Date().toISOString().slice(0, 10),
    likes: 0,
  };

  // 1. Immediately cache locally
  saveLocalCachedComment(newComment);

  // 2. Persist to Supabase if authenticated user is available
  if (userInfo?.id && !userInfo.id.startsWith("demo-") && userInfo.id !== "guest") {
    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({
          track_id: trackId,
          user_id: userInfo.id,
          body: cleanContent,
          timestamp_seconds: clampedTimestamp,
        })
        .select("id, created_at")
        .maybeSingle();

      if (!error && data) {
        newComment.id = data.id;
        newComment.createdAt = data.created_at.slice(0, 10);
      }
    } catch (err) {
      console.warn("[CommentsService] Supabase insert note:", err);
    }
  }

  return newComment;
}

export function addCommentToTrack(
  trackId: string,
  timestampSeconds: number,
  content: string,
  userName: string,
  userAvatar?: string,
): TrackComment {
  const comment = {
    id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    trackId,
    userId: `user-${Date.now()}`,
    userName: userName || "Anonymous Listener",
    userAvatar:
      userAvatar ||
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    timestampSeconds: Math.max(0, Math.round(timestampSeconds)),
    content: content.trim(),
    createdAt: new Date().toISOString().slice(0, 10),
    likes: 0,
  };

  saveLocalCachedComment(comment);
  return comment;
}

export function likeTrackComment(trackId: string, commentId: string): void {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(COMMENTS_STORAGE_KEY);
    const customMap = stored ? (JSON.parse(stored) as Record<string, TrackComment[]>) : {};
    const trackComments = customMap[trackId] ?? [];
    const updated = trackComments.map((c) =>
      c.id === commentId ? { ...c, likes: c.likes + 1 } : c,
    );
    customMap[trackId] = updated;
    localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(customMap));
  } catch {
    // ignore
  }
}
