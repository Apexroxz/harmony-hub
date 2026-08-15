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
      userAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
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
      userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
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
      userAvatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80",
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
      userAvatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80",
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
      userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
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
      userAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      timestampSeconds: 45,
      content: "Vocals are crisp and warm, perfectly placed in the stereo field.",
      createdAt: "2026-08-13",
      likes: 21,
    },
  ],
};

export function getCommentsForTrack(trackId: string): TrackComment[] {
  let customMap: Record<string, TrackComment[]> = {};
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(COMMENTS_STORAGE_KEY);
      if (stored) customMap = JSON.parse(stored) as Record<string, TrackComment[]>;
    } catch {
      // ignore
    }
  }

  const defaults = DEFAULT_COMMENTS[trackId] ?? [];
  const custom = customMap[trackId] ?? [];

  // Merge and sort by timestamp in track
  const all = [...custom, ...defaults];
  const unique = new Map<string, TrackComment>();
  for (const c of all) {
    unique.set(c.id, c);
  }

  return Array.from(unique.values()).sort((a, b) => a.timestampSeconds - b.timestampSeconds);
}

export function addCommentToTrack(
  trackId: string,
  timestampSeconds: number,
  content: string,
  userName: string,
  userAvatar?: string,
): TrackComment {
  const newComment: TrackComment = {
    id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    trackId,
    userId: `user-${Date.now()}`,
    userName: userName || "Anonymous Listener",
    userAvatar: userAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    timestampSeconds: Math.max(0, Math.round(timestampSeconds)),
    content: content.trim(),
    createdAt: new Date().toISOString().slice(0, 10),
    likes: 0,
  };

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(COMMENTS_STORAGE_KEY);
      const customMap = stored ? (JSON.parse(stored) as Record<string, TrackComment[]>) : {};
      const trackComments = customMap[trackId] ?? [];
      customMap[trackId] = [newComment, ...trackComments];
      localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(customMap));
    } catch {
      // ignore
    }
  }

  return newComment;
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
