import type { Track } from "@/domain/music/types";
import { getAudioBlobUrl } from "./indexedDbAudio";
import { getGuaranteedAudioUrl } from "./synthAudio";
import { FALLBACK_TRACKS } from "@/domain/music/fallback";
import { recordPlay } from "./plays.functions";
import { globalDspEngine, type SoundProfile, type SpatialRoomPreset } from "./dsp.engine";

export type PlayerStatus = "idle" | "loading" | "buffering" | "playing" | "paused" | "error";

export interface AudioEngineState {
  currentTrack: Track | null;
  status: PlayerStatus;
  errorMessage?: string | null;
  isPlaying: boolean;
  isLoading: boolean;
  progress: number;
  volume: number;
  duration: number;
  currentTime: number;
  queue: Track[];
  queueIndex: number;
  playbackRate: number;
  // DSP profile state
  eqEnabled: boolean;
  eqGains: number[];
  eqPreset: string;
  bassBoostLevel: number;
  trebleLevel: number;
  stereoWidth: number;
  normalizerEnabled: boolean;
  crossfadeDuration: number;
  spatialMode: SpatialRoomPreset;
  spatialAmbience: number;
  isExpanded: boolean;
}

const DEFAULT_FALLBACK_AUDIO = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

/**
 * Headless Audio Engine.
 * Controls HTMLAudioElement lifecycle, queue, MediaSession API, and DSP pipeline.
 * Exposes a reactive event emitter for UI components.
 */
export class AudioEngine {
  private audio: HTMLAudioElement | null = null;
  private loadSeq = 0;
  private recordedPlayTrackId: string | null = null;
  private listeners = new Set<() => void>();

  public state: AudioEngineState = {
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
    eqGains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    eqPreset: "Flat",
    bassBoostLevel: 0,
    trebleLevel: 0,
    stereoWidth: 1.0,
    normalizerEnabled: false,
    crossfadeDuration: 0,
    spatialMode: "pure",
    spatialAmbience: 0.35,
  };

  constructor() {
    if (typeof window !== "undefined") {
      this.initAudioElement();
    }
  }

  private initAudioElement(): HTMLAudioElement {
    const win = window as unknown as { __LAYAM_MASTER_AUDIO__?: HTMLAudioElement };
    if (!win.__LAYAM_MASTER_AUDIO__) {
      const el = new Audio();
      el.volume = this.state.volume;
      el.playbackRate = this.state.playbackRate;
      el.preload = "auto";
      win.__LAYAM_MASTER_AUDIO__ = el;
    }
    this.audio = win.__LAYAM_MASTER_AUDIO__;
    this.attachAudioListeners();
    return this.audio;
  }

  private attachAudioListeners(): void {
    const a = this.audio;
    if (!a) return;

    a.addEventListener("timeupdate", () => {
      const cur = a.currentTime || 0;
      const dur = a.duration || this.state.currentTrack?.duration || 0;
      const pct = dur > 0 ? (cur / dur) * 100 : 0;

      this.setState({
        currentTime: cur,
        duration: dur,
        progress: Math.min(100, pct),
      });

      // Play counting trigger: 10s playback
      const track = this.state.currentTrack;
      if (
        track &&
        cur >= 10 &&
        this.recordedPlayTrackId !== track.id &&
        track.source !== "offline" &&
        !track.id.startsWith("local-") &&
        !track.id.startsWith("apple-preview-")
      ) {
        this.recordedPlayTrackId = track.id;
        void recordPlay({ data: { trackId: track.id, durationSec: Math.floor(cur) } }).catch(
          () => {},
        );
      }
    });

    a.addEventListener("play", () => {
      this.setState({ isPlaying: true, status: "playing" });
    });

    a.addEventListener("pause", () => {
      if (this.state.status !== "loading") {
        this.setState({ isPlaying: false, status: "paused" });
      }
    });

    a.addEventListener("ended", () => {
      this.playNext();
    });

    a.addEventListener("waiting", () => {
      this.setState({ isLoading: true, status: "buffering" });
    });

    a.addEventListener("playing", () => {
      this.setState({ isPlaying: true, isLoading: false, status: "playing" });
    });

    a.addEventListener("error", () => {
      console.warn("[AudioEngine] Audio element error event encountered");
    });
  }

