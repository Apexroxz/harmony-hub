import type { Track } from "@/domain/music/types";
import { getAudioBlobUrl, getNativeAudioUri } from "../../storage-core/src/indexedDbAudio";
import { getGuaranteedAudioUrl } from "./synthAudio";
import { globalDspEngine, type SoundProfile, type SpatialRoomPreset } from "./dsp.engine";
import { androidMedia3, LayamNativeAudio } from "./native/android-media3.bridge";

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
  // Sleep Timer state
  sleepTimerSecondsRemaining: number | null;
  sleepTimerEndOnTrack: boolean;
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
  private sleepTimerInterval: ReturnType<typeof setInterval> | null = null;
  private preFadeVolume = 0.8;
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
    sleepTimerSecondsRemaining: null,
    sleepTimerEndOnTrack: false,
  };

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const savedTrack = localStorage.getItem("layam_current_track");
        if (savedTrack) {
          const parsed = JSON.parse(savedTrack);
          if (parsed && parsed.title) {
            this.state.currentTrack = parsed;
          }
        }
      } catch {}
      this.initAudioElement();
      void this.syncNativeState();
      window.addEventListener("focus", () => void this.syncNativeState());
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          void this.syncNativeState();
        }
      });
    }
  }

  public async syncNativeState(): Promise<void> {
    if (typeof window === "undefined" || !androidMedia3.isNativeAndroid()) return;
    try {
      const nativeState = await androidMedia3.getPlaybackState();
      if (nativeState) {
        console.log("[LAYAM_JS] syncNativeState result:", nativeState);
        const dur = nativeState.durationMs > 0 ? nativeState.durationMs / 1000 : (this.state.duration || 0);
        const pos = nativeState.positionMs > 0 ? nativeState.positionMs / 1000 : (this.state.currentTime || 0);
        const progress = dur > 0 ? Math.min(100, (pos / dur) * 100) : 0;

        let track = this.state.currentTrack;
        if ((!track || !track.title) && (nativeState.title || nativeState.uri)) {
          track = {
            id: nativeState.uri || "native-active-track",
            title: nativeState.title || "Playing Track",
            artist: nativeState.artist || "Unknown Artist",
            album: nativeState.album || "Layam Vault",
            duration: dur,
            coverUrl: nativeState.artworkUri || undefined,
            source: "offline",
          } as unknown as Track;
        }

        this.setState({
          isPlaying: nativeState.isPlaying,
          status: nativeState.isPlaying ? "playing" : (this.state.status === "loading" ? "loading" : "paused"),
          currentTime: pos,
          duration: dur,
          progress,
          ...(track ? { currentTrack: track } : {}),
        });
      }
    } catch (e) {
      console.warn("[AudioEngine] syncNativeState error:", e);
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

  private nativePositionTimer: ReturnType<typeof setInterval> | null = null;

  private startNativePositionTicker(): void {
    this.stopNativePositionTicker();
    if (typeof window === "undefined" || !androidMedia3.isNativeAndroid()) return;

    this.nativePositionTimer = setInterval(async () => {
      if (!this.state.isPlaying) return;
      try {
        const res = (LayamNativeAudio.getPosition ? await LayamNativeAudio.getPosition() : await androidMedia3.getPlaybackState()) as { positionMs?: number; durationMs?: number } | null;
        if (res && typeof res.positionMs === "number") {
          const curSec = res.positionMs / 1000;
          const durSec = (res.durationMs && res.durationMs > 0) ? res.durationMs / 1000 : (this.state.duration || this.state.currentTrack?.duration || 0);
          const pct = durSec > 0 ? Math.min(100, (curSec / durSec) * 100) : 0;

          this.setState({
            currentTime: curSec,
            duration: durSec,
            progress: pct,
          });
        }
      } catch {}
    }, 50);
  }

  private stopNativePositionTicker(): void {
    if (this.nativePositionTimer) {
      clearInterval(this.nativePositionTimer);
      this.nativePositionTimer = null;
    }
  }

  private attachAudioListeners(): void {
    if (typeof window !== "undefined" && androidMedia3.isNativeAndroid()) {
      try {
        LayamNativeAudio.addListener("onPlaybackStateChanged", (data) => {
          console.log(`[LAYAM_JS] native playback state received: isPlaying=${data.isPlaying} state=${data.state} posMs=${data.positionMs} durMs=${data.durationMs}`);
          const isPlay = data.isPlaying;
          this.setState({
            isPlaying: isPlay,
            status: isPlay ? "playing" : (data.state === "BUFFERING" ? "buffering" : "paused"),
            currentTime: data.positionMs / 1000,
            duration: data.durationMs > 0 ? data.durationMs / 1000 : (this.state.duration || 0),
            progress: data.durationMs > 0 ? Math.min(100, (data.positionMs / data.durationMs) * 100) : 0,
          });
          if (isPlay) {
            this.startNativePositionTicker();
          } else {
            this.stopNativePositionTicker();
          }
        });

        LayamNativeAudio.addListener("onPositionDiscontinuity", (data) => {
          console.log(`[LAYAM_JS] native position discontinuity: posMs=${data.positionMs}`);
          const dur = this.state.duration || 0;
          this.setState({
            currentTime: data.positionMs / 1000,
            progress: dur > 0 ? Math.min(100, (data.positionMs / (dur * 1000)) * 100) : 0,
          });
        });

        LayamNativeAudio.addListener("onTrackChanged", (data) => {
          console.log(`[LAYAM_JS] native track changed:`, data);
          if (data.title) {
            const dur = data.durationMs > 0 ? data.durationMs / 1000 : (this.state.duration || 0);
            const current = this.state.currentTrack;
            const updatedTrack: Track = {
              ...(current || {}),
              id: current?.id || "native-track",
              title: data.title,
              artist: data.artist || current?.artist || "Unknown Artist",
              album: data.album || current?.album || "Layam Vault",
              coverImage: data.artworkUri || current?.coverImage,
              duration: dur,
              source: "offline",
            } as unknown as Track;
            this.setState({
              currentTrack: updatedTrack,
              duration: dur,
            });
          }
        });

        LayamNativeAudio.addListener("onError", (data) => {
          console.error(`[LAYAM_JS] native error received: code=${data.errorCode} msg=${data.errorMessage}`);
          this.stopNativePositionTicker();
          this.setState({
            status: "error",
            errorMessage: data.errorMessage,
            isPlaying: false,
          });
        });
      } catch (err) {
        console.warn("[AudioEngine] Native listener attachment note:", err);
      }
    }

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

    try {
      localStorage.setItem("layam_current_track", JSON.stringify(track));
    } catch {}

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

    if (typeof window !== "undefined" && androidMedia3.isNativeAndroid()) {
      const hasPerm = await androidMedia3.ensureAudioPermission();
      if (!hasPerm) {
        console.warn("[LAYAM_JS] Audio playback blocked: permission not granted");
        this.setState({
          status: "error",
          isLoading: false,
          isPlaying: false,
          errorMessage: "Storage/Audio permission denied. Please grant permission in Android settings.",
        });
        return;
      }
      let nativeUri = getNativeAudioUri(track.id) || (track as any).nativeUri || (track as any).contentUri;
      if (!nativeUri && (track.audioUrl?.startsWith("content://") || track.audioUrl?.startsWith("file://"))) {
        nativeUri = track.audioUrl;
      }
      if (!nativeUri) {
        nativeUri = finalAudioUrl;
      }
      console.log(`[LAYAM_JS] Play click: trackId=${track.id} title=${track.title} resolvedUri=${nativeUri}`);
      if (nativeUri.startsWith("blob:")) {
        console.warn(`[LAYAM_JS] WARNING: URI is blob URL on Android: ${nativeUri}`);
      }

      // ReplayGain resolution: prefer album gain if queue is an album context, otherwise track gain
      const isAlbumContext = finalQueue.length > 1 && finalQueue.every((t) => (t as any).album && (t as any).album === (track as any).album);
      const effectiveReplayGainDb = (isAlbumContext && (track as any).replayGainAlbum != null)
        ? (track as any).replayGainAlbum
        : ((track as any).replayGainTrack ?? 0);
      const effectiveReplayGainPeak = (track as any).replayGainPeak ?? 1.0;

      void androidMedia3.playTrack({
        uri: nativeUri,
        title: track.title,
        artist: track.artist,
        album: track.album || "Layam Vault",
        artworkUri: track.coverImage,
        positionMs: 0,
        replayGainDb: effectiveReplayGainDb,
        replayGainPeak: effectiveReplayGainPeak,
      });
      this.setState({
        isPlaying: true,
        isLoading: false,
        status: "playing",
        currentTrack: track,
      });
      this.startNativePositionTicker();
      this.setupMediaSession(track);
      return;
    }

    // Web Audio ReplayGain application
    const isAlbumContextWeb = finalQueue.length > 1 && finalQueue.every((t) => (t as any).album && (t as any).album === (track as any).album);
    const effectiveReplayGainDbWeb = (isAlbumContextWeb && (track as any).replayGainAlbum != null)
      ? (track as any).replayGainAlbum
      : ((track as any).replayGainTrack ?? 0);
    const effectiveReplayGainPeakWeb = (track as any).replayGainPeak ?? 1.0;
    globalDspEngine.setReplayGain(effectiveReplayGainDbWeb, effectiveReplayGainPeakWeb);

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
    if (this.state.isPlaying) {
      this.pause();
    } else {
      this.resume();
    }
  }

  public pause(): void {
    this.stopNativePositionTicker();
    if (typeof window !== "undefined" && androidMedia3.isNativeAndroid()) {
      void androidMedia3.pause();
      this.setState({ isPlaying: false, status: "paused" });
      return;
    }

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
    if (typeof window !== "undefined" && androidMedia3.isNativeAndroid()) {
      void androidMedia3.resume();
      this.setState({ isPlaying: true, status: "playing" });
      this.startNativePositionTicker();
      return;
    }

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

  private lastSeekTimestamp: number = 0;
  private pendingSeekTimer: ReturnType<typeof setTimeout> | null = null;

  public seek(percent: number, immediate: boolean = false): void {
    const dur = this.state.duration || this.audio?.duration || this.state.currentTrack?.duration || 0;
    if (dur > 0) {
      const ratio = percent > 1 ? Math.max(0, Math.min(100, percent)) / 100 : Math.max(0, Math.min(1, percent));
      const targetTime = ratio * dur;
      this.seekToTime(targetTime, immediate);
    }
  }

  public seekToTime(seconds: number, immediate: boolean = true): void {
    const dur = this.state.duration || this.audio?.duration || this.state.currentTrack?.duration || 0;
    if (dur > 0) {
      const clampedTime = Math.max(0, Math.min(dur, seconds));
      this.setState({ currentTime: clampedTime, progress: (clampedTime / dur) * 100 });

      const now = Date.now();
      if (immediate || now - this.lastSeekTimestamp >= 45) {
        this.lastSeekTimestamp = now;
        if (this.pendingSeekTimer) {
          clearTimeout(this.pendingSeekTimer);
          this.pendingSeekTimer = null;
        }
        if (typeof window !== "undefined" && androidMedia3.isNativeAndroid()) {
          void androidMedia3.seekToSeconds(clampedTime);
        } else if (this.audio) {
          this.audio.currentTime = clampedTime;
        }
      } else {
        if (this.pendingSeekTimer) clearTimeout(this.pendingSeekTimer);
        this.pendingSeekTimer = setTimeout(() => {
          this.lastSeekTimestamp = Date.now();
          this.pendingSeekTimer = null;
          if (typeof window !== "undefined" && androidMedia3.isNativeAndroid()) {
            void androidMedia3.seekToSeconds(clampedTime);
          } else if (this.audio) {
            this.audio.currentTime = clampedTime;
          }
        }, 45);
      }
    }
  }

  public seekRelative(deltaSeconds: number): void {
    const cur = this.state.currentTime;
    this.seekToTime(cur + deltaSeconds, true);
  }

  public setVolume(vol: number): void {
    const clamped = Math.max(0, Math.min(1, vol));
    if (typeof window !== "undefined" && androidMedia3.isNativeAndroid()) {
      void androidMedia3.setVolume(clamped);
    }
    if (this.audio) this.audio.volume = clamped;
    this.setState({ volume: clamped });
  }

  public setPlaybackRate(rate: number): void {
    if (this.audio) this.audio.playbackRate = rate;
    this.setState({ playbackRate: rate });
  }

  public setSleepTimer(minutes: number | "endOfTrack"): void {
    this.cancelSleepTimer();
    if (minutes === "endOfTrack") {
      this.setState({ sleepTimerSecondsRemaining: null, sleepTimerEndOnTrack: true });
    } else {
      const totalSeconds = Math.max(1, Math.round(minutes * 60));
      this.preFadeVolume = this.state.volume;
      this.setState({ sleepTimerSecondsRemaining: totalSeconds, sleepTimerEndOnTrack: false });

      this.sleepTimerInterval = setInterval(() => {
        const remaining = (this.state.sleepTimerSecondsRemaining ?? 0) - 1;
        if (remaining <= 0) {
          this.cancelSleepTimer();
          this.pause();
          this.setVolume(this.preFadeVolume);
        } else {
          if (remaining <= 5) {
            const factor = remaining / 5;
            this.setVolume(this.preFadeVolume * factor);
          }
          this.setState({ sleepTimerSecondsRemaining: remaining });
        }
      }, 1000);
    }
  }

  public cancelSleepTimer(): void {
    if (this.sleepTimerInterval) {
      clearInterval(this.sleepTimerInterval);
      this.sleepTimerInterval = null;
    }
    this.setState({ sleepTimerSecondsRemaining: null, sleepTimerEndOnTrack: false });
  }

  public playNext(): void {
    if (this.state.sleepTimerEndOnTrack) {
      this.cancelSleepTimer();
      this.pause();
      return;
    }
    const { queue, queueIndex, currentTrack } = this.state;
    if (queue.length === 0) {
      if (currentTrack) void this.playTrack(currentTrack);
      return;
    }
    let currentIdx = queueIndex;
    if (currentIdx < 0 && currentTrack) {
      currentIdx = queue.findIndex((t) => t.id === currentTrack.id);
    }
    const nextIdx = (currentIdx + 1) % queue.length;
    const nextTrack = queue[nextIdx];
    if (nextTrack) void this.playTrack(nextTrack, queue);
  }

  public playPrevious(): void {
    const { queue, queueIndex, currentTrack } = this.state;
    if (queue.length === 0) {
      if (currentTrack) void this.playTrack(currentTrack);
      return;
    }
    let currentIdx = queueIndex;
    if (currentIdx < 0 && currentTrack) {
      currentIdx = queue.findIndex((t) => t.id === currentTrack.id);
    }
    const prevIdx = (currentIdx - 1 + queue.length) % queue.length;
    const prevTrack = queue[prevIdx];
    if (prevTrack) void this.playTrack(prevTrack, queue);
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

