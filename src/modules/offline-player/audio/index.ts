/**
 * Layam Offline Player v1 — Audio Engine & DSP Module Boundaries
 *
 * Provides interfaces and migration facade for pure Web Audio DSP processing.
 */

import type {
  OfflineTrack,
  OfflinePlayerStatus,
  OfflineEqPreset,
  OfflineSpatialRoomPreset,
  OfflineSoundProfile,
} from "../types";
import {
  globalAudioEngine,
  globalDspEngine,
  EQ_FREQUENCIES,
  EQ_PRESETS,
  type AudioEngineState,
  type SpatialRoomPreset,
  type SoundProfile,
} from "@layam/audio-core";
import type { Track } from "@/domain/music/types";

export interface IOfflineAudioEngine {
  getState(): AudioEngineState;
  subscribe(listener: (state: AudioEngineState) => void): () => void;
  playTrack(track: OfflineTrack, queue?: OfflineTrack[]): Promise<void>;
  togglePlay(): void;
  pause(): void;
  resume(): Promise<void>;
  stop(): void;
  seek(percent: number): void;
  seekToTime(seconds: number): void;
  setVolume(volume: number): void;
  setPlaybackRate(rate: number): void;
  playNext(): void;
  playPrevious(): void;
  playFromQueue(index: number): void;
  removeFromQueue(index: number): void;
  clearQueue(): void;
  getAnalyserNode(): AnalyserNode | null;
}

export interface IOfflineDspEngine {
  init(audioElement: HTMLAudioElement): void;
  setEnabled(enabled: boolean): void;
  setBandGain(index: number, gain: number): void;
  applyPreset(preset: OfflineEqPreset): void;
  setSoundProfile(profile: OfflineSoundProfile): void;
  setSpatialRoom(room: OfflineSpatialRoomPreset): void;
  setStereoWidth(width: number): void;
  getAnalyserNode(): AnalyserNode | null;
}

/**
 * Migration Bridge: Re-exports standard global engines wrapped in offline module types.
 */
export const offlineAudioEngine = {
  ...globalAudioEngine,
  playOfflineTrack: (track: OfflineTrack, queue?: OfflineTrack[]) =>
    globalAudioEngine.playTrack(track as unknown as Track, queue as unknown as Track[]),
};

export const offlineDspEngine = globalDspEngine;

export { EQ_FREQUENCIES, EQ_PRESETS };
