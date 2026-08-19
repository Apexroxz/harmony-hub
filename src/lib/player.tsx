import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { Track } from "@/domain/music/types";
import { LocalFavoritesService } from "@layam/storage-core";
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
  globalAudioEngine,
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
  seekToTime: (seconds: number) => void;
  seekRelative: (deltaSeconds: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  addToQueue: (track: Track) => void;
  playNextInQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  playFromQueue: (index: number) => void;
  clearQueue: () => void;
  setPlaybackRate: (rate: number) => void;
  expandPlayer: () => void;
  collapsePlayer: () => void;
  setExpanded: (expanded: boolean) => void;
  // Audio Console Modal Coordination
  isConsoleOpen: boolean;
  openConsole: () => void;
  closeConsole: () => void;
  toggleConsole: () => void;
  // EQ & DSP
  setEqGain: (bandIndex: number, gainDb: number) => void;
  setEqGains: (gains: number[], presetName?: string) => void;
  setEqPreset: (preset: string) => void;
  setEqEnabled: (enabled: boolean) => void;
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
  setSleepTimer: (minutes: number | "endOfTrack") => void;
  cancelSleepTimer: () => void;
  // Favorites Management
  isCurrentTrackFavorite: boolean;
  toggleCurrentTrackFavorite: () => Promise<boolean>;
  toggleTrackFavorite: (trackId: string) => Promise<boolean>;
  isTrackFavorite: (trackId: string) => boolean;
}

export const PlayerContext = createContext<PlayerContextValue | null>(null);
if (typeof window !== "undefined") {
  (window as any).__LAYAM_PLAYER_CONTEXT_INSTANCE__ = PlayerContext;
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [engineState, setEngineState] = useState<AudioEngineState>(
    () => globalAudioEngine.state,
  );

  // Reactive Favorites state synced across all components
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    LocalFavoritesService.getAllFavoriteIds().then((ids) => {
      setFavoriteIds(new Set(ids));
    });

    const unsubscribeFavs = LocalFavoritesService.subscribeFavorites(
      ({ trackId, isFavorite }) => {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (isFavorite) next.add(trackId);
          else next.delete(trackId);
          return next;
        });
      }
    );

    return () => {
      unsubscribeFavs();
    };
  }, []);

  // Subscribe to AudioEngine reactive updates and hook play counter
  useEffect(() => {
    const unsubscribe = globalAudioEngine.subscribe(() => {
      console.log("PLAYER PROVIDER UPDATE", {
        currentTrack: globalAudioEngine.state.currentTrack,
        isPlaying: globalAudioEngine.state.isPlaying,
      });
      setEngineState({ ...globalAudioEngine.state });
    });
    return () => {
      unsubscribe();
    };
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

  const seekToTime = useCallback((seconds: number) => {
    globalAudioEngine.seekToTime(seconds);
  }, []);

  const seekRelative = useCallback((deltaSeconds: number) => {
    globalAudioEngine.seekRelative(deltaSeconds);
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

  const playNextInQueue = useCallback((track: Track) => {
    globalAudioEngine.playNextInQueue(track);
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

  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const openConsole = useCallback(() => setIsConsoleOpen(true), []);
  const closeConsole = useCallback(() => setIsConsoleOpen(false), []);
  const toggleConsole = useCallback(() => setIsConsoleOpen((prev) => !prev), []);

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

  const setEqGains = useCallback((gains: number[], presetName?: string) => {
    globalAudioEngine.setEqGains(gains, presetName);
  }, []);

  const setEqPreset = useCallback((preset: string) => {
    globalAudioEngine.setEqPreset(preset);
  }, []);

  const toggleEq = useCallback(() => {
    globalAudioEngine.toggleEq();
  }, []);

  const setEqEnabled = useCallback((enabled: boolean) => {
    globalAudioEngine.setEqEnabled(enabled);
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

  const setSleepTimer = useCallback((minutes: number | "endOfTrack") => {
    globalAudioEngine.setSleepTimer(minutes);
  }, []);

  const cancelSleepTimer = useCallback(() => {
    globalAudioEngine.cancelSleepTimer();
  }, []);

  const isCurrentTrackFavorite = !!(
    engineState.currentTrack && favoriteIds.has(engineState.currentTrack.id)
  );

  const toggleCurrentTrackFavorite = useCallback(async () => {
    if (!engineState.currentTrack) return false;
    return LocalFavoritesService.toggleFavorite(engineState.currentTrack.id);
  }, [engineState.currentTrack]);

  const toggleTrackFavorite = useCallback(async (trackId: string) => {
    return LocalFavoritesService.toggleFavorite(trackId);
  }, []);

  const isTrackFavorite = useCallback(
    (trackId: string) => favoriteIds.has(trackId),
    [favoriteIds]
  );

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
        seekToTime,
        seekRelative,
        playNext,
        playPrevious,
        addToQueue,
        playNextInQueue,
        removeFromQueue,
        playFromQueue,
        clearQueue,
        setPlaybackRate,
        expandPlayer,
        collapsePlayer,
        setExpanded,
        isConsoleOpen,
        openConsole,
        closeConsole,
        toggleConsole,
        setEqGain,
        setEqGains,
        setEqPreset,
        setEqEnabled,
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
        setSleepTimer,
        cancelSleepTimer,
        isCurrentTrackFavorite,
        toggleCurrentTrackFavorite,
        toggleTrackFavorite,
        isTrackFavorite,
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
