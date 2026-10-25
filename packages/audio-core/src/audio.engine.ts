import type { Track } from "@/domain/music/types";
import { getAudioBlobUrl, getNativeAudioUri, getDB, STORES } from "../../storage-core/src/indexedDbAudio";
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
  // Native position polling ticker (setInterval handle — NOT rAF for battery efficiency)
  private nativeTickerIntervalId: ReturnType<typeof setInterval> | null = null;
  private activeBlobUrl: string | null = null;
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
    } catch {}
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

  private startNativePositionTicker(): void {
    this.stopNativePositionTicker();
    if (typeof window === "undefined" || !androidMedia3.isNativeAndroid()) return;

    // High-precision 100ms ticker for liquid smooth real-time progress syncing with Android Media3
    this.nativeTickerIntervalId = setInterval(async () => {
      if (!this.state.isPlaying) {
        this.stopNativePositionTicker();
        return;
      }
      try {
        const res = await LayamNativeAudio.getPosition();
        if (res && typeof res.positionMs === "number") {
          const curSec = res.positionMs / 1000;
          const durSec =
            res.durationMs && res.durationMs > 0
              ? res.durationMs / 1000
              : this.state.duration || this.state.currentTrack?.duration || 0;
          const pct = durSec > 0 ? Math.min(100, (curSec / durSec) * 100) : 0;
          this.setState({
            currentTime: curSec,
            duration: durSec,
            progress: pct,
            ...(typeof res.isPlaying === "boolean" && res.isPlaying !== this.state.isPlaying
              ? { isPlaying: res.isPlaying, status: res.isPlaying ? "playing" : "paused" }
              : {}),
          });
        }
      } catch {}
    }, 100);
  }

  private stopNativePositionTicker(): void {
    if (this.nativeTickerIntervalId != null) {
      clearInterval(this.nativeTickerIntervalId);
      this.nativeTickerIntervalId = null;
    }
  }

  private attachAudioListeners(): void {
    if (typeof window !== "undefined" && androidMedia3.isNativeAndroid()) {
      try {
        LayamNativeAudio.addListener("onPlaybackStateChanged", (data) => {
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
          const dur = this.state.duration || 0;
          this.setState({
            currentTime: data.positionMs / 1000,
            progress: dur > 0 ? Math.min(100, (data.positionMs / (dur * 1000)) * 100) : 0,
          });
        });

        LayamNativeAudio.addListener("onTrackChanged", (data) => {
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
          this.stopNativePositionTicker();
          this.setState({
            status: "error",
            errorMessage: data.errorMessage,
            isPlaying: false,
          });
        });
      } catch {}
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

    // Record Play History in IndexedDB for Recent Masters & Analytics
    void this.recordPlayHistory(track.id);

    try {
      // Strip large data URLs before storing current track snapshot in localStorage
      const cleanTrackForStorage = {
        ...track,
        coverImage: track.coverImage && track.coverImage.startsWith("data:") ? "" : (track.coverImage || ""),
        audioUrl: "",
      };
      localStorage.setItem("layam_current_track", JSON.stringify(cleanTrackForStorage));
    } catch {}

    // Resolve audio URL: for any track stored in local IndexedDB vault, resolve live fresh blob URL
    let finalAudioUrl = "";

    try {
      const liveBlobUrl = await getAudioBlobUrl(track.id);
      if (liveBlobUrl) {
        // Revoke the previous blob URL to free its backing ArrayBuffer from memory.
        // Without this, every track play accumulates an unreleased blob URL holding
        // the full audio file in memory — catastrophic on long sessions with hi-res files.
        if (this.activeBlobUrl && this.activeBlobUrl !== liveBlobUrl) {
          try { URL.revokeObjectURL(this.activeBlobUrl); } catch {}
        }
        this.activeBlobUrl = liveBlobUrl;
        finalAudioUrl = liveBlobUrl;
        track.audioUrl = liveBlobUrl;
      }
    } catch {}

    if (!finalAudioUrl && track.audioUrl && !track.audioUrl.startsWith("blob:")) {
      finalAudioUrl = track.audioUrl;
    }

    // Only fallback to synth/online demo if NOT an imported local file
    if (!finalAudioUrl && track.source !== "offline" && !track.id.startsWith("local-")) {
      finalAudioUrl = getGuaranteedAudioUrl(track);
    }

    if (seq !== this.loadSeq) return;

    if (!finalAudioUrl) {
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

      // ReplayGain resolution: prefer album gain if queue is an album context, otherwise track gain
      const isAlbumContext = finalQueue.length > 1 && finalQueue.every((t) => (t as any).album && (t as any).album === (track as any).album);
      const effectiveReplayGainDb = (isAlbumContext && (track as any).replayGainAlbum != null)
        ? (track as any).replayGainAlbum
        : ((track as any).replayGainTrack ?? 0);
      const effectiveReplayGainPeak = (track as any).replayGainPeak ?? 1.0;

      // Map queue to native payload so ExoPlayer timeline has all items
      const qIndex = Math.max(0, finalQueue.findIndex((t) => t.id === track.id));
      const nativeQueue = finalQueue.map((t) => {
        const tUri = getNativeAudioUri(t.id) || (t as any).nativeUri || (t as any).contentUri || t.audioUrl || "";
        return {
          uri: tUri,
          title: t.title,
          artist: t.artist,
          album: t.album || "Layam Vault",
          artworkUri: t.coverImage,
        };
      }).filter((t) => !!t.uri);

      void androidMedia3.playTrack({
        uri: nativeUri,
        title: track.title,
        artist: track.artist,
        album: track.album || "Layam Vault",
        artworkUri: track.coverImage,
        positionMs: 0,
        replayGainDb: effectiveReplayGainDb,
        replayGainPeak: effectiveReplayGainPeak,
        queue: nativeQueue.length > 0 ? nativeQueue : undefined,
        queueIndex: qIndex,
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
      if (seq === this.loadSeq && !isAbort) {
        this.setState({ isPlaying: false, isLoading: false, status: "paused" });
      }
    } finally {
      if (seq === this.loadSeq) {
        this.playPromise = null;
      }
    }
  }

  private async recordPlayHistory(trackId: string): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      const db = await getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORES.PLAY_HISTORY, "readwrite");
        const store = tx.objectStore(STORES.PLAY_HISTORY);
        const req = store.put({
          id: `play-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          trackId,
          timestamp: Date.now(),
        });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {}
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
    if (!this.audio.src || this.audio.src.endsWith("/") || this.audio.src === window?.location?.href) {
      if (this.state.currentTrack) {
        void this.playTrack(this.state.currentTrack);
        return;
      }
    }
    if (this.playPromise) return;

    globalDspEngine.init(this.audio);
    void globalDspEngine.resume();

    try {
      this.playPromise = this.audio.play();
      this.playPromise
        .then(() => {
          this.setState({ isPlaying: true, status: "playing" });
        })
        .catch(() => {
          this.setState({ isPlaying: false, status: "paused" });
        })
        .finally(() => {
          this.playPromise = null;
        });
    } catch {}
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
    const cur = this.audio && !isNaN(this.audio.currentTime) ? this.audio.currentTime : this.state.currentTime;
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

  // ── DSP Delegations (Bridged to Web Audio DSP & Android AudioFX) ──

  public setEqGain(bandIndex: number, gainDb: number): void {
    const nextGains = [...this.state.eqGains];
    nextGains[bandIndex] = gainDb;
    globalDspEngine.setEqGain(bandIndex, gainDb);
    if (!this.state.eqEnabled) {
      globalDspEngine.setBypass(false);
    }
    if (typeof window !== "undefined" && androidMedia3.isNativeAndroid()) {
      void androidMedia3.setEqualizerGains(nextGains);
      void androidMedia3.setEqualizerEnabled(true);
    }
    this.setState({ eqGains: nextGains, eqPreset: "Custom", eqEnabled: true });
  }

  public setEqGains(gains: number[], presetName: string = "Custom"): void {
    globalDspEngine.setEqGains(gains);
    if (!this.state.eqEnabled) {
      globalDspEngine.setBypass(false);
    }
    if (typeof window !== "undefined" && androidMedia3.isNativeAndroid()) {
      void androidMedia3.setEqualizerGains(gains);
      void androidMedia3.setEqualizerEnabled(true);
    }
    this.setState({ eqGains: [...gains], eqPreset: presetName, eqEnabled: true });
  }

  public setEqPreset(preset: string): void {
    const gains = globalDspEngine.setEqPreset(preset);
    if (!this.state.eqEnabled) {
      globalDspEngine.setBypass(false);
    }
    if (typeof window !== "undefined" && androidMedia3.isNativeAndroid()) {
      void androidMedia3.setEqualizerGains(gains);
      void androidMedia3.setEqualizerEnabled(true);
    }
    this.setState({ eqPreset: preset, eqGains: gains, eqEnabled: true });
  }

  public setEqEnabled(enabled: boolean): void {
    globalDspEngine.setBypass(!enabled);
    if (typeof window !== "undefined" && androidMedia3.isNativeAndroid()) {
      void androidMedia3.setEqualizerEnabled(enabled);
    }
    this.setState({ eqEnabled: enabled });
  }

  public toggleEq(): void {
    const enabled = !this.state.eqEnabled;
    this.setEqEnabled(enabled);
  }

  public setBassBoostLevel(level: number): void {
    globalDspEngine.setBassBoost(level);
    if (typeof window !== "undefined" && androidMedia3.isNativeAndroid()) {
      void androidMedia3.setBassBoostStrength(Math.round(level * 100));
    }
    this.setState({ bassBoostLevel: level });
  }

  public setTrebleLevel(level: number): void {
    globalDspEngine.setTreble(level);
    this.setState({ trebleLevel: level });
  }

  public setStereoWidth(width: number): void {
    globalDspEngine.setStereoWidth(width);
    if (typeof window !== "undefined" && androidMedia3.isNativeAndroid()) {
      void androidMedia3.setVirtualizerStrength(Math.round(width * 666));
    }
    this.setState({ stereoWidth: width });
  }

  public toggleNormalizer(): void {
    const next = !this.state.normalizerEnabled;
    globalDspEngine.setNormalizer(next);
    if (typeof window !== "undefined" && androidMedia3.isNativeAndroid()) {
      void androidMedia3.setNormalizerEnabled(next);
    }
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

    if (typeof window !== "undefined" && androidMedia3.isNativeAndroid()) {
      void androidMedia3.setEqualizerGains(profile.eqGains);
      void androidMedia3.setBassBoostStrength(Math.round(profile.bassBoostLevel * 100));
      void androidMedia3.setVirtualizerStrength(Math.round(profile.stereoWidth * 666));
      void androidMedia3.setNormalizerEnabled(profile.normalizerEnabled);
      void androidMedia3.setEqualizerEnabled(true);
    }

    this.setState({
      eqGains: profile.eqGains,
      eqPreset: profile.eqPreset,
      bassBoostLevel: profile.bassBoostLevel,
      trebleLevel: profile.trebleLevel,
      stereoWidth: profile.stereoWidth,
      normalizerEnabled: profile.normalizerEnabled,
      spatialMode: profile.spatialMode,
      spatialAmbience: profile.spatialAmbience,
      eqEnabled: true,
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
      const artType = track.coverImage?.includes("image/png") ? "image/png" : "image/jpeg";
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title || "Unknown Title",
        artist: track.artistName || track.artist || "Local Artist",
        album: track.album || "Layam Audio Vault",
        artwork: track.coverImage
          ? [
              { src: track.coverImage, sizes: "96x96", type: artType },
              { src: track.coverImage, sizes: "128x128", type: artType },
              { src: track.coverImage, sizes: "256x256", type: artType },
              { src: track.coverImage, sizes: "512x512", type: artType },
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

