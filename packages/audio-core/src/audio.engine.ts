import type { Track } from "@/domain/music/types";
import { getAudioBlobUrl } from "../../storage-core/src/indexedDbAudio";
import { getGuaranteedAudioUrl } from "./synthAudio";
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

/**
 * Headless Audio Engine.
 * Controls HTMLAudioElement lifecycle, queue, MediaSession API, and DSP pipeline.
 * Exposes a reactive event emitter for UI components.
 */
export class AudioEngine {
  private audio: HTMLAudioElement | null = null;
  private loadSeq = 0;
  private playPromise: Promise<void> | null = null;
  private recordedPlayTrackId: string | null = null;
  private listeners = new Set<() => void>();
  public onPlayRecorded?: (track: Track, durationSec: number) => void;

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
    globalDspEngine.init(this.audio);
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
      this.updateMediaSessionPositionState();

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
        if (this.onPlayRecorded) {
          try {
            this.onPlayRecorded(track, Math.floor(cur));
          } catch {}
        }
      }
    });

    a.addEventListener("play", () => {
      this.setState({ isPlaying: true, status: "playing" });
      this.updateMediaSessionPlaybackState("playing");
    });

    a.addEventListener("pause", () => {
      if (this.state.status !== "loading") {
        this.setState({ isPlaying: false, status: "paused" });
        this.updateMediaSessionPlaybackState("paused");
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
    void globalDspEngine.resume();

    const seq = ++this.loadSeq;
    this.recordedPlayTrackId = null;

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

    // Resolve audio URL: for local/offline tracks, ALWAYS get a live fresh blob URL from active memory or IndexedDB
    let finalAudioUrl = "";

    if (track.source === "offline" || track.id.startsWith("local-")) {
      try {
        const liveBlobUrl = await getAudioBlobUrl(track.id);
        if (liveBlobUrl) {
          finalAudioUrl = liveBlobUrl;
          track.audioUrl = liveBlobUrl;
        }
      } catch (err) {
        console.warn("[AudioEngine] Blob resolution note:", err);
      }
    } else if (track.audioUrl && !track.audioUrl.startsWith("blob:")) {
      finalAudioUrl = track.audioUrl;
    }

    // Only fallback to synth/online demo if NOT an imported local file
    if (!finalAudioUrl && track.source !== "offline" && !track.id.startsWith("local-imported-")) {
      finalAudioUrl = getGuaranteedAudioUrl(track);
    }

    if (seq !== this.loadSeq) return;

    if (!finalAudioUrl) {
      console.warn("[AudioEngine] No audio URL found for track:", track.id);
      this.setState({
        status: "error",
        isLoading: false,
        isPlaying: false,
        errorMessage: "Audio file unavailable in local vault",
      });
      return;
    }

    // Await any pending play promise before updating src to prevent AbortError
    if (this.playPromise) {
      try {
        await this.playPromise;
      } catch {}
    }

    if (seq !== this.loadSeq) return;

    audio.src = finalAudioUrl;
    audio.load();

    try {
      this.playPromise = audio.play();
      await this.playPromise;
      if (seq === this.loadSeq) {
        this.setState({ isPlaying: true, isLoading: false, status: "playing" });
        this.setupMediaSession(track);
      }
    } catch (err: unknown) {
      const isAbort = (err as { name?: string })?.name === "AbortError";
      if (!isAbort) {
        console.warn("[AudioEngine] Playback failed:", err);
      }
      if (seq === this.loadSeq && !isAbort) {
        this.setState({ isPlaying: false, isLoading: false, status: "paused" });
      }
    } finally {
      if (seq === this.loadSeq) {
        this.playPromise = null;
      }
    }
  }

  public togglePlay(): void {
    if (!this.audio) return;
    if (this.state.isPlaying) {
      this.pause();
    } else {
      this.resume();
    }
  }

  public pause(): void {
    if (!this.audio) return;
    if (this.playPromise) {
      this.playPromise
        .then(() => {
          this.audio?.pause();
          this.setState({ isPlaying: false, status: "paused" });
        })
        .catch(() => {
          this.setState({ isPlaying: false, status: "paused" });
        });
    } else {
      this.audio.pause();
      this.setState({ isPlaying: false, status: "paused" });
    }
  }

  public resume(): void {
    if (!this.audio) return;
    if (this.playPromise) return;

    globalDspEngine.init(this.audio);
    void globalDspEngine.resume();

    try {
      this.playPromise = this.audio.play();
      this.playPromise
        .then(() => {
          this.setState({ isPlaying: true, status: "playing" });
        })
        .catch((err: unknown) => {
          const isAbort = (err as { name?: string })?.name === "AbortError";
          if (!isAbort) {
            console.warn("[AudioEngine] Resume failed:", err);
          }
        })
        .finally(() => {
          this.playPromise = null;
        });
    } catch (err) {
      console.warn("[AudioEngine] Resume exception:", err);
    }
  }

  public seek(percent: number): void {
    if (!this.audio) return;
    const dur = this.audio.duration || this.state.currentTrack?.duration || 0;
    if (dur > 0) {
      const ratio = percent > 1 ? Math.max(0, Math.min(100, percent)) / 100 : Math.max(0, Math.min(1, percent));
      const targetTime = ratio * dur;
      this.audio.currentTime = targetTime;
      this.setState({ currentTime: targetTime, progress: ratio * 100 });
    }
  }

  public seekToTime(seconds: number): void {
    if (!this.audio) return;
    const dur = this.audio.duration || this.state.currentTrack?.duration || 0;
    if (dur > 0) {
      const clampedTime = Math.max(0, Math.min(dur, seconds));
      this.audio.currentTime = clampedTime;
      this.setState({ currentTime: clampedTime, progress: (clampedTime / dur) * 100 });
    }
  }

  public seekRelative(deltaSeconds: number): void {
    if (!this.audio) return;
    const dur = this.audio.duration || this.state.currentTrack?.duration || 0;
    const cur = this.audio.currentTime ?? this.state.currentTime ?? 0;
    const target = Math.max(0, Math.min(dur > 0 ? dur : cur + deltaSeconds, cur + deltaSeconds));
    this.seekToTime(target);
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

  public playNextInQueue(track: Track): void {
    const { queue, queueIndex } = this.state;
    if (queue.length === 0) {
      void this.playTrack(track);
      return;
    }
    const filtered = queue.filter((t) => t.id !== track.id);
    const insertIdx = Math.max(0, queueIndex + 1);
    filtered.splice(insertIdx, 0, track);
    this.setState({ queue: filtered });
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
    if (!this.state.eqEnabled) {
      globalDspEngine.setBypass(false);
    }
    this.setState({ eqGains: nextGains, eqPreset: "Custom", eqEnabled: true });
  }

  public setEqGains(gains: number[], presetName: string = "Custom"): void {
    globalDspEngine.setEqGains(gains);
    if (!this.state.eqEnabled) {
      globalDspEngine.setBypass(false);
    }
    this.setState({ eqGains: [...gains], eqPreset: presetName, eqEnabled: true });
  }

  public setEqPreset(preset: string): void {
    const gains = globalDspEngine.setEqPreset(preset);
    if (!this.state.eqEnabled) {
      globalDspEngine.setBypass(false);
    }
    this.setState({ eqPreset: preset, eqGains: gains, eqEnabled: true });
  }

  public setEqEnabled(enabled: boolean): void {
    globalDspEngine.setBypass(!enabled);
    this.setState({ eqEnabled: enabled });
  }

  public toggleEq(): void {
    const enabled = !this.state.eqEnabled;
    this.setEqEnabled(enabled);
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

  public updateMediaSessionPositionState(): void {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    try {
      if ("setPositionState" in navigator.mediaSession && this.state.duration > 0) {
        navigator.mediaSession.setPositionState({
          duration: Math.max(0, this.state.duration),
          playbackRate: this.state.playbackRate || 1,
          position: Math.min(Math.max(0, this.state.currentTime), this.state.duration),
        });
      }
    } catch {}
  }

  public updateMediaSessionPlaybackState(playbackState: "none" | "paused" | "playing"): void {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.playbackState = playbackState;
    } catch {}
  }

  private setupMediaSession(track: Track): void {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title || "Unknown Title",
        artist: track.artistName || "Local Artist",
        album: track.album || "Layam Audio Vault",
        artwork: track.coverImage
          ? [
              { src: track.coverImage, sizes: "96x96", type: "image/jpeg" },
              { src: track.coverImage, sizes: "128x128", type: "image/jpeg" },
              { src: track.coverImage, sizes: "256x256", type: "image/jpeg" },
              { src: track.coverImage, sizes: "512x512", type: "image/jpeg" },
            ]
          : [],
      });

      navigator.mediaSession.playbackState = "playing";

      navigator.mediaSession.setActionHandler("play", () => this.resume());
      navigator.mediaSession.setActionHandler("pause", () => this.pause());
      navigator.mediaSession.setActionHandler("previoustrack", () => this.playPrevious());
      navigator.mediaSession.setActionHandler("nexttrack", () => this.playNext());
      navigator.mediaSession.setActionHandler("seekbackward", (details) => {
        this.seekRelative(-(details.seekOffset || 10));
      });
      navigator.mediaSession.setActionHandler("seekforward", (details) => {
        this.seekRelative(details.seekOffset || 10);
      });
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (details.seekTime != null && this.state.duration > 0) {
          this.seek(details.seekTime / this.state.duration);
        }
      });
      this.updateMediaSessionPositionState();
    } catch {}
  }

  public setExpanded(expanded: boolean): void {
    this.setState({ isExpanded: expanded });
  }
}

export const globalAudioEngine = new AudioEngine();

