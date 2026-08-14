import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { Track } from "@/domain/music/types";

// ─── EQ constants ────────────────────────────────────────────────────────────
export const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;

export const EQ_PRESETS: Record<string, number[]> = {
  Flat:       [0,  0,  0,  0,  0,  0,  0,  0,  0,  0],
  Bass:       [8,  6,  4,  2,  0,  0,  0,  0,  0,  0],
  Treble:     [0,  0,  0,  0,  0,  2,  4,  6,  8,  8],
  Vocal:      [-2, -2,  0,  4,  6,  4,  2,  0, -2, -2],
  Rock:       [6,  4,  2,  0, -2, -2,  0,  2,  4,  6],
  Jazz:       [4,  2,  0,  2,  4,  4,  2,  0, -2, -2],
  Classical:  [0,  0,  0,  0,  0,  0,  0,  0,  4,  4],
  Electronic: [6,  4,  2,  0, -2,  0,  2,  4,  6,  6],
  Acoustic:   [4,  2,  2,  4,  2,  0, -2, -2,  0,  2],
};

export const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2] as const;

export type PlayerStatus = "idle" | "loading" | "buffering" | "playing" | "paused" | "error";

// ─── State ────────────────────────────────────────────────────────────────────
interface PlayerState {
  currentTrack: Track | null;
  status: PlayerStatus;
  errorMessage?: string;
  isPlaying: boolean;
  isLoading: boolean;
  progress: number;   // 0–100
  volume: number;     // 0–1
  duration: number;
  currentTime: number;
  queue: Track[];
  queueIndex: number;
  playbackRate: number;
  // EQ & DSP
  eqEnabled: boolean;
  eqGains: number[];
  eqPreset: string;
  bassBoostLevel: number;
  trebleLevel: number;
  stereoWidth: number;
  normalizerEnabled: boolean;
  crossfadeDuration: number; // seconds
  isExpanded: boolean;
}

// ─── Context value ────────────────────────────────────────────────────────────
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
  expandPlayer: () => void;
  collapsePlayer: () => void;
  setExpanded: (expanded: boolean) => void;
  // EQ & DSP
  setEqGain: (bandIndex: number, gainDb: number) => void;
  setEqPreset: (preset: string) => void;
  toggleEq: () => void;
  setBassBoostLevel: (level: number) => void;
  setTrebleLevel: (level: number) => void;
  setStereoWidth: (width: number) => void;
  toggleNormalizer: () => void;
  setCrossfadeDuration: (secs: number) => void;
  getAnalyserNode: () => AnalyserNode | null;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

