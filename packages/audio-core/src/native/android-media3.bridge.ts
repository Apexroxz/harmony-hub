import { Capacitor, registerPlugin } from "@capacitor/core";

export interface NativeTrackPayload {
  uri: string;
  title?: string;
  artist?: string;
  album?: string;
  artworkUri?: string;
  positionMs?: number;
}

export interface NativePlaybackState {
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  isNative: boolean;
}

export interface ILayamNativeAudioPlugin {
  playTrack(options: NativeTrackPayload): Promise<{ success: boolean }>;
  pause(): Promise<{ success: boolean }>;
  resume(): Promise<{ success: boolean }>;
  seekTo(options: { positionMs: number }): Promise<{ success: boolean }>;
  setVolume(options: { volume: number }): Promise<{ success: boolean }>;
  setEqualizerEnabled(options: { enabled: boolean }): Promise<{ success: boolean }>;
  setEqualizerGains(options: { gains: number[] }): Promise<{ success: boolean }>;
  setBassBoostStrength(options: { strength: number }): Promise<{ success: boolean }>;
  setVirtualizerStrength(options: { strength: number }): Promise<{ success: boolean }>;
  getPlaybackState(): Promise<NativePlaybackState>;
  openDocumentPicker(): Promise<{ cancelled: boolean; files: string[] }>;
  addListener(
    eventName: "onPlaybackStateChanged",
    listenerFunc: (data: { isPlaying: boolean; state: string; positionMs: number; durationMs: number }) => void,
  ): Promise<any>;
  addListener(
    eventName: "onPositionDiscontinuity",
    listenerFunc: (data: { positionMs: number }) => void,
  ): Promise<any>;
  addListener(
    eventName: "onTrackChanged",
    listenerFunc: (data: { title: string; artist: string; album: string; artworkUri?: string; durationMs: number }) => void,
  ): Promise<any>;
  addListener(
    eventName: "onError",
    listenerFunc: (data: { errorCode: number; errorMessage: string }) => void,
  ): Promise<any>;
}

export const LayamNativeAudio = registerPlugin<ILayamNativeAudioPlugin>("LayamNativeAudio");

export class AndroidMedia3Bridge {
  private static instance: AndroidMedia3Bridge | null = null;

  private constructor() {}

  public static getInstance(): AndroidMedia3Bridge {
    if (!this.instance) {
      this.instance = new AndroidMedia3Bridge();
    }
    return this.instance;
  }

  public isNativeAndroid(): boolean {
    return (
      typeof window !== "undefined" &&
      Capacitor.isNativePlatform() &&
      Capacitor.getPlatform() === "android"
    );
  }

  public async playTrack(payload: NativeTrackPayload): Promise<boolean> {
    if (!this.isNativeAndroid()) return false;
    try {
      const res = await LayamNativeAudio.playTrack(payload);
      return res.success;
    } catch (e) {
      console.warn("[AndroidMedia3Bridge] playTrack error:", e);
      return false;
    }
  }

  public async pause(): Promise<boolean> {
    if (!this.isNativeAndroid()) return false;
    try {
      const res = await LayamNativeAudio.pause();
      return res.success;
    } catch (e) {
      console.warn("[AndroidMedia3Bridge] pause error:", e);
      return false;
    }
  }

  public async resume(): Promise<boolean> {
    if (!this.isNativeAndroid()) return false;
    try {
      const res = await LayamNativeAudio.resume();
      return res.success;
    } catch (e) {
      console.warn("[AndroidMedia3Bridge] resume error:", e);
      return false;
    }
  }

  public async seekToSeconds(seconds: number): Promise<boolean> {
    if (!this.isNativeAndroid()) return false;
    try {
      const res = await LayamNativeAudio.seekTo({ positionMs: Math.round(seconds * 1000) });
      return res.success;
    } catch (e) {
      console.warn("[AndroidMedia3Bridge] seekTo error:", e);
      return false;
    }
  }

  public async setVolume(volume: number): Promise<boolean> {
    if (!this.isNativeAndroid()) return false;
    try {
      const res = await LayamNativeAudio.setVolume({ volume: Math.max(0, Math.min(1, volume)) });
      return res.success;
    } catch (e) {
      console.warn("[AndroidMedia3Bridge] setVolume error:", e);
      return false;
    }
  }

  public async setEqualizerEnabled(enabled: boolean): Promise<boolean> {
    if (!this.isNativeAndroid()) return false;
    try {
      const res = await LayamNativeAudio.setEqualizerEnabled({ enabled });
      return res.success;
    } catch (e) {
      console.warn("[AndroidMedia3Bridge] setEqualizerEnabled error:", e);
      return false;
    }
  }

  public async setEqualizerGains(gains: number[]): Promise<boolean> {
    if (!this.isNativeAndroid()) return false;
    try {
      const res = await LayamNativeAudio.setEqualizerGains({ gains });
      return res.success;
    } catch (e) {
      console.warn("[AndroidMedia3Bridge] setEqualizerGains error:", e);
      return false;
    }
  }

  public async setBassBoostStrength(strength: number): Promise<boolean> {
    if (!this.isNativeAndroid()) return false;
    try {
      const res = await LayamNativeAudio.setBassBoostStrength({ strength });
      return res.success;
    } catch (e) {
      console.warn("[AndroidMedia3Bridge] setBassBoostStrength error:", e);
      return false;
    }
  }

  public async setVirtualizerStrength(strength: number): Promise<boolean> {
    if (!this.isNativeAndroid()) return false;
    try {
      const res = await LayamNativeAudio.setVirtualizerStrength({ strength });
      return res.success;
    } catch (e) {
      console.warn("[AndroidMedia3Bridge] setVirtualizerStrength error:", e);
      return false;
    }
  }

  public async getPlaybackState(): Promise<NativePlaybackState | null> {
    if (!this.isNativeAndroid()) return null;
    try {
      return await LayamNativeAudio.getPlaybackState();
    } catch {
      return null;
    }
  }

  public async openDocumentPicker(): Promise<string[]> {
    if (!this.isNativeAndroid()) return [];
    try {
      const result = await LayamNativeAudio.openDocumentPicker();
      return result.cancelled ? [] : result.files;
    } catch (e) {
      console.warn("[AndroidMedia3Bridge] openDocumentPicker error:", e);
      return [];
    }
  }
}

export const androidMedia3 = AndroidMedia3Bridge.getInstance();
