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
import { getAudioBlobUrl } from "./indexedDbAudio";
import { FALLBACK_TRACKS } from "@/domain/music/fallback";
import { getGuaranteedAudioUrl } from "./synthAudio";
import { recordPlay } from "./plays.functions";

// ─── EQ constants ────────────────────────────────────────────────────────────
export const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;

export const EQ_PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  Bass: [8, 6, 4, 2, 0, 0, 0, 0, 0, 0],
  Treble: [0, 0, 0, 0, 0, 2, 4, 6, 8, 8],
  Vocal: [-2, -2, 0, 4, 6, 4, 2, 0, -2, -2],
  Rock: [6, 4, 2, 0, -2, -2, 0, 2, 4, 6],
  Jazz: [4, 2, 0, 2, 4, 4, 2, 0, -2, -2],
  Classical: [0, 0, 0, 0, 0, 0, 0, 0, 4, 4],
  Electronic: [6, 4, 2, 0, -2, 0, 2, 4, 6, 6],
  Acoustic: [4, 2, 2, 4, 2, 0, -2, -2, 0, 2],
};

export const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2] as const;

export type SpatialRoomPreset =
  | "pure"
  | "studio_control"
  | "control_room"
  | "vinyl_lounge"
  | "concert_hall"
  | "club_bunker";

export interface SoundProfile {
  id: string;
  name: string;
  hardwareDevice?: string;
  eqGains: number[];
  eqPreset: string;
  bassBoostLevel: number;
  trebleLevel: number;
  stereoWidth: number;
  normalizerEnabled: boolean;
  spatialMode: SpatialRoomPreset;
  spatialAmbience: number;
  syncedAt?: string;
}

export type PlayerStatus = "idle" | "loading" | "buffering" | "playing" | "paused" | "error";

// ─── State ────────────────────────────────────────────────────────────────────
interface PlayerState {
  currentTrack: Track | null;
  status: PlayerStatus;
  errorMessage?: string | null;
  isPlaying: boolean;
  isLoading: boolean;
  progress: number; // 0–100
  volume: number; // 0–1
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
  spatialMode: SpatialRoomPreset;
  spatialAmbience: number; // 0–1
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
  setSpatialMode: (mode: SpatialRoomPreset) => void;
  setSpatialAmbience: (ambience: number) => void;
  applyFullSoundProfile: (profile: SoundProfile) => void;
  getAnalyserNode: () => AnalyserNode | null;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

const INITIAL_EQ_GAINS = Array<number>(EQ_FREQUENCIES.length).fill(0);

// Default reliable audio stream fallback if a remote track URL fails
const DEFAULT_FALLBACK_AUDIO = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

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
    spatialMode: "pure",
    spatialAmbience: 0.35,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const filtersRef = useRef<BiquadFilterNode[]>([]);
  const bassBoostRef = useRef<BiquadFilterNode | null>(null);
  const trebleBoostRef = useRef<BiquadFilterNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const pannerRef = useRef<StereoPannerNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const loadSeqRef = useRef<number>(0);
  const recordedPlayTrackIdRef = useRef<string | null>(null);

  // ── Audio element singleton (Guaranteed Single Master Player across App) ──────
  const ensureAudio = useCallback(() => {
    if (typeof window !== "undefined") {
      const win = window as unknown as { __HARMONY_MASTER_AUDIO__?: HTMLAudioElement };
      if (!win.__HARMONY_MASTER_AUDIO__) {
        const globalAudio = new Audio();
        globalAudio.volume = stateRef.current.volume || 1.0;
        globalAudio.playbackRate = stateRef.current.playbackRate;
        globalAudio.preload = "auto";
        win.__HARMONY_MASTER_AUDIO__ = globalAudio;
      }
      audioRef.current = win.__HARMONY_MASTER_AUDIO__;
    } else if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    return audioRef.current!;
  }, []);