const INITIAL_EQ_GAINS = Array<number>(EQ_FREQUENCIES.length).fill(0);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PlayerState>({
    currentTrack: null,
    status: "idle",
    isPlaying: false,
    isLoading: false,
    progress: 0,
    volume: 0.8,
    duration: 0,
    currentTime: 0,
    queue: [],
    queueIndex: -1,
    playbackRate: 1,
    isExpanded: false,
    eqEnabled: false,
    eqGains: [...INITIAL_EQ_GAINS],
    eqPreset: "Flat",
    bassBoostLevel: 0,
    trebleLevel: 0,
    stereoWidth: 1.0,
    normalizerEnabled: false,
    crossfadeDuration: 0,
  });

  const audioRef        = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef     = useRef<AudioContext | null>(null);
  const sourceNodeRef   = useRef<MediaElementAudioSourceNode | null>(null);
  const filtersRef      = useRef<BiquadFilterNode[]>([]);
  const bassBoostRef    = useRef<BiquadFilterNode | null>(null);
  const trebleBoostRef  = useRef<BiquadFilterNode | null>(null);
  const compressorRef   = useRef<DynamicsCompressorNode | null>(null);
  const pannerRef       = useRef<StereoPannerNode | null>(null);
  const analyserRef     = useRef<AnalyserNode | null>(null);
  const gainNodeRef     = useRef<GainNode | null>(null);
  const stateRef        = useRef(state);
  stateRef.current      = state;

  // ── Audio element singleton ─────────────────────────────────────────────────
  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.volume = stateRef.current.volume;
      audio.playbackRate = stateRef.current.playbackRate;
      audio.preload = "auto";
      audioRef.current = audio;
    }
    return audioRef.current;
  }, []);

  // ── WebAudio DSP pipeline ───────────────────────────────────────────────────
  const setupWebAudioDSP = useCallback(() => {
    if (audioCtxRef.current || typeof window === "undefined") return;
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    try {
      const audio = ensureAudio();
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaElementSource(audio);
      sourceNodeRef.current = source;

      // 10-band EQ filters
      const filters = (EQ_FREQUENCIES as readonly number[]).map((freq) => {
        const f = ctx.createBiquadFilter();
        f.type = "peaking";
        f.frequency.value = freq;
        f.Q.value = 1.4;
        f.gain.value = 0;
        return f;
      });
      filtersRef.current = filters;

      // Bass boost (low-shelf)
      const bassNode = ctx.createBiquadFilter();
      bassNode.type = "lowshelf";
      bassNode.frequency.value = 100;
      bassNode.gain.value = stateRef.current.bassBoostLevel;
      bassBoostRef.current = bassNode;

      // Treble boost (high-shelf)
      const trebleNode = ctx.createBiquadFilter();
      trebleNode.type = "highshelf";
      trebleNode.frequency.value = 8000;
      trebleNode.gain.value = stateRef.current.trebleLevel;
      trebleBoostRef.current = trebleNode;

      // Compressor / normalizer
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -24;
      comp.knee.value = 30;
      comp.ratio.value = 12;
      comp.attack.value = 0.003;
      comp.release.value = 0.25;
      compressorRef.current = comp;

      // Stereo Width / Panner
      if (ctx.createStereoPanner) {
        const panner = ctx.createStereoPanner();
        panner.pan.value = 0;
        pannerRef.current = panner;
      }

      // Analyser for real-time spectrum visualizer
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      // Master gain
      const gain = ctx.createGain();
      gain.gain.value = 1.0;
      gainNodeRef.current = gain;

      // Chain: source → filters → bass → treble → comp → [panner] → gain → analyser → destination
      let node: AudioNode = source;
      for (const f of filters) { node.connect(f); node = f; }
      node.connect(bassNode);
      bassNode.connect(trebleNode);
      trebleNode.connect(comp);
      let afterComp: AudioNode = comp;
      if (pannerRef.current) {
        comp.connect(pannerRef.current);
        afterComp = pannerRef.current;
      }
      afterComp.connect(gain);
      gain.connect(analyser);
      analyser.connect(ctx.destination);
    } catch (err) {
      console.warn("[DSP] WebAudio init notice:", err);
    }
  }, [ensureAudio]);

  // ── Safe play helper ────────────────────────────────────────────────────────
  const safePlay = useCallback((audio: HTMLAudioElement) => {
    // Resume suspended AudioContext (browser autoplay policy)
    if (audioCtxRef.current?.state === "suspended") {
      void audioCtxRef.current.resume();
    }
    const p = audio.play();
    if (p !== undefined) {
      p.then(() => {
        setState((s) => ({ ...s, isPlaying: true, isLoading: false, status: "playing", errorMessage: undefined }));
      }).catch((err: unknown) => {
        console.log("[Player] Playback notice:", err);
        setState((s) => ({ ...s, isPlaying: false, isLoading: false, status: "paused" }));
      });
    }
  }, []);

  // ── Load & play a track ─────────────────────────────────────────────────────
  const load = useCallback(
    (track: Track, patch: Partial<PlayerState> = {}) => {
      const audio = ensureAudio();
      setupWebAudioDSP();

      audio.pause();
      audio.src = track.audioUrl;
      audio.load();
      audio.playbackRate = stateRef.current.playbackRate;

      setState((s) => ({
        ...s,
        ...patch,
        currentTrack: track,
        status: "loading",
        isPlaying: false,
        isLoading: true,
        progress: 0,
        currentTime: 0,
        duration: track.duration,
        errorMessage: undefined,
        isExpanded: track.source === "offline" || track.id.startsWith("local-") ? true : s.isExpanded,
      }));

      safePlay(audio);
    },
    [ensureAudio, setupWebAudioDSP, safePlay]
  );

  const expandPlayer = useCallback(() => setState((s) => ({ ...s, isExpanded: true })), []);
  const collapsePlayer = useCallback(() => setState((s) => ({ ...s, isExpanded: false })), []);
  const setExpanded = useCallback((expanded: boolean) => setState((s) => ({ ...s, isExpanded: expanded })), []);

  const playTrack = useCallback(
    (track: Track, queue?: Track[]) => {
      if (queue && queue.length > 0) {
        const index = Math.max(0, queue.findIndex((t) => t.id === track.id));
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
    const audio = ensureAudio();
    if (!stateRef.current.currentTrack) return;
    if (stateRef.current.isPlaying) {
      audio.pause();
      setState((s) => ({ ...s, isPlaying: false }));
    } else {
      setupWebAudioDSP();
      safePlay(audio);
    }
  }, [ensureAudio, setupWebAudioDSP, safePlay]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setState((s) => ({ ...s, isPlaying: false }));
  }, []);

  const resume = useCallback(() => {
    if (!stateRef.current.currentTrack) return;
    setupWebAudioDSP();
    safePlay(ensureAudio());
  }, [ensureAudio, setupWebAudioDSP, safePlay]);

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
      const track = stateRef.current.queue[index];
      if (!track) return;
      load(track, { queueIndex: index });
    },
    [load]
  );

  const playNext = useCallback(() => {
    const { queue, queueIndex } = stateRef.current;
    if (queue.length > 0 && queueIndex < queue.length - 1) {
      playFromQueue(queueIndex + 1);
    } else {
      seek(0);
      resume();
    }
  }, [playFromQueue, seek, resume]);

  const playPrevious = useCallback(() => {
    const { queueIndex, currentTime } = stateRef.current;
    if (currentTime > 4) { seek(0); return; }
    if (queueIndex > 0) { playFromQueue(queueIndex - 1); return; }
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

  // ── EQ controls ─────────────────────────────────────────────────────────────
  const setEqGain = useCallback((bandIndex: number, gainDb: number) => {
    setupWebAudioDSP();
    if (audioCtxRef.current?.state === "suspended") void audioCtxRef.current.resume();
    if (filtersRef.current[bandIndex]) {
      filtersRef.current[bandIndex].gain.value = gainDb;
    }
    setState((s) => {
      const newGains = [...s.eqGains];
      newGains[bandIndex] = gainDb;
      return { ...s, eqGains: newGains, eqEnabled: true, eqPreset: "Custom" };
    });
  }, [setupWebAudioDSP]);

  const setEqPreset = useCallback((presetName: string) => {
    setupWebAudioDSP();
    if (audioCtxRef.current?.state === "suspended") void audioCtxRef.current.resume();
    const gains = EQ_PRESETS[presetName] ?? EQ_PRESETS["Flat"] ?? INITIAL_EQ_GAINS;
    gains.forEach((gain, i) => {
      if (filtersRef.current[i]) filtersRef.current[i].gain.value = gain;
    });
    setState((s) => ({ ...s, eqEnabled: true, eqPreset: presetName, eqGains: [...gains] }));
  }, [setupWebAudioDSP]);

  const toggleEq = useCallback(() => {
    setupWebAudioDSP();
    setState((s) => {
      const next = !s.eqEnabled;
      filtersRef.current.forEach((f, i) => { f.gain.value = next ? (s.eqGains[i] ?? 0) : 0; });
      return { ...s, eqEnabled: next };
    });
  }, [setupWebAudioDSP]);

  const setBassBoostLevel = useCallback((level: number) => {
    setupWebAudioDSP();
    if (audioCtxRef.current?.state === "suspended") void audioCtxRef.current.resume();
    const clamped = Math.max(0, Math.min(12, level));
    if (bassBoostRef.current) bassBoostRef.current.gain.value = clamped;
    if (filtersRef.current[0]) filtersRef.current[0].gain.value = clamped / 2;
    if (filtersRef.current[1]) filtersRef.current[1].gain.value = clamped / 3;
    setState((s) => ({ ...s, bassBoostLevel: clamped }));
  }, [setupWebAudioDSP]);

  const setTrebleLevel = useCallback((level: number) => {
    setupWebAudioDSP();
    if (audioCtxRef.current?.state === "suspended") void audioCtxRef.current.resume();
    const clamped = Math.max(-12, Math.min(12, level));
    if (trebleBoostRef.current) trebleBoostRef.current.gain.value = clamped;
    if (filtersRef.current[8]) filtersRef.current[8].gain.value = clamped / 2;
    if (filtersRef.current[9]) filtersRef.current[9].gain.value = clamped;
    setState((s) => ({ ...s, trebleLevel: clamped }));
  }, [setupWebAudioDSP]);

  const setStereoWidth = useCallback((width: number) => {
    setupWebAudioDSP();
    if (audioCtxRef.current?.state === "suspended") void audioCtxRef.current.resume();
    const clamped = Math.max(0, Math.min(2, width));
    if (pannerRef.current) {
      // Scale 0 (mono) -> 1 (normal) -> 2 (extra wide)
      pannerRef.current.pan.value = 0; // standard balanced pan
    }
    setState((s) => ({ ...s, stereoWidth: clamped }));
  }, [setupWebAudioDSP]);

  const getAnalyserNode = useCallback(() => {
    return analyserRef.current;
  }, []);

  const toggleNormalizer = useCallback(() => {
    setState((s) => {
      const next = !s.normalizerEnabled;
      if (compressorRef.current) {
        compressorRef.current.threshold.value = next ? -24 : 0;
      }
      return { ...s, normalizerEnabled: next };
    });
  }, []);

  const setCrossfadeDuration = useCallback((secs: number) => {
    setState((s) => ({ ...s, crossfadeDuration: Math.max(0, Math.min(12, secs)) }));
  }, []);

  // ── Audio event listeners ───────────────────────────────────────────────────
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
        setState((s) => ({ ...s, isPlaying: false, status: "idle", progress: 0, currentTime: 0 }));
      }
    };
    const onLoadedMetadata = () => {
      setState((s) => ({ ...s, duration: audio.duration || s.currentTrack?.duration || 0 }));
    };
    const onLoadStart = () => setState((s) => ({ ...s, status: "loading", isLoading: true }));
    const onWaiting = () => setState((s) => ({ ...s, status: "buffering", isLoading: true }));
    const onPlaying = () => setState((s) => ({ ...s, status: "playing", isPlaying: true, isLoading: false, errorMessage: undefined }));
    const onCanPlay = () => setState((s) => ({ ...s, isLoading: false }));
    const onPause = () => setState((s) => ({ ...s, status: s.currentTrack ? "paused" : "idle", isPlaying: false, isLoading: false }));
    const onError = () => setState((s) => ({ ...s, status: "error", isPlaying: false, isLoading: false, errorMessage: "Audio stream error or network unavailable" }));

    audio.addEventListener("timeupdate",    onTimeUpdate);
    audio.addEventListener("ended",         onEnded);
    audio.addEventListener("loadedmetadata",onLoadedMetadata);
    audio.addEventListener("loadstart",     onLoadStart);
    audio.addEventListener("waiting",       onWaiting);
    audio.addEventListener("playing",       onPlaying);
    audio.addEventListener("canplay",       onCanPlay);
    audio.addEventListener("pause",         onPause);
    audio.addEventListener("error",         onError);

    return () => {
      audio.removeEventListener("timeupdate",    onTimeUpdate);
      audio.removeEventListener("ended",         onEnded);
      audio.removeEventListener("loadedmetadata",onLoadedMetadata);
      audio.removeEventListener("loadstart",     onLoadStart);
      audio.removeEventListener("waiting",       onWaiting);
      audio.removeEventListener("playing",       onPlaying);
      audio.removeEventListener("canplay",       onCanPlay);
      audio.removeEventListener("pause",         onPause);
      audio.removeEventListener("error",         onError);
    };
  }, [ensureAudio, playFromQueue]);

  // ── Context value (memoized) ────────────────────────────────────────────────
  const value = useMemo<PlayerContextValue>(() => ({
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
    expandPlayer,
    collapsePlayer,
    setExpanded,
    setEqGain,
    setEqPreset,
    toggleEq,
    setBassBoostLevel,
    setTrebleLevel,
    setStereoWidth,
    toggleNormalizer,
    setCrossfadeDuration,
    getAnalyserNode,
  }), [
    state,
    playTrack, togglePlay, pause, resume, setVolume, seek,
    playNext, playPrevious, addToQueue, removeFromQueue, playFromQueue, clearQueue,
    setPlaybackRate, expandPlayer, collapsePlayer, setExpanded, setEqGain, setEqPreset, toggleEq,
    setBassBoostLevel, setTrebleLevel, setStereoWidth, toggleNormalizer, setCrossfadeDuration,
    getAnalyserNode,
  ]);

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within a PlayerProvider");
  return ctx;
}
