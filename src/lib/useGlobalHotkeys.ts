import { useEffect } from "react";
import { usePlayer } from "./player";

interface GlobalHotkeysOptions {
  onToggleConsole?: () => void;
  onToggleDac?: () => void;
  onToggleShortcuts?: () => void;
  onToggleQueue?: () => void;
}

export function useGlobalHotkeys(options: GlobalHotkeysOptions = {}) {
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    seek,
    currentTime,
    duration,
    playNext,
    playPrevious,
    volume,
    setVolume,
    isExpanded,
    expandPlayer,
    collapsePlayer,
  } = usePlayer();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      // Ignore if user is currently typing in an input, textarea or editable element
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          target.getAttribute("role") === "textbox")
      ) {
        return;
      }

      if (e.key === " " || e.code === "Space") {
        if (currentTrack) {
          e.preventDefault();
          togglePlay();
        }
      } else if (e.key === "ArrowLeft" && !e.shiftKey) {
        if (currentTrack && duration > 0) {
          e.preventDefault();
          const targetTime = Math.max(0, currentTime - 5);
          seek((targetTime / duration) * 100);
        }
      } else if (e.key === "ArrowRight" && !e.shiftKey) {
        if (currentTrack && duration > 0) {
          e.preventDefault();
          const targetTime = Math.min(duration, currentTime + 5);
          seek((targetTime / duration) * 100);
        }
      } else if (e.key === "ArrowLeft" && e.shiftKey) {
        e.preventDefault();
        playPrevious();
      } else if (e.key === "ArrowRight" && e.shiftKey) {
        e.preventDefault();
        playNext();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setVolume(Math.min(1, volume + 0.05));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setVolume(Math.max(0, volume - 0.05));
      } else if (e.key.toLowerCase() === "m" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setVolume(volume === 0 ? 0.8 : 0);
      } else if (e.key.toLowerCase() === "e" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        options.onToggleConsole?.();
      } else if (e.key.toLowerCase() === "d" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        options.onToggleDac?.();
      } else if (e.key.toLowerCase() === "f" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        if (isExpanded) collapsePlayer();
        else expandPlayer();
      } else if (e.key.toLowerCase() === "q" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        options.onToggleQueue?.();
      } else if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        options.onToggleShortcuts?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isExpanded,
    togglePlay,
    seek,
    playNext,
    playPrevious,
    setVolume,
    expandPlayer,
    collapsePlayer,
    options,
  ]);
}