  // ── WebAudio DSP pipeline ───────────────────────────────────────────────────
  const setupWebAudioDSP = useCallback(() => {
    if (audioCtxRef.current || typeof window === "undefined") return;
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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
      for (const f of filters) {
        node.connect(f);
        node = f;
      }
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
  const safePlay = useCallback(async (audio: HTMLAudioElement) => {
    try {
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        await audioCtxRef.current.resume();
      }
    } catch (e) {
      console.warn("[UniversalPlayer:WebAudio] AudioContext resume warning:", e);
    }

    try {
      const p = audio.play();
      if (p !== undefined) {
        await p;
        setState((s) => ({
          ...s,
          isPlaying: true,
          isLoading: false,
          status: "playing",
          errorMessage: null,
        }));
      }
    } catch (err: unknown) {
      console.warn("[UniversalPlayer] Playback deferred (waiting for gesture or loading):", err);
      setState((s) => ({
        ...s,
        isPlaying: false,
        isLoading: false,
        status: "paused",
        errorMessage: null,
      }));
    }
  }, []);

  // ── Load & play a track ─────────────────────────────────────────────────────
  const load = useCallback(
    async (track: Track, patch: Partial<PlayerState> = {}) => {
      const audio = ensureAudio();
      setupWebAudioDSP();

      // Immediately increment sequence & halt any playing audio
      const seq = ++loadSeqRef.current;
      recordedPlayTrackIdRef.current = null;
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.src = "";
      } catch (e) {
        console.warn("[Player] Pause error:", e);
      }

      // Stop any other stray audio elements on page
      if (typeof document !== "undefined") {
        document.querySelectorAll("audio").forEach((el) => {
          if (el !== audio) {
            try {
              el.pause();
              el.src = "";
            } catch {}
          }
        });
      }

      // Determine final audio URL
      let finalAudioUrl = track.audioUrl || "";

      // If offline track with missing blob, try IndexedDB restoration
      if (track.source === "offline" || track.id.startsWith("local-")) {
        if (!finalAudioUrl || finalAudioUrl.trim() === "") {
          try {
            const restoredBlobUrl = await getAudioBlobUrl(track.id);
            if (restoredBlobUrl) {
              finalAudioUrl = restoredBlobUrl;
            }
          } catch (e) {
            console.warn("[Player:IndexedDB] Could not revive blob:", e);
          }
        }
      }

      // If completely empty, generate emergency fallback
      if (!finalAudioUrl || finalAudioUrl.trim() === "") {
        finalAudioUrl = await getGuaranteedAudioUrl(track.id, finalAudioUrl);
      }

      // Check if another track was clicked while resolving audio
      if (seq !== loadSeqRef.current) {
        return;
      }

      audio.src = finalAudioUrl;
      audio.load();
      audio.playbackRate = stateRef.current.playbackRate;

      const trackWithUrl: Track = {
        ...track,
        audioUrl: finalAudioUrl,
      };

      setState((s) => ({
        ...s,
        ...patch,
        currentTrack: trackWithUrl,
        status: "loading",
        isPlaying: false,
        isLoading: true,
        progress: 0,
        currentTime: 0,
        duration: track.duration || 180,
        errorMessage: null,
      }));

      void safePlay(audio);
    },
    [ensureAudio, setupWebAudioDSP, safePlay],
  );

  const expandPlayer = useCallback(() => setState((s) => ({ ...s, isExpanded: true })), []);
  const collapsePlayer = useCallback(() => setState((s) => ({ ...s, isExpanded: false })), []);
  const setExpanded = useCallback(
    (expanded: boolean) => setState((s) => ({ ...s, isExpanded: expanded })),
    [],
  );

