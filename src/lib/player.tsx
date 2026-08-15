import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { Track } from "@/domain/music/types";
import {
  globalAudioEngine,
  type AudioEngineState,
  type PlayerStatus,
} from "./audio.engine";
import {
  globalDspEngine,
  EQ_FREQUENCIES,
  EQ_PRESETS,
  type SpatialRoomPreset,
  type SoundProfile,
} from "./dsp.engine";

export {
  EQ_FREQUENCIES,
  EQ_PRESETS,
  type SpatialRoomPreset,
  type SoundProfile,
  type PlayerStatus,
};

export const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2] as const;

export interface PlayerContextValue extends AudioEngineState {
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

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [engineState, setEngineState] = useState<AudioEngineState>(
    () => globalAudioEngine.state,
  );

  // Subscribe to AudioEngine reactive updates
  useEffect(() => {
    const unsubscribe = globalAudioEngine.subscribe(() => {
      setEngineState({ ...globalAudioEngine.state });
    });
    return unsubscribe;
  }, []);

  const playTrack = useCallback((track: Track, queue?: Track[]) => {
    void globalAudioEngine.playTrack(track, queue);
  }, []);

  const togglePlay = useCallback(() => {
    globalAudioEngine.togglePlay();
  }, []);

  const pause = useCallback(() => {
    globalAudioEngine.pause();
  }, []);

  const resume = useCallback(() => {
    globalAudioEngine.resume();
  }, []);

  const setVolume = useCallback((vol: number) => {
    globalAudioEngine.setVolume(vol);
  }, []);

  const seek = useCallback((pct: number) => {
    globalAudioEngine.seek(pct);
  }, []);

  const playNext = useCallback(() => {
    globalAudioEngine.playNext();
  }, []);

  const playPrevious = useCallback(() => {
    globalAudioEngine.playPrevious();
  }, []);

  const addToQueue = useCallback((track: Track) => {
    globalAudioEngine.addToQueue(track);
  }, []);

  const removeFromQueue = useCallback((idx: number) => {
    globalAudioEngine.removeFromQueue(idx);
  }, []);

  const playFromQueue = useCallback((idx: number) => {
    globalAudioEngine.playFromQueue(idx);
  }, []);

  const clearQueue = useCallback(() => {
    globalAudioEngine.clearQueue();
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    globalAudioEngine.setPlaybackRate(rate);
  }, []);

  const expandPlayer = useCallback(() => {
    globalAudioEngine.setExpanded(true);
  }, []);

  const collapsePlayer = useCallback(() => {
    globalAudioEngine.setExpanded(false);
  }, []);

  const setExpanded = useCallback((expanded: boolean) => {
    globalAudioEngine.setExpanded(expanded);
  }, []);

  const setEqGain = useCallback((bandIndex: number, gainDb: number) => {
    globalAudioEngine.setEqGain(bandIndex, gainDb);
  }, []);

  const setEqPreset = useCallback((preset: string) => {
    globalAudioEngine.setEqPreset(preset);
  }, []);

  const toggleEq = useCallback(() => {
    globalAudioEngine.toggleEq();
  }, []);

  const setBassBoostLevel = useCallback((level: number) => {
    globalAudioEngine.setBassBoostLevel(level);
  }, []);

  const setTrebleLevel = useCallback((level: number) => {
    globalAudioEngine.setTrebleLevel(level);
  }, []);

  const setStereoWidth = useCallback((width: number) => {
    globalAudioEngine.setStereoWidth(width);
  }, []);

  const toggleNormalizer = useCallback(() => {
    globalAudioEngine.toggleNormalizer();
  }, []);

  const setCrossfadeDuration = useCallback((secs: number) => {
    globalAudioEngine.setCrossfadeDuration(secs);
  }, []);

  const setSpatialMode = useCallback((mode: SpatialRoomPreset) => {
    globalAudioEngine.setSpatialMode(mode);
  }, []);

  const setSpatialAmbience = useCallback((ambience: number) => {
    globalAudioEngine.setSpatialAmbience(ambience);
  }, []);

  const applyFullSoundProfile = useCallback((profile: SoundProfile) => {
    globalAudioEngine.applyFullSoundProfile(profile);
  }, []);

  const getAnalyserNode = useCallback(() => {
    return globalDspEngine.getAnalyserNode();
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        ...engineState,
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
