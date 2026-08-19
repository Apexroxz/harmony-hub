import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ListMusic,
  Sliders,
  ChevronDown,
  Loader2,
  Disc3,
  Shuffle,
  Repeat,
  X,
  Layers,
  FileText,
  Upload,
  Moon,
  Clock,
  Timer,
  Heart,
} from "lucide-react";
import { toast } from "sonner";
import { usePlayer } from "@/lib/player";
import { useAppMode, type LocalTrack } from "@/lib/mode";
import { formatDuration } from "@/domain/music/types";
import { Waveform } from "@/components/Waveform";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LocalLyricsService, type StoredTrackLyrics } from "@layam/storage-core";

interface FullscreenAudiophilePlayerProps {
  open: boolean;
  onClose: () => void;
}

export function FullscreenAudiophilePlayer({ open, onClose }: FullscreenAudiophilePlayerProps) {
  const {
    currentTrack,
    status,
    isPlaying,
    progress,
    volume,
    currentTime,
    duration,
    queue,
    queueIndex,
    eqEnabled,
    eqPreset,
    bassBoostLevel,
    normalizerEnabled,
    togglePlay,
    playNext,
    playPrevious,
    setVolume,
    seek,
    playFromQueue,
    removeFromQueue,
    clearQueue,
    openConsole,
    sleepTimerSecondsRemaining,
    sleepTimerEndOnTrack,
    setSleepTimer,
    cancelSleepTimer,
    isCurrentTrackFavorite,
    toggleCurrentTrackFavorite,
  } = usePlayer();

  const { isOffline } = useAppMode();
  const [queueDrawerOpen, setQueueDrawerOpen] = useState(false);
  const [sleepTimerModalOpen, setSleepTimerModalOpen] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [viewMode, setViewMode] = useState<"artwork" | "lyrics">("artwork");
  const [lyricsData, setLyricsData] = useState<StoredTrackLyrics | null>(null);
  const [imageError, setImageError] = useState(false);
  const lyricsFileInputRef = useRef<HTMLInputElement>(null);
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);

  // Load lyrics and reset image error when currentTrack changes
  useEffect(() => {
    setImageError(false);
    if (currentTrack?.id) {
      LocalLyricsService.getLyrics(currentTrack.id).then(setLyricsData);
    } else {
      setLyricsData(null);
    }
  }, [currentTrack?.id]);

  // Compute active lyric line index
  const activeLyricIndex = useMemo(() => {
    if (!lyricsData || !lyricsData.lines || lyricsData.lines.length === 0) return -1;
    const curTime = currentTime || 0;
    for (let i = lyricsData.lines.length - 1; i >= 0; i--) {
      const lineTime = lyricsData.lines[i]?.time ?? 0;
      if (lineTime <= curTime) {
        return i;
      }
    }
    return 0;
  }, [lyricsData, currentTime]);

  // Auto-scroll lyrics smoothly
  useEffect(() => {
    if (viewMode === "lyrics" && activeLyricIndex >= 0 && lyricsContainerRef.current) {
      const activeEl = lyricsContainerRef.current.children[activeLyricIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [viewMode, activeLyricIndex]);

  const handleImportLyricsFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentTrack) return;
    try {
      const text = await file.text();
      const saved = await LocalLyricsService.saveLrcText(
        currentTrack.id,
        text,
        currentTrack.title,
        currentTrack.artistName || (currentTrack as any).artist,
      );
      setLyricsData(saved);
      toast.success("Lyrics imported successfully");
    } catch (err) {
      console.warn("Failed to import LRC file:", err);
      toast.error("Failed to parse lyrics file");
    }
  };

  const [showRemainingTime, setShowRemainingTime] = useState(false);

  if (!open || !currentTrack) return null;

  const localMeta = currentTrack as LocalTrack;

  // Format high-res specs — Truth in audio telemetry
  const sampleRateKhz = currentTrack.sampleRate && currentTrack.sampleRate > 0
    ? currentTrack.sampleRate >= 1000
      ? `${(currentTrack.sampleRate / 1000).toFixed(1)} kHz`
      : `${currentTrack.sampleRate} Hz`
    : null;

  const bitDepthLabel = currentTrack.bitDepth && currentTrack.bitDepth > 0 ? `${currentTrack.bitDepth}-BIT` : null;
  const formatLabel = (currentTrack.format || currentTrack.quality || "AUDIO").toUpperCase();
  const specsPill = [formatLabel, bitDepthLabel, sampleRateKhz].filter(Boolean).join(" · ");
  const isTimerActive = sleepTimerSecondsRemaining !== null || sleepTimerEndOnTrack;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={0.25}
        onDragEnd={(_, info) => {
          if (info.offset.y > 100 || info.velocity.y > 500) {
            onClose();
          }
        }}
        className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-obsidian,#090a0c)] text-[var(--text-primary,#f2f3f5)] overflow-hidden select-none touch-pan-y"
      >
        {/* Subtle Ambient Background Artwork Hue (Restrained) */}
        {currentTrack.coverImage && (
          <div
            className="absolute inset-0 opacity-15 blur-[100px] pointer-events-none scale-125 transition-opacity duration-700"
            style={{
              backgroundImage: `url(${currentTrack.coverImage})`,
              backgroundPosition: "center",
              backgroundSize: "cover",
            }}
          />
        )}

        {/* ── Top Bar (Layer 2 & 3 Controls) ── */}
        <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-4 pt-[max(env(safe-area-inset-top),1.25rem)] pb-2 sm:py-3 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Minimize Player"
            className="min-h-[44px] min-w-[44px] h-10 w-10 sm:h-11 sm:w-11 rounded-[10px] bg-[var(--surface-charcoal,#111216)] text-[var(--text-secondary,#9ba1ad)] hover:text-[var(--text-primary,#f2f3f5)] hover:bg-[var(--surface-raised,#16181e)] cursor-pointer transition-colors active:scale-95 flex items-center justify-center"
            title="Minimize (Esc)"
          >
            <ChevronDown className="h-5 w-5 stroke-[1.75]" />
          </Button>

          {/* Technical Specs Pill (Layer 3 — Quiet & Monospace) */}
          <div className="flex flex-col items-center text-center">
            <span className="text-[9px] font-mono font-medium uppercase tracking-wider text-[var(--text-tertiary,#6b7280)]">
              LAYAM COCKPIT
            </span>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 font-mono text-[9px] sm:text-[10px] text-[var(--text-secondary,#9ba1ad)] bg-[var(--surface-charcoal,#111216)] px-2 py-0.5 rounded-[6px] tabular-nums border border-[var(--border-subtle,rgba(255,255,255,0.06))]">
                {specsPill}
              </span>
              {isTimerActive && (
                <Badge
                  onClick={() => setSleepTimerModalOpen(true)}
                  className="font-mono text-[9px] font-medium px-2 py-0.5 rounded-[6px] text-[#e59e38] bg-[#e59e38]/15 cursor-pointer flex items-center gap-1 border-0"
                >
                  <Moon className="h-2.5 w-2.5 stroke-[1.75]" />
                  {sleepTimerSecondsRemaining !== null
                    ? `${Math.floor(sleepTimerSecondsRemaining / 60)}:${(sleepTimerSecondsRemaining % 60).toString().padStart(2, "0")}`
                    : "End of Track"}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSleepTimerModalOpen(true)}
              aria-label="Sleep Timer"
              className={cn(
                "min-h-[44px] min-w-[44px] h-10 w-10 sm:h-11 sm:w-11 rounded-[10px] bg-[var(--surface-charcoal,#111216)] hover:bg-[var(--surface-raised,#16181e)] transition-colors active:scale-95 cursor-pointer flex items-center justify-center",
                isTimerActive
                  ? "text-[#e59e38] bg-[#e59e38]/15"
                  : "text-[var(--text-secondary,#9ba1ad)] hover:text-[var(--text-primary,#f2f3f5)]"
              )}
              title="Sleep Timer"
            >
              <Moon className="h-4 w-4 stroke-[1.75]" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setQueueDrawerOpen(true)}
              aria-label="Open Queue"
              className="relative min-h-[44px] min-w-[44px] h-10 w-10 sm:h-11 sm:w-11 rounded-[10px] bg-[var(--surface-charcoal,#111216)] hover:bg-[var(--surface-raised,#16181e)] text-[var(--text-secondary,#9ba1ad)] hover:text-[var(--text-primary,#f2f3f5)] cursor-pointer transition-colors active:scale-95 flex items-center justify-center"
              title="Queue"
            >
              <ListMusic className="h-4 w-4 stroke-[1.75]" />
              {queue.length > 1 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#e59e38] text-[8.5px] font-mono font-bold text-[#090a0c]">
                  {queue.length}
                </span>
              )}
            </Button>
          </div>
        </header>

        {/* ── Main Player: Responsive Portrait (1-Col) & Landscape (2-Col) ── */}
        <main className="relative z-10 mx-auto flex flex-1 w-full max-w-md landscape:max-w-5xl flex-col landscape:flex-row items-center justify-center px-4 sm:px-6 pt-1 pb-[max(env(safe-area-inset-bottom),1rem)] overflow-y-auto landscape:overflow-visible landscape:gap-8">
          
          {/* Left Column (Artwork / Lyrics / Switcher) */}
          <div className="flex flex-col items-center justify-center w-full landscape:w-[42%] landscape:max-w-[340px] shrink-0">
            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-[var(--surface-charcoal,#111216)] p-1 rounded-[10px] mb-3 border border-[var(--border-subtle,rgba(255,255,255,0.06))]">
              <button
                onClick={() => setViewMode("artwork")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-[6px] text-xs font-medium transition-colors cursor-pointer",
                  viewMode === "artwork"
                    ? "bg-[var(--surface-active,#1e2027)] text-[var(--text-primary,#f2f3f5)] font-semibold shadow-sm"
                    : "text-[var(--text-secondary,#9ba1ad)] hover:text-[var(--text-primary,#f2f3f5)]"
                )}
              >
                <Disc3 className="h-3.5 w-3.5 stroke-[1.75]" />
                <span>Artwork</span>
              </button>
              <button
                onClick={() => setViewMode("lyrics")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-[6px] text-xs font-medium transition-colors cursor-pointer",
                  viewMode === "lyrics"
                    ? "bg-[var(--surface-active,#1e2027)] text-[var(--text-primary,#f2f3f5)] font-semibold shadow-sm"
                    : "text-[var(--text-secondary,#9ba1ad)] hover:text-[var(--text-primary,#f2f3f5)]"
                )}
              >
                <FileText className="h-3.5 w-3.5 stroke-[1.75]" />
                <span>Lyrics</span>
              </button>
            </div>

            {/* Hidden Lyrics File Input */}
            <input
              type="file"
              ref={lyricsFileInputRef}
              onChange={handleImportLyricsFile}
              accept=".lrc,.txt,.srt"
              className="hidden"
            />

            {viewMode === "artwork" ? (
              /* Centered Artwork Frame */
              <div className="relative aspect-square w-full max-w-[min(65vw,260px)] landscape:max-w-[220px] sm:max-w-[300px] shrink-0 overflow-hidden rounded-[20px] bg-[var(--surface-charcoal,#111216)] mb-3 sm:mb-4 flex items-center justify-center border border-[var(--border-subtle,rgba(255,255,255,0.06))] shadow-lg">
                {(!currentTrack.coverImage || imageError) ? (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-[var(--surface-charcoal,#111216)] p-6 text-center select-none">
                    <div className="relative flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-[var(--surface-sunken,#060708)]">
                      <Disc3 className={cn("h-10 w-10 sm:h-12 sm:w-12 text-[#e59e38] stroke-[1.75]", isPlaying && "animate-spin")} style={{ animationDuration: '6s' }} />
                    </div>
                    <span className="mt-3 font-mono text-[9px] font-medium tracking-wider text-[var(--text-tertiary,#6b7280)] uppercase">
                      LAYAM HI-RES MASTER
                    </span>
                  </div>
                ) : (
                  <img
                    src={currentTrack.coverImage}
                    alt={currentTrack.title}
                    onError={() => setImageError(true)}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
            ) : (
              /* Synchronized Lyrics Container */
              <div className="relative w-full max-w-[340px] h-[220px] sm:h-[280px] shrink-0 overflow-hidden rounded-[20px] bg-[var(--surface-charcoal,#111216)] p-4 mb-3 sm:mb-4 flex flex-col border border-[var(--border-subtle,rgba(255,255,255,0.06))]">
                {lyricsData && lyricsData.lines && lyricsData.lines.length > 0 ? (
                  <div
                    ref={lyricsContainerRef}
                    className="flex-1 overflow-y-auto space-y-3.5 text-center py-6 px-2 scroll-smooth"
                  >
                    {lyricsData.lines.map((line, idx) => {
                      const isActive = activeLyricIndex === idx;
                      return (
                        <p
                          key={idx}
                          onClick={() => {
                            if (duration && duration > 0) {
                              seek((line.time ?? 0) / duration);
                            }
                          }}
                          className={cn(
                            "transition-colors duration-200 cursor-pointer select-none",
                            isActive
                              ? "text-[#e59e38] text-sm sm:text-base font-bold"
                              : "text-[var(--text-tertiary,#6b7280)] hover:text-[var(--text-primary,#f2f3f5)] text-xs sm:text-sm font-normal"
                          )}
                        >
                          {line.text}
                        </p>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                    <FileText className="h-7 w-7 text-[var(--text-tertiary,#6b7280)] mb-2 stroke-[1.75]" />
                    <p className="text-xs font-medium text-[var(--text-primary,#f2f3f5)]">No Synced Lyrics</p>
                    <p className="text-[11px] text-[var(--text-tertiary,#6b7280)] mt-1 max-w-xs">
                      Import an .LRC file or add lyrics in metadata.
                    </p>
                    <button
                      onClick={() => lyricsFileInputRef.current?.click()}
                      className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[var(--surface-raised,#16181e)] hover:bg-[var(--surface-active,#1e2027)] text-[#e59e38] text-xs font-mono font-medium transition-colors cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5 stroke-[1.75]" />
                      Import .LRC
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column in Landscape / Stacked in Portrait (Metadata + Waveform + Transport + Dock + Volume) */}
          <div className="flex flex-col w-full landscape:w-[58%] landscape:flex-1">
            {/* Track Identity & Favorite Button */}
            <div className="w-full flex items-center justify-between gap-3 mb-3 px-1">
              <div className="min-w-0 flex-1 text-left">
                <h1 className="text-base sm:text-lg landscape:text-base font-bold tracking-tight text-[var(--text-primary,#f2f3f5)] truncate">
                  {currentTrack.title}
                </h1>
                <p className="text-xs sm:text-sm text-[var(--text-secondary,#9ba1ad)] mt-0.5 truncate">
                  {currentTrack.artistName || "Unknown Artist"}
                </p>
                {localMeta.album && (
                  <p className="text-[11px] font-mono text-[var(--text-tertiary,#6b7280)] mt-0.5 truncate">
                    {localMeta.album}
                  </p>
                )}
              </div>

              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={async (e) => {
                  e.stopPropagation();
                  const fav = await toggleCurrentTrackFavorite();
                  toast(fav ? "Added to Favorites" : "Removed from Favorites", {
                    icon: fav ? "❤️" : "🤍",
                  });
                }}
                className={cn(
                  "min-h-[44px] min-w-[44px] h-10 w-10 shrink-0 rounded-[10px] flex items-center justify-center transition-colors cursor-pointer border border-[var(--border-subtle,rgba(255,255,255,0.06))]",
                  isCurrentTrackFavorite
                    ? "text-[#C6604F] bg-[#C6604F]/10"
                    : "bg-[var(--surface-charcoal,#111216)] text-[var(--text-tertiary,#6b7280)] hover:text-[var(--text-primary,#f2f3f5)] hover:bg-[var(--surface-raised,#16181e)]"
                )}
                title={isCurrentTrackFavorite ? "Remove from Favorites" : "Add to Favorites"}
              >
                <Heart
                  className={cn(
                    "h-5 w-5 stroke-[1.75]",
                    isCurrentTrackFavorite && "fill-current"
                  )}
                />
              </motion.button>
            </div>

            {/* Waveform Scrubber & Exact Monospace Timestamps */}
            <div className="w-full space-y-1 mb-3 sm:mb-4">
              <div className="h-6 sm:h-7 w-full px-1">
                <Waveform
                  seed={currentTrack.id}
                  peaks={currentTrack.waveform}
                  progress={progress}
                  onSeek={seek}
                  className="h-6 sm:h-7 w-full"
                />
              </div>
              <div className="flex justify-between text-xs font-mono text-[var(--text-tertiary,#6b7280)] tabular-nums px-1">
                <span>{formatDuration(currentTime)}</span>
                <button
                  onClick={() => setShowRemainingTime((prev) => !prev)}
                  className="hover:text-[var(--text-primary,#f2f3f5)] transition-colors cursor-pointer select-none"
                  title="Toggle remaining time"
                >
                  {showRemainingTime
                    ? `-${formatDuration(Math.max(0, (duration || 0) - (currentTime || 0)))}`
                    : formatDuration(duration)}
                </button>
              </div>
            </div>

            {/* Primary Transport Controls */}
            <div className="flex items-center justify-center gap-4 sm:gap-6 mb-3 sm:mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsShuffle((s) => !s)}
                className={cn(
                  "min-h-[44px] min-w-[44px] h-9 w-9 rounded-full transition-colors cursor-pointer flex items-center justify-center",
                  isShuffle
                    ? "text-[#e59e38] bg-[#e59e38]/15"
                    : "text-[var(--text-tertiary,#6b7280)] hover:text-[var(--text-primary,#f2f3f5)]"
                )}
                aria-label="Shuffle"
                title="Shuffle"
              >
                <Shuffle className="h-4 w-4 stroke-[1.75]" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={playPrevious}
                className="min-h-[44px] min-w-[44px] h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-[var(--surface-charcoal,#111216)] text-[var(--text-secondary,#9ba1ad)] hover:text-[var(--text-primary,#f2f3f5)] hover:bg-[var(--surface-raised,#16181e)] cursor-pointer transition-transform active:scale-90 flex items-center justify-center border border-[var(--border-subtle,rgba(255,255,255,0.06))]"
                aria-label="Previous track"
              >
                <SkipBack className="h-5 w-5 stroke-[2.25]" />
              </Button>

              <motion.div whileTap={{ scale: 0.92 }}>
                <Button
                  size="icon"
                  onClick={togglePlay}
                  className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-[#e59e38] text-[#090a0c] hover:bg-[#f0ab4d] active:scale-95 transition-transform cursor-pointer shadow-md flex items-center justify-center"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {status === "loading" || status === "buffering" ? (
                    <Loader2 className="h-6 w-6 animate-spin text-[#090a0c]" />
                  ) : isPlaying ? (
                    <Pause className="h-6 w-6 sm:h-7 sm:w-7 fill-current stroke-[2.25] text-[#090a0c]" />
                  ) : (
                    <Play className="h-6 w-6 sm:h-7 sm:w-7 fill-current stroke-[2.25] ml-1 text-[#090a0c]" />
                  )}
                </Button>
              </motion.div>

              <Button
                variant="ghost"
                size="icon"
                onClick={playNext}
                className="min-h-[44px] min-w-[44px] h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-[var(--surface-charcoal,#111216)] text-[var(--text-secondary,#9ba1ad)] hover:text-[var(--text-primary,#f2f3f5)] hover:bg-[var(--surface-raised,#16181e)] cursor-pointer transition-transform active:scale-90 flex items-center justify-center border border-[var(--border-subtle,rgba(255,255,255,0.06))]"
                aria-label="Next track"
              >
                <SkipForward className="h-5 w-5 stroke-[2.25]" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsRepeat((r) => !r)}
                className={cn(
                  "min-h-[44px] min-w-[44px] h-9 w-9 rounded-full transition-colors cursor-pointer flex items-center justify-center",
                  isRepeat
                    ? "text-[#e59e38] bg-[#e59e38]/15"
                    : "text-[var(--text-tertiary,#6b7280)] hover:text-[var(--text-primary,#f2f3f5)]"
                )}
                aria-label="Repeat"
                title="Repeat"
              >
                <Repeat className="h-4 w-4 stroke-[1.75]" />
              </Button>
            </div>

            {/* Symmetrical Audiophile Dock */}
            <div className="grid grid-cols-3 gap-2 w-full rounded-[14px] bg-[var(--surface-charcoal,#111216)] p-2 mb-3 text-xs font-mono border border-[var(--border-subtle,rgba(255,255,255,0.06))]">
              {/* EQ Button */}
              <button
                onClick={openConsole}
                className={cn(
                  "flex flex-col items-center justify-center py-1.5 px-2 rounded-[8px] transition-colors cursor-pointer min-h-[40px]",
                  eqEnabled
                    ? "bg-[#e59e38]/15 text-[#e59e38]"
                    : "text-[var(--text-secondary,#9ba1ad)] hover:bg-[var(--surface-raised,#16181e)] hover:text-[var(--text-primary,#f2f3f5)]"
                )}
              >
                <span className="text-[8.5px] uppercase tracking-wider text-[var(--text-tertiary,#6b7280)]">
                  EQUALIZER
                </span>
                <div className="flex items-center gap-1 mt-0.5 font-medium text-[11px]">
                  <Sliders className="h-3 w-3 stroke-[1.75]" />
                  <span>{eqEnabled ? eqPreset : "BYPASS"}</span>
                </div>
              </button>

              {/* DSP Button */}
              <button
                onClick={openConsole}
                className={cn(
                  "flex flex-col items-center justify-center py-1.5 px-2 rounded-[8px] transition-colors cursor-pointer min-h-[40px]",
                  bassBoostLevel > 0 || normalizerEnabled
                    ? "bg-[#e59e38]/15 text-[#e59e38]"
                    : "text-[var(--text-secondary,#9ba1ad)] hover:bg-[var(--surface-raised,#16181e)] hover:text-[var(--text-primary,#f2f3f5)]"
                )}
              >
                <span className="text-[8.5px] uppercase tracking-wider text-[var(--text-tertiary,#6b7280)]">
                  DSP ENGINE
                </span>
                <div className="flex items-center gap-1 mt-0.5 font-medium text-[11px]">
                  <Layers className="h-3 w-3 stroke-[1.75]" />
                  <span>{bassBoostLevel > 0 ? `+${bassBoostLevel}dB` : "STUDIO"}</span>
                </div>
              </button>

              {/* Queue Button */}
              <button
                onClick={() => setQueueDrawerOpen(true)}
                className="flex flex-col items-center justify-center py-1.5 px-2 rounded-[8px] text-[var(--text-secondary,#9ba1ad)] hover:bg-[var(--surface-raised,#16181e)] hover:text-[var(--text-primary,#f2f3f5)] transition-colors cursor-pointer min-h-[40px]"
              >
                <span className="text-[8.5px] uppercase tracking-wider text-[var(--text-tertiary,#6b7280)]">
                  UP NEXT
                </span>
                <div className="flex items-center gap-1 mt-0.5 font-medium text-[11px]">
                  <ListMusic className="h-3 w-3 stroke-[1.75]" />
                  <span>{queue.length} TRACKS</span>
                </div>
              </button>
            </div>

            {/* Volume Slider */}
            <div className="flex items-center gap-2.5 w-full px-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
                className="min-h-[40px] min-w-[40px] h-8 w-8 text-[var(--text-tertiary,#6b7280)] hover:text-[var(--text-primary,#f2f3f5)] rounded-[8px]"
              >
                {volume === 0 ? (
                  <VolumeX className="h-4 w-4 stroke-[1.75] text-[#C6604F]" />
                ) : (
                  <Volume2 className="h-4 w-4 stroke-[1.75]" />
                )}
              </Button>
              <Slider
                value={[volume * 100]}
                max={100}
                step={1}
                onValueChange={([val]) => setVolume((val ?? 0) / 100)}
                className="flex-1"
              />
              <span className="w-8 text-right font-mono text-[10px] text-[var(--text-tertiary,#6b7280)] tabular-nums">
                {Math.round(volume * 100)}%
              </span>
            </div>
          </div>
        </main>

        {/* ── Slide-Over Up Next Queue Drawer ── */}
        <AnimatePresence>
          {queueDrawerOpen && (
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#16181e] shadow-[0_8px_24px_rgba(0,0,0,0.4)] flex flex-col p-6"
            >
              <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
                <div className="flex items-center gap-2">
                  <ListMusic className="h-4 w-4 stroke-[1.75] text-[#e59e38]" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-[#f2f3f5]">
                    Queue ({queue.length})
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  {queue.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearQueue}
                      className="h-7 text-xs font-mono text-[#9ba1ad] hover:text-[#C6604F]"
                    >
                      Clear
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQueueDrawerOpen(false)}
                    className="h-8 w-8 rounded-[8px] text-[#9ba1ad] hover:text-[#f2f3f5]"
                  >
                    <X className="h-4 w-4 stroke-[1.75]" />
                  </Button>
                </div>
              </div>

              <ul className="flex-1 overflow-y-auto divide-y divide-white/[0.04] py-2">
                {queue.map((track, i) => (
                  <li
                    key={`${track.id}-${i}`}
                    className={cn(
                      "flex items-center justify-between gap-3 p-2.5 rounded-[10px] transition-colors cursor-pointer group",
                      i === queueIndex
                        ? "bg-[#1e2027]"
                        : "hover:bg-[#111216]"
                    )}
                    onClick={() => playFromQueue(i)}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <img
                        src={track.coverImage || "/placeholder.svg"}
                        alt={track.title}
                        className="h-9 w-9 rounded-[6px] object-cover bg-[#060708]"
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-xs font-medium truncate",
                            i === queueIndex ? "text-[#e59e38]" : "text-[#f2f3f5]"
                          )}
                        >
                          {track.title}
                        </p>
                        <p className="text-[11px] text-[#9ba1ad] truncate">
                          {track.artistName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-[#6b7280]">
                        {formatDuration(track.duration)}
                      </span>
                      {queue.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromQueue(i);
                          }}
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 rounded-[6px] text-[#6b7280] hover:text-[#f2f3f5]"
                        >
                          <X className="h-3.5 w-3.5 stroke-[1.75]" />
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </motion.aside>
          )}

          {/* ── Sleep Timer Sheet ── */}
          {sleepTimerModalOpen && (
            <motion.div
              key="sleep-timer-sheet"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={() => setSleepTimerModalOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.98 }}
                className="w-full max-w-sm rounded-[14px] bg-[#16181e] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.4)] space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
                  <div className="flex items-center gap-2 text-[#e59e38]">
                    <Moon className="h-4 w-4 stroke-[1.75]" />
                    <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#f2f3f5]">
                      Sleep Timer
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSleepTimerModalOpen(false)}
                    className="h-7 w-7 rounded-[6px] text-[#9ba1ad] hover:text-[#f2f3f5]"
                  >
                    <X className="h-4 w-4 stroke-[1.75]" />
                  </Button>
                </div>

                <p className="text-xs text-[#9ba1ad]">
                  Playback gradually fades out over 5 seconds before pausing.
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  {[15, 30, 45, 60].map((mins) => {
                    const isSelected =
                      sleepTimerSecondsRemaining !== null &&
                      Math.abs(sleepTimerSecondsRemaining - mins * 60) < 60;
                    return (
                      <button
                        key={mins}
                        onClick={() => {
                          setSleepTimer(mins);
                          setSleepTimerModalOpen(false);
                        }}
                        className={cn(
                          "flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-[8px] font-mono text-xs font-medium transition-colors active:scale-95 cursor-pointer",
                          isSelected
                            ? "bg-[#e59e38] text-[#090a0c]"
                            : "bg-[#111216] text-[#f2f3f5] hover:bg-[#1e2027]"
                        )}
                      >
                        <Clock className="h-3.5 w-3.5 stroke-[1.75]" />
                        {mins}m
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => {
                    setSleepTimer("endOfTrack");
                    setSleepTimerModalOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-[8px] font-mono text-xs font-medium transition-colors active:scale-95 cursor-pointer",
                    sleepTimerEndOnTrack
                      ? "bg-[#e59e38] text-[#090a0c]"
                      : "bg-[#111216] text-[#f2f3f5] hover:bg-[#1e2027]"
                  )}
                >
                  <Timer className="h-3.5 w-3.5 stroke-[1.75]" />
                  End of Track
                </button>

                {(sleepTimerSecondsRemaining !== null || sleepTimerEndOnTrack) && (
                  <button
                    onClick={() => {
                      cancelSleepTimer();
                      setSleepTimerModalOpen(false);
                    }}
                    className="w-full py-2 rounded-[8px] font-mono text-xs font-medium text-[#C6604F] bg-[#C6604F]/10 hover:bg-[#C6604F]/20 transition-colors cursor-pointer"
                  >
                    Turn Off
                  </button>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}

export default FullscreenAudiophilePlayer;