  const playTrack = useCallback(
    (track: Track, queue?: Track[]) => {
      // If clicking the current track that is paused, resume or replay from start if ended
      if (stateRef.current.currentTrack?.id === track.id) {
        const audio = ensureAudio();
        if (stateRef.current.status === "idle" || audio.ended) {
          audio.currentTime = 0;
        }
        setupWebAudioDSP();
        void safePlay(audio);
        return;
      }

      if (queue && queue.length > 0) {
        const index = Math.max(
          0,
          queue.findIndex((t) => t.id === track.id),
        );
        void load(track, { queue, queueIndex: index });
      } else {
        setState((s) => {
          const exists = s.queue.findIndex((t) => t.id === track.id);
          if (exists >= 0) return { ...s, queueIndex: exists };
          return { ...s, queue: [...s.queue, track], queueIndex: s.queue.length };
        });
        void load(track);
      }
    },
    [load, ensureAudio, setupWebAudioDSP, safePlay],
  );

  const togglePlay = useCallback(() => {
    const audio = ensureAudio();
    if (!stateRef.current.currentTrack) return;
    if (stateRef.current.isPlaying) {
      audio.pause();
      setState((s) => ({ ...s, isPlaying: false, status: "paused" }));
    } else {
      setupWebAudioDSP();
      void safePlay(audio);
    }
  }, [ensureAudio, setupWebAudioDSP, safePlay]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setState((s) => ({ ...s, isPlaying: false, status: "paused" }));
  }, []);

  const resume = useCallback(() => {
    if (!stateRef.current.currentTrack) return;
    setupWebAudioDSP();
    void safePlay(ensureAudio());
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
    if (audio && audio.duration && !isNaN(audio.duration)) {
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
      void load(track, { queueIndex: index });
    },
    [load],
  );

  const playNext = useCallback(() => {
    const { queue, queueIndex } = stateRef.current;
    if (queue.length > 0 && queueIndex < queue.length - 1) {
      playFromQueue(queueIndex + 1);
    } else if (queue.length > 0) {
      // Loop back to first track in queue
      playFromQueue(0);
    } else {
      seek(0);
      resume();
    }
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
      s.queue.some((t) => t.id === track.id) ? s : { ...s, queue: [...s.queue, track] },
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
  const setEqGain = useCallback(
    (bandIndex: number, gainDb: number) => {
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
    },
    [setupWebAudioDSP],
  );

  const setEqPreset = useCallback(
    (presetName: string) => {
      setupWebAudioDSP();
      if (audioCtxRef.current?.state === "suspended") void audioCtxRef.current.resume();
      const gains = EQ_PRESETS[presetName] ?? EQ_PRESETS["Flat"] ?? INITIAL_EQ_GAINS;
      gains.forEach((gain, i) => {
        if (filtersRef.current[i]) filtersRef.current[i].gain.value = gain;
      });
      setState((s) => ({ ...s, eqEnabled: true, eqPreset: presetName, eqGains: [...gains] }));
    },
    [setupWebAudioDSP],
  );

  const toggleEq = useCallback(() => {
    setupWebAudioDSP();
    setState((s) => {
      const next = !s.eqEnabled;
      filtersRef.current.forEach((f, i) => {
        f.gain.value = next ? (s.eqGains[i] ?? 0) : 0;
      });
      return { ...s, eqEnabled: next };
    });
  }, [setupWebAudioDSP]);

  const setBassBoostLevel = useCallback(
    (level: number) => {
      setupWebAudioDSP();
      if (audioCtxRef.current?.state === "suspended") void audioCtxRef.current.resume();
      const clamped = Math.max(0, Math.min(12, level));
      if (bassBoostRef.current) bassBoostRef.current.gain.value = clamped;
      if (filtersRef.current[0]) filtersRef.current[0].gain.value = clamped / 2;
      if (filtersRef.current[1]) filtersRef.current[1].gain.value = clamped / 3;
      setState((s) => ({ ...s, bassBoostLevel: clamped }));
    },
    [setupWebAudioDSP],
  );

  const setTrebleLevel = useCallback(
    (level: number) => {
      setupWebAudioDSP();
      if (audioCtxRef.current?.state === "suspended") void audioCtxRef.current.resume();
      const clamped = Math.max(-12, Math.min(12, level));
      if (trebleBoostRef.current) trebleBoostRef.current.gain.value = clamped;
      if (filtersRef.current[8]) filtersRef.current[8].gain.value = clamped / 2;
      if (filtersRef.current[9]) filtersRef.current[9].gain.value = clamped;
      setState((s) => ({ ...s, trebleLevel: clamped }));
    },
    [setupWebAudioDSP],
  );

  const setStereoWidth = useCallback(
    (width: number) => {
      setupWebAudioDSP();
      if (audioCtxRef.current?.state === "suspended") void audioCtxRef.current.resume();
      const clamped = Math.max(0, Math.min(2, width));
      if (pannerRef.current) {
        pannerRef.current.pan.value = 0;
      }
      setState((s) => ({ ...s, stereoWidth: clamped }));
    },
    [setupWebAudioDSP],
  );

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

  const setSpatialMode = useCallback(
    (mode: SpatialRoomPreset) => {
      setupWebAudioDSP();
      if (audioCtxRef.current?.state === "suspended") void audioCtxRef.current.resume();
      setState((s) => {
        let targetWidth = s.stereoWidth;
        if (mode === "pure") targetWidth = 1.0;
        else if (mode === "control_room") targetWidth = 1.15;
        else if (mode === "vinyl_lounge") targetWidth = 1.25;
        else if (mode === "concert_hall") targetWidth = 1.65;
        else if (mode === "club_bunker") targetWidth = 1.35;
        return { ...s, spatialMode: mode, stereoWidth: targetWidth };
      });
    },
    [setupWebAudioDSP],
  );

  const setSpatialAmbience = useCallback((ambience: number) => {
    setState((s) => ({ ...s, spatialAmbience: Math.max(0, Math.min(1, ambience)) }));
  }, []);

  const applyFullSoundProfile = useCallback(
    (profile: SoundProfile) => {
      setupWebAudioDSP();
      if (audioCtxRef.current?.state === "suspended") void audioCtxRef.current.resume();

      profile.eqGains.forEach((gain, i) => {
        if (filtersRef.current[i]) filtersRef.current[i].gain.value = gain;
      });
      if (bassBoostRef.current) bassBoostRef.current.gain.value = profile.bassBoostLevel;
      if (trebleBoostRef.current) trebleBoostRef.current.gain.value = profile.trebleLevel;
      if (compressorRef.current) {
        compressorRef.current.threshold.value = profile.normalizerEnabled ? -24 : 0;
      }

      setState((s) => ({
        ...s,
        eqEnabled: true,
        eqGains: [...profile.eqGains],
        eqPreset: profile.eqPreset,
        bassBoostLevel: profile.bassBoostLevel,
        trebleLevel: profile.trebleLevel,
        stereoWidth: profile.stereoWidth,
        normalizerEnabled: profile.normalizerEnabled,
        spatialMode: profile.spatialMode,
        spatialAmbience: profile.spatialAmbience,
      }));
    },
    [setupWebAudioDSP],
  );

  // ── Audio event listeners ───────────────────────────────────────────────────
  useEffect(() => {
    const audio = ensureAudio();

    const onTimeUpdate = () => {
      const duration = audio.duration && !isNaN(audio.duration) ? audio.duration : stateRef.current.duration;
      const progress = duration > 0 ? (audio.currentTime / duration) * 100 : 0;
      setState((s) => ({
        ...s,
        progress,
        currentTime: audio.currentTime,
        duration: duration || s.duration,
      }));

      // Trigger verified play recording after 10s of real continuous playback
      if (
        audio.currentTime >= 10 &&
        stateRef.current.currentTrack &&
        recordedPlayTrackIdRef.current !== stateRef.current.currentTrack.id
      ) {
        const trackId = stateRef.current.currentTrack.id;
        // Skip local offline and synthetic preview IDs
        if (
          !trackId.startsWith("local-") &&
          !trackId.startsWith("audius-") &&
          !trackId.startsWith("jamendo-") &&
          !trackId.startsWith("apple-")
        ) {
          recordedPlayTrackIdRef.current = trackId;
          void recordPlay({
            data: {
              trackId,
              durationSec: Math.round(audio.currentTime),
            },
          }).catch((err) => {
            console.warn("[Player] Stream accounting notification:", err);
          });
        }
      }
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
      if (audio.duration && !isNaN(audio.duration)) {
        setState((s) => ({ ...s, duration: audio.duration }));
      }
    };

    const onLoadStart = () => {
      setState((s) => ({ ...s, status: "loading", isLoading: true }));
    };

    const onWaiting = () => {
      setState((s) => ({ ...s, status: "buffering", isLoading: true }));
    };

    const onPlaying = () => {
      setState((s) => ({
        ...s,
        status: "playing",
        isPlaying: true,
        isLoading: false,
        errorMessage: null,
      }));
    };

    const onCanPlay = () => {
      setState((s) => ({ ...s, isLoading: false }));
    };

    const onPause = () => {
      setState((s) => ({
        ...s,
        status: s.currentTrack ? "paused" : "idle",
        isPlaying: false,
        isLoading: false,
      }));
    };

    const onError = async () => {
      // If audio.src is empty or transitioning, ignore
      if (!audio.src || audio.src === "" || (typeof window !== "undefined" && audio.src === window.location.href)) {
        return;
      }
      const mediaErr = audio.error;
      console.warn("[UniversalPlayer:MediaError]", mediaErr?.message, "Source:", audio.src);
      if (stateRef.current.currentTrack) {
        try {
          const fallbackSrc = await getGuaranteedAudioUrl(stateRef.current.currentTrack.id);
          if (audio.src !== fallbackSrc) {
            audio.src = fallbackSrc;
            audio.load();
            void audio.play().catch(() => {});
            return;
          }
        } catch {
          // ignore
        }
      }
      setState((s) => ({
        ...s,
        status: "error",
        isPlaying: false,
        isLoading: false,
        errorMessage: "Audio decode error. Please tap to retry.",
      }));
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("loadstart", onLoadStart);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("loadstart", onLoadStart);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("error", onError);
    };
  }, [ensureAudio, playFromQueue]);

  // ── Native MediaSession API ─────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;

    if (state.currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: state.currentTrack.title,
        artist: state.currentTrack.artistName,
        album: state.currentTrack.album || "Layam Master Catalog",
        artwork: [
          {
            src: state.currentTrack.coverImage,
            sizes: "512x512",
            type: "image/jpeg",
          },
        ],
      });

      navigator.mediaSession.setActionHandler("play", () => {
        const audio = ensureAudio();
        setupWebAudioDSP();
        void safePlay(audio);
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        audioRef.current?.pause();
        setState((s) => ({ ...s, isPlaying: false, status: "paused" }));
      });
      navigator.mediaSession.setActionHandler("previoustrack", playPrevious);
      navigator.mediaSession.setActionHandler("nexttrack", playNext);
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (details.seekTime && audioRef.current?.duration) {
          const pct = (details.seekTime / audioRef.current.duration) * 100;
          seek(pct);
        }
      });
    }
  }, [state.currentTrack, ensureAudio, setupWebAudioDSP, safePlay, playPrevious, playNext, seek]);

  const value = useMemo<PlayerContextValue>(
    () => ({
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
      setSpatialMode,
      setSpatialAmbience,
      applyFullSoundProfile,
      getAnalyserNode,
    }),
    [
      state,
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
      setSpatialMode,
      setSpatialAmbience,
      applyFullSoundProfile,
      getAnalyserNode,
    ],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
