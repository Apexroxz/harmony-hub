import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { Track } from "@/domain/music/types";

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number; // 0-100
  volume: number; // 0-1
  duration: number;
  currentTime: number;
  queue: Track[];
  queueIndex: number;
  playbackRate: number;
}

interface PlayerContextValue extends PlayerState {
  playTrack: (track: Track, queue?: Track[]) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  setVolume: (volume: number) => void;
  seek: (percent: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  playFromQueue: (index: number) => void;
  clearQueue: () => void;
  setPlaybackRate: (rate: number) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2] as const;

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PlayerState>({
    currentTrack: null,
    isPlaying: false,
    progress: 0,
    volume: 0.8,
    duration: 0,
    currentTime: 0,
    queue: [],
    queueIndex: -1,
    playbackRate: 1,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = stateRef.current.volume;
      audioRef.current.playbackRate = stateRef.current.playbackRate;
    }
    return audioRef.current;
  }, []);

  const load = useCallback(
    (track: Track, patch: Partial<PlayerState> = {}) => {
      const audio = ensureAudio();
      audio.pause();
      audio.src = track.audioUrl;
      audio.load();
      audio.playbackRate = stateRef.current.playbackRate;

      setState((s) => ({
        ...s,
        ...patch,
        currentTrack: track,
        isPlaying: true,
        progress: 0,
        currentTime: 0,
        duration: track.duration,
      }));

      audio.play()?.catch(() => {
        setState((s) => ({ ...s, isPlaying: false }));
      });
    },
    [ensureAudio]
  );

  const playTrack = useCallback(
    (track: Track, queue?: Track[]) => {
      if (queue && queue.length > 0) {
        const index = Math.max(
          0,
          queue.findIndex((t) => t.id === track.id)
        );
        load(track, { queue, queueIndex: index });
      } else {
        setState((s) => {
          const exists = s.queue.findIndex((t) => t.id === track.id);
          if (exists >= 0) return { ...s, queueIndex: exists };
          return { ...s, queue: [...s.queue, track], queueIndex: s.queue.length };
        });
        load(track);
      }
    },
    [load]
  );

  const togglePlay = useCallback(() => {
    if (!stateRef.current.currentTrack) return;
    if (stateRef.current.isPlaying) {
      audioRef.current?.pause();
      setState((s) => ({ ...s, isPlaying: false }));
    } else {
      audioRef.current?.play().catch(() => {
        setState((s) => ({ ...s, isPlaying: false }));
      });
      setState((s) => ({ ...s, isPlaying: true }));
    }
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setState((s) => ({ ...s, isPlaying: false }));
  }, []);

  const resume = useCallback(() => {
    if (!stateRef.current.currentTrack) return;
    audioRef.current?.play().catch(() => {
      setState((s) => ({ ...s, isPlaying: false }));
    });
    setState((s) => ({ ...s, isPlaying: true }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume));
    if (audioRef.current) audioRef.current.volume = clamped;
    setState((s) => ({ ...s, volume: clamped }));
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
    setState((s) => ({ ...s, playbackRate: rate }));
  }, []);

  const seek = useCallback((percent: number) => {
    const audio = audioRef.current;
    const clamped = Math.max(0, Math.min(100, percent));
    if (audio && audio.duration) {
      audio.currentTime = (clamped / 100) * audio.duration;
      setState((s) => ({ ...s, progress: clamped, currentTime: audio.currentTime }));
    } else {
      setState((s) => ({ ...s, progress: clamped }));
    }
  }, []);

  const playFromQueue = useCallback(
    (index: number) => {
      const { queue } = stateRef.current;
      const track = queue[index];
      if (!track) return;
      load(track, { queueIndex: index });
    },
    [load]
  );

  const playNext = useCallback(() => {
    const { queue, queueIndex } = stateRef.current;
    if (queue.length > 0 && queueIndex < queue.length - 1) {
      playFromQueue(queueIndex + 1);
      return;
    }
    seek(0);
    resume();
  }, [playFromQueue, seek, resume]);

  const playPrevious = useCallback(() => {
    const { queueIndex, currentTime } = stateRef.current;
    if (currentTime > 4) {
      seek(0);
      return;
    }
    if (queueIndex > 0) {
      playFromQueue(queueIndex - 1);
      return;
    }
    seek(0);
  }, [playFromQueue, seek]);

  const addToQueue = useCallback((track: Track) => {
    setState((s) =>
      s.queue.some((t) => t.id === track.id) ? s : { ...s, queue: [...s.queue, track] }
    );
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setState((s) => ({
      ...s,
      queue: s.queue.filter((_, i) => i !== index),
      queueIndex: index < s.queueIndex ? s.queueIndex - 1 : s.queueIndex,
    }));
  }, []);

  const clearQueue = useCallback(() => {
    setState((s) => ({
      ...s,
      queue: s.currentTrack ? [s.currentTrack] : [],
      queueIndex: s.currentTrack ? 0 : -1,
    }));
  }, []);

  useEffect(() => {
    const audio = ensureAudio();

    const onTimeUpdate = () => {
      const progress = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
      setState((s) => ({
        ...s,
        progress,
        currentTime: audio.currentTime,
        duration: audio.duration || s.duration,
      }));
    };
    const onEnded = () => {
      const { queue, queueIndex } = stateRef.current;
      if (queue.length > 0 && queueIndex < queue.length - 1) {
        playFromQueue(queueIndex + 1);
      } else {
        setState((s) => ({ ...s, isPlaying: false, progress: 0, currentTime: 0 }));
      }
    };
    const onLoadedMetadata = () => {
      setState((s) => ({ ...s, duration: audio.duration || s.currentTrack?.duration || 0 }));
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
    };
  }, [ensureAudio, playFromQueue]);

  return (
    <PlayerContext.Provider
      value={{
        ...state,
        playTrack,
        togglePlay,
        pause,
        resume,
        setVolume,
        seek,
        playNext,
        playPrevious,
        addToQueue,
        removeFromQueue,
        playFromQueue,
        clearQueue,
        setPlaybackRate,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return ctx;
}