  private setState(patch: Partial<AudioEngineState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public async playTrack(track: Track, newQueue?: Track[]): Promise<void> {
    if (!this.audio) this.initAudioElement();
    const audio = this.audio!;

    globalDspEngine.init(audio);
    await globalDspEngine.resume();

    const seq = ++this.loadSeq;
    this.recordedPlayTrackId = null;

    try {
      audio.pause();
      audio.currentTime = 0;
      audio.src = "";
    } catch {}

    let finalQueue = newQueue || this.state.queue;
    if (!newQueue && finalQueue.length === 0) finalQueue = [track];
    let qIdx = finalQueue.findIndex((t) => t.id === track.id);
    if (qIdx === -1) {
      finalQueue = [...finalQueue, track];
      qIdx = finalQueue.length - 1;
    }

    this.setState({
      currentTrack: track,
      queue: finalQueue,
      queueIndex: qIdx,
      status: "loading",
      isLoading: true,
      errorMessage: null,
    });

    // Resolve audio URL (supporting IndexedDB offline blobs)
    let finalAudioUrl = track.audioUrl || "";
    if (track.source === "offline" || track.id.startsWith("local-")) {
      if (!finalAudioUrl) {
        try {
          const blobUrl = await getAudioBlobUrl(track.id);
          if (blobUrl) finalAudioUrl = blobUrl;
        } catch {}
      }
    }

    if (!finalAudioUrl) {
      finalAudioUrl = getGuaranteedAudioUrl(track);
    }

    if (seq !== this.loadSeq) return;

    audio.src = finalAudioUrl;
    audio.load();

    try {
      await audio.play();
      if (seq === this.loadSeq) {
        this.setState({ isPlaying: true, isLoading: false, status: "playing" });
        this.setupMediaSession(track);
      }
    } catch (err) {
      console.warn("[AudioEngine] Playback deferred or failed:", err);
      if (seq === this.loadSeq) {
        this.setState({ isPlaying: false, isLoading: false, status: "paused" });
      }
    }
  }

  public togglePlay(): void {
    if (!this.audio) return;
    if (this.state.isPlaying) {
      this.audio.pause();
      this.setState({ isPlaying: false, status: "paused" });
    } else {
      void globalDspEngine.resume();
      this.audio
        .play()
        .then(() => this.setState({ isPlaying: true, status: "playing" }))
        .catch(() => {});
    }
  }

  public pause(): void {
    if (this.audio) {
      this.audio.pause();
      this.setState({ isPlaying: false, status: "paused" });
    }
  }

  public resume(): void {
    if (this.audio) {
      void globalDspEngine.resume();
      this.audio
        .play()
        .then(() => this.setState({ isPlaying: true, status: "playing" }))
        .catch(() => {});
    }
  }

  public seek(percent: number): void {
    if (!this.audio) return;
    const dur = this.audio.duration || this.state.currentTrack?.duration || 0;
    if (dur > 0) {
      const targetTime = (Math.max(0, Math.min(1, percent)) * dur);
      this.audio.currentTime = targetTime;
      this.setState({ currentTime: targetTime, progress: percent * 100 });
    }
  }

  public setVolume(vol: number): void {
    const clamped = Math.max(0, Math.min(1, vol));
    if (this.audio) this.audio.volume = clamped;
    this.setState({ volume: clamped });
  }

  public setPlaybackRate(rate: number): void {
    if (this.audio) this.audio.playbackRate = rate;
    this.setState({ playbackRate: rate });
  }

  public playNext(): void {
    const { queue, queueIndex } = this.state;
    if (queue.length === 0) return;
    const nextIdx = (queueIndex + 1) % queue.length;
    const nextTrack = queue[nextIdx];
    if (nextTrack) void this.playTrack(nextTrack);
  }

  public playPrevious(): void {
    const { queue, queueIndex } = this.state;
    if (queue.length === 0) return;
    const prevIdx = queueIndex > 0 ? queueIndex - 1 : queue.length - 1;
    const prevTrack = queue[prevIdx];
    if (prevTrack) void this.playTrack(prevTrack);
  }

  public addToQueue(track: Track): void {
    const exists = this.state.queue.some((t) => t.id === track.id);
    if (!exists) {
      this.setState({ queue: [...this.state.queue, track] });
    }
  }

  public removeFromQueue(index: number): void {
    const updated = this.state.queue.filter((_, i) => i !== index);
    this.setState({ queue: updated });
  }

  public playFromQueue(index: number): void {
    const track = this.state.queue[index];
    if (track) void this.playTrack(track);
  }

  public clearQueue(): void {
    this.setState({ queue: [], queueIndex: -1 });
  }

  // DSP Delegations
  public setEqGain(bandIndex: number, gainDb: number): void {
    const nextGains = [...this.state.eqGains];
    nextGains[bandIndex] = gainDb;
    globalDspEngine.setEqGain(bandIndex, gainDb);
    this.setState({ eqGains: nextGains, eqPreset: "Custom" });
  }

  public setEqPreset(preset: string): void {
    const gains = globalDspEngine.setEqPreset(preset);
    this.setState({ eqPreset: preset, eqGains: gains });
  }

  public toggleEq(): void {
    const enabled = !this.state.eqEnabled;
    if (!enabled) globalDspEngine.setEqGains(Array(10).fill(0));
    else globalDspEngine.setEqGains(this.state.eqGains);
    this.setState({ eqEnabled: enabled });
  }

  public setBassBoostLevel(level: number): void {
    globalDspEngine.setBassBoost(level);
    this.setState({ bassBoostLevel: level });
  }

  public setTrebleLevel(level: number): void {
    globalDspEngine.setTreble(level);
    this.setState({ trebleLevel: level });
  }

  public setStereoWidth(width: number): void {
    globalDspEngine.setStereoWidth(width);
    this.setState({ stereoWidth: width });
  }

  public toggleNormalizer(): void {
    const next = !this.state.normalizerEnabled;
    globalDspEngine.setNormalizer(next);
    this.setState({ normalizerEnabled: next });
  }

  public setCrossfadeDuration(secs: number): void {
    this.setState({ crossfadeDuration: secs });
  }

  public setSpatialMode(mode: SpatialRoomPreset): void {
    globalDspEngine.setSpatialMode(mode, this.state.spatialAmbience);
    this.setState({ spatialMode: mode });
  }

  public setSpatialAmbience(ambience: number): void {
    globalDspEngine.setSpatialMode(this.state.spatialMode, ambience);
    this.setState({ spatialAmbience: ambience });
  }

  public applyFullSoundProfile(profile: SoundProfile): void {
    globalDspEngine.setEqGains(profile.eqGains);
    globalDspEngine.setBassBoost(profile.bassBoostLevel);
    globalDspEngine.setTreble(profile.trebleLevel);
    globalDspEngine.setStereoWidth(profile.stereoWidth);
    globalDspEngine.setNormalizer(profile.normalizerEnabled);
    globalDspEngine.setSpatialMode(profile.spatialMode, profile.spatialAmbience);

    this.setState({
      eqGains: profile.eqGains,
      eqPreset: profile.eqPreset,
      bassBoostLevel: profile.bassBoostLevel,
      trebleLevel: profile.trebleLevel,
      stereoWidth: profile.stereoWidth,
      normalizerEnabled: profile.normalizerEnabled,
      spatialMode: profile.spatialMode,
      spatialAmbience: profile.spatialAmbience,
    });
  }

  public setExpanded(expanded: boolean): void {
    this.setState({ isExpanded: expanded });
  }

  private setupMediaSession(track: Track): void {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artistName,
        album: track.album || "Layam Audiophile Stream",
        artwork: track.coverImage ? [{ src: track.coverImage, sizes: "512x512", type: "image/jpeg" }] : [],
      });

      navigator.mediaSession.setActionHandler("play", () => this.resume());
      navigator.mediaSession.setActionHandler("pause", () => this.pause());
      navigator.mediaSession.setActionHandler("previoustrack", () => this.playPrevious());
      navigator.mediaSession.setActionHandler("nexttrack", () => this.playNext());
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (details.seekTime != null && this.state.duration > 0) {
          this.seek(details.seekTime / this.state.duration);
        }
      });
    } catch {}
  }
}

export const globalAudioEngine = new AudioEngine();
