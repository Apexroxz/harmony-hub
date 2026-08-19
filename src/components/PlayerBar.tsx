import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ListMusic,
  Gauge,
  X,
  Trash2,
  Loader2,
  AlertCircle,
  Sliders,
  Maximize2,
  Disc3,
  Heart,
} from "lucide-react";
import { toast } from "sonner";
import { usePlayer, PLAYBACK_RATES } from "@/lib/player";
import { formatDuration } from "@/domain/music/types";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Waveform } from "@/components/Waveform";
import { useAppMode } from "@/lib/mode";
import { cn } from "@/lib/utils";

export function PlayerBar() {
  const {
    currentTrack,
    status,
    errorMessage,
    isPlaying,
    isLoading,
    progress,
    volume,
    currentTime,
    duration,
    queue,
    queueIndex,
    playbackRate,
    eqEnabled,
    togglePlay,
    playNext,
    playPrevious,
    setVolume,
    seek,
    playFromQueue,
    removeFromQueue,
    clearQueue,
    setPlaybackRate,
    isExpanded,
    expandPlayer,
    openConsole,
    toggleConsole,
    isCurrentTrackFavorite,
    toggleCurrentTrackFavorite,
  } = usePlayer();

  const { isOffline } = useAppMode();
  const [queueOpen, setQueueOpen] = useState(false);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPercent, setHoverPercent] = useState<number>(0);
  const [prevVolume, setPrevVolume] = useState<number>(0.8);

  const toggleMute = () => {
    if (volume > 0) {
      setPrevVolume(volume);
      setVolume(0);
    } else {
      setVolume(prevVolume > 0 ? prevVolume : 0.8);
    }
  };

  const handleVolumeWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    const next = Math.min(1, Math.max(0, Math.round((volume + delta) * 100) / 100));
    setVolume(next);
  };

  const handleSeekMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    setHoverPercent(pct * 100);
    setHoverTime(pct * duration);
  };

  const handleSeekMouseLeave = () => {
    setHoverTime(null);
  };

  // If no track is loaded, display sleek hardware standby chassis
  if (!currentTrack) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.07] bg-[#090a0c]/95 backdrop-blur-2xl shadow-[0_8px_24px_rgba(0,0,0,0.4)] pb-4 sm:pb-0">
        <div className="mx-auto flex h-[64px] sm:h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-[#111216] text-[#6b7280]">
              <Disc3 className="h-5 w-5 stroke-[1.75]" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-semibold text-[#f2f3f5]">
                Layam Audiophile Player
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-[10px] text-[#e59e38] font-medium uppercase tabular-nums">
                  64-BIT FLOAT PCM
                </span>
                <span className="text-[10px] text-[#6b7280]">· Select track to begin</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleConsole}
              className="h-8 rounded-[8px] bg-[#111216] hover:bg-[#16181e] px-3 text-xs font-mono font-medium text-[#9ba1ad] hover:text-[#f2f3f5]"
            >
              <Sliders className="h-3.5 w-3.5 mr-1.5 stroke-[1.75] text-[#e59e38]" />
              Console
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const formatLabel = currentTrack.format || currentTrack.quality || "AUDIO";
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const handleMiniPlayerTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleMiniPlayerTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX;
    if (deltaX < -45) {
      playNext();
    } else if (deltaX > 45) {
      playPrevious();
    }
    setTouchStartX(null);
  };

  return (
    <>
      {/* ── Queue Popover Drawer ── */}
      <AnimatePresence>
        {queueOpen && (
          <motion.aside
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-[74px] sm:bottom-[84px] right-3 sm:right-6 z-40 w-[94vw] sm:w-96 rounded-[14px] border border-white/[0.07] bg-[#16181e]/98 backdrop-blur-2xl shadow-[0_8px_24px_rgba(0,0,0,0.4)] overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-white/[0.07] p-3.5 bg-[#111216]">
              <div className="flex items-center gap-2">
                <ListMusic className="h-4 w-4 stroke-[1.75] text-[#e59e38]" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#f2f3f5]">
                  Queue ({queue.length})
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearQueue}
                  className="h-7 px-2 text-[10px] text-[#9ba1ad] hover:text-[#C6604F] font-mono"
                  title="Clear Queue"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1 stroke-[1.75]" /> Clear
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQueueOpen(false)}
                  className="h-7 w-7 text-[#9ba1ad] hover:text-[#f2f3f5] rounded-[6px]"
                >
                  <X className="h-4 w-4 stroke-[1.75]" />
                </Button>
              </div>
            </div>

            <ul className="max-h-[46vh] overflow-y-auto p-2 space-y-1">
              {queue.length === 0 && (
                <li className="px-4 py-8 text-center text-xs font-mono text-[#6b7280]">
                  Queue is empty
                </li>
              )}
              {queue.map((track, i) => (
                <li key={`${track.id}-${i}`}>
                  <div
                    className={cn(
                      "group flex items-center justify-between gap-3 rounded-[10px] p-2 transition-colors cursor-pointer",
                      i === queueIndex
                        ? "bg-[#1e2027]"
                        : "hover:bg-[#111216]"
                    )}
                  >
                    <button
                      onClick={() => playFromQueue(i)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left cursor-pointer"
                    >
                      <img
                        src={track.coverImage || "/placeholder.svg"}
                        alt=""
                        className="h-9 w-9 rounded-[6px] object-cover shrink-0 bg-[#060708]"
                      />
                      <div className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block truncate text-xs font-medium",
                            i === queueIndex ? "text-[#e59e38]" : "text-[#f2f3f5]"
                          )}
                        >
                          {track.title}
                        </span>
                        <span className="block truncate text-[11px] text-[var(--text-secondary,#9ba1ad)] mt-0.5">
                          {track.artistName} ·{" "}
                          <span className="font-mono text-[9px] text-[var(--text-tertiary,#6b7280)] uppercase">
                            {track.format || track.quality || "AUDIO"}
                          </span>
                        </span>
                      </div>
                    </button>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-[var(--text-tertiary,#6b7280)]">
                        {formatDuration(track.duration)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remove from queue"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromQueue(i);
                        }}
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 rounded-[6px] shrink-0 text-[var(--text-tertiary,#6b7280)] hover:text-[var(--text-primary,#f2f3f5)]"
                      >
                        <X className="h-3.5 w-3.5 stroke-[1.75]" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </motion.aside>
        )}
      </AnimatePresence>

      <div className="fixed bottom-2 left-2 right-2 sm:bottom-0 sm:left-0 sm:right-0 z-40 rounded-[14px] sm:rounded-none border border-[var(--border-subtle,rgba(255,255,255,0.07))] sm:border-t sm:border-x-0 sm:border-b-0 bg-[var(--surface-raised,#16181e)]/98 backdrop-blur-2xl shadow-[0_8px_24px_rgba(0,0,0,0.4)] overflow-hidden">
        {/* Mobile Top Scrub Progress Bar — Sunken Well with Restrained Amber Fill */}
        <div
          onClick={(e) => {
            if (!duration || duration <= 0) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            seek(pct);
          }}
          className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--surface-sunken,#060708)] block md:hidden cursor-pointer"
        >
          <div
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            className="h-full bg-[#e59e38] transition-[width] duration-100 ease-linear"
          />
        </div>

        <div className="mx-auto flex h-[62px] sm:h-[72px] max-w-7xl items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 lg:px-8">
          {/* Track Information: Clean & Spacious */}
          <div
            onTouchStart={handleMiniPlayerTouchStart}
            onTouchEnd={handleMiniPlayerTouchEnd}
            onClick={expandPlayer}
            className="flex items-center gap-3 min-w-0 flex-1 md:w-[28%] md:flex-initial cursor-pointer select-none group"
          >
            <div className="relative h-11 w-11 shrink-0 rounded-[10px] overflow-hidden bg-[var(--surface-charcoal,#111216)] border border-[var(--border-subtle,rgba(255,255,255,0.07))]">
              {currentTrack.coverImage ? (
                <img
                  src={currentTrack.coverImage}
                  alt={currentTrack.title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[var(--surface-charcoal,#111216)] text-[var(--text-tertiary,#6b7280)]">
                  <Disc3 className="h-5 w-5 stroke-[1.75] text-[#e59e38]" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs sm:text-sm font-medium text-[var(--text-primary,#f2f3f5)] tracking-tight group-hover:text-[#e59e38] transition-colors">
                {currentTrack.title}
              </p>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-[var(--text-secondary,#9ba1ad)] mt-0.5">
                <span className="truncate">
                  {currentTrack.artistName || currentTrack.artist || "Unknown Artist"}
                </span>

                <Badge
                  variant="outline"
                  className="shrink-0 font-mono text-[8px] font-medium px-1 py-0 rounded-[4px] border-[var(--border-subtle,rgba(255,255,255,0.08))] text-[var(--text-secondary,#9ba1ad)] bg-[var(--surface-charcoal,#111216)]"
                >
                  {formatLabel}
                </Badge>

                {status === "buffering" && (
                  <span className="shrink-0 text-[9px] text-[#e59e38] font-mono">
                    · Buffering
                  </span>
                )}
                {status === "error" && (
                  <span className="shrink-0 text-[9px] text-[#C6604F] font-mono flex items-center gap-0.5">
                    <AlertCircle className="h-2.5 w-2.5 stroke-[1.75]" /> Error
                  </span>
                )}
              </div>
            </div>

            {/* Desktop Favorite Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={async (e) => {
                e.stopPropagation();
                const fav = await toggleCurrentTrackFavorite();
                toast(fav ? "Added to Favorites" : "Removed from Favorites", {
                  icon: fav ? "❤️" : "🤍",
                });
              }}
              className={cn(
                "hidden md:flex h-8 w-8 shrink-0 rounded-[8px] items-center justify-center transition-colors cursor-pointer",
                isCurrentTrackFavorite
                  ? "text-[#C6604F] bg-[#C6604F]/10"
                  : "text-[var(--text-tertiary,#6b7280)] hover:text-[var(--text-primary,#f2f3f5)] hover:bg-[var(--surface-raised,#16181e)]"
              )}
              title={isCurrentTrackFavorite ? "Remove from Favorites" : "Add to Favorites"}
            >
              <Heart
                className={cn(
                  "h-4 w-4 stroke-[1.75]",
                  isCurrentTrackFavorite && "fill-current"
                )}
              />
            </motion.button>
          </div>

          {/* Mobile Right Controls: Single Amber Play/Pause */}
          <div className="flex md:hidden items-center gap-2 shrink-0">
            <motion.div whileTap={{ scale: 0.92 }}>
              <Button
                size="icon"
                aria-label={isPlaying ? "Pause" : "Play"}
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="h-10 w-10 rounded-full bg-[#e59e38] text-[#090a0c] hover:bg-[#f0ab4d] active:scale-95 transition-transform cursor-pointer"
              >
                {status === "loading" || status === "buffering" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#090a0c]" />
                ) : isPlaying ? (
                  <Pause className="h-4 w-4 fill-current stroke-[2.25] text-[#090a0c]" />
                ) : (
                  <Play className="h-4 w-4 fill-current stroke-[2.25] ml-0.5 text-[#090a0c]" />
                )}
              </Button>
            </motion.div>
          </div>

          {/* Desktop Center: Precision Transport & Waveform Seekbar */}
          <div className="hidden md:flex flex-1 flex-col items-center gap-1 max-w-xl">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Previous track"
                onClick={playPrevious}
                className="h-8 w-8 text-[var(--text-secondary,#9ba1ad)] hover:text-[var(--text-primary,#f2f3f5)] rounded-full transition-transform active:scale-92"
              >
                <SkipBack className="h-4 w-4 stroke-[2.25]" />
              </Button>

              <motion.div whileTap={{ scale: 0.92 }}>
                <Button
                  size="icon"
                  aria-label={isPlaying ? "Pause" : "Play"}
                  onClick={togglePlay}
                  className="h-9 w-9 rounded-full bg-[#e59e38] text-[#090a0c] hover:bg-[#f0ab4d] active:scale-95 transition-transform cursor-pointer"
                >
                  {status === "loading" || status === "buffering" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#090a0c]" />
                  ) : isPlaying ? (
                    <Pause className="h-4 w-4 fill-current stroke-[2.25] text-[#090a0c]" />
                  ) : (
                    <Play className="h-4 w-4 fill-current stroke-[2.25] ml-0.5 text-[#090a0c]" />
                  )}
                </Button>
              </motion.div>

              <Button
                variant="ghost"
                size="icon"
                aria-label="Next track"
                onClick={playNext}
                className="h-8 w-8 text-[var(--text-secondary,#9ba1ad)] hover:text-[var(--text-primary,#f2f3f5)] rounded-full transition-transform active:scale-92"
              >
                <SkipForward className="h-4 w-4 stroke-[2.25]" />
              </Button>
            </div>

            {/* Desktop Waveform & Seek Timeline */}
            <div className="w-full items-center gap-2.5 flex">
              <span className="w-10 text-right font-mono text-[10px] text-[var(--text-tertiary,#6b7280)] tabular-nums">
                {formatDuration(currentTime)}
              </span>

              <div
                onMouseMove={handleSeekMouseMove}
                onMouseLeave={handleSeekMouseLeave}
                className="relative flex-1 group cursor-pointer py-1"
              >
                {hoverTime !== null && (
                  <div
                    style={{ left: `${hoverPercent}%` }}
                    className="absolute -top-6 -translate-x-1/2 rounded-[4px] bg-[var(--surface-raised,#16181e)] border border-[var(--border-subtle,rgba(255,255,255,0.08))] px-1.5 py-0.5 font-mono text-[9px] font-medium text-[#e59e38] pointer-events-none z-30 tabular-nums shadow-sm"
                  >
                    {formatDuration(hoverTime)}
                  </div>
                )}
                <Waveform
                  seed={currentTrack.id}
                  peaks={currentTrack.waveform}
                  progress={progress}
                  onSeek={seek}
                  className="h-3 w-full"
                />
              </div>

              <span className="w-10 text-left font-mono text-[10px] text-[var(--text-tertiary,#6b7280)] tabular-nums">
                {formatDuration(duration)}
              </span>
            </div>
          </div>

          {/* Desktop Right: Controls & Volume */}
          <div className="hidden md:flex items-center justify-end gap-1.5 md:w-[28%]">
            {/* Audio Console / EQ Trigger */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleConsole}
              className={cn(
                "h-8 rounded-[8px] px-2.5 text-xs font-mono font-medium gap-1.5 transition-colors cursor-pointer",
                eqEnabled
                  ? "bg-[#e59e38]/15 text-[#e59e38]"
                  : "bg-[var(--surface-charcoal,#111216)] text-[var(--text-secondary,#9ba1ad)] hover:text-[var(--text-primary,#f2f3f5)] hover:bg-[var(--surface-raised,#16181e)]"
              )}
              title="Studio DSP Console (E)"
            >
              <Sliders className="h-3.5 w-3.5 stroke-[1.75] text-[#e59e38]" />
              <span className="hidden xl:inline">Console</span>
            </Button>

            {/* Playback Rate Selector */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSpeedOpen((o) => !o)}
                className="h-8 px-2 font-mono text-xs font-medium text-[var(--text-secondary,#9ba1ad)] hover:text-[var(--text-primary,#f2f3f5)] rounded-[8px] bg-[var(--surface-charcoal,#111216)] hover:bg-[var(--surface-raised,#16181e)]"
                title="Playback Rate"
              >
                <Gauge className="h-3.5 w-3.5 mr-1 stroke-[1.75] text-[var(--text-tertiary,#6b7280)]" />
                {playbackRate}x
              </Button>

              <AnimatePresence>
                {speedOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute bottom-full right-0 mb-2 rounded-[10px] border border-[var(--border-subtle,rgba(255,255,255,0.07))] bg-[var(--surface-raised,#16181e)] p-1 shadow-[0_8px_24px_rgba(0,0,0,0.4)] z-50 min-w-[70px]"
                  >
                    {PLAYBACK_RATES.map((rate) => (
                      <button
                        key={rate}
                        onClick={() => {
                          setPlaybackRate(rate);
                          setSpeedOpen(false);
                        }}
                        className={cn(
                          "w-full rounded-[6px] px-2.5 py-1 text-left font-mono text-xs transition-colors cursor-pointer",
                          playbackRate === rate
                            ? "bg-[#e59e38]/15 text-[#e59e38] font-medium"
                            : "text-[var(--text-secondary,#9ba1ad)] hover:bg-[var(--surface-active,#1e2027)] hover:text-[var(--text-primary,#f2f3f5)]"
                        )}
                      >
                        {rate}x
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Queue Toggle */}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle playback queue"
              onClick={() => setQueueOpen((o) => !o)}
              className={cn(
                "h-8 w-8 rounded-[8px] bg-[var(--surface-charcoal,#111216)] hover:bg-[var(--surface-raised,#16181e)] text-[var(--text-secondary,#9ba1ad)] hover:text-[var(--text-primary,#f2f3f5)] relative transition-colors cursor-pointer",
                queueOpen && "text-[#e59e38] bg-[var(--surface-active,#1e2027)]"
              )}
              title="Queue"
            >
              <ListMusic className="h-4 w-4 stroke-[1.75]" />
              {queue.length > 0 && (
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[#e59e38]" />
              )}
            </Button>

            {/* Expand Fullscreen */}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Expand Audiophile Player"
              onClick={expandPlayer}
              className="h-8 w-8 rounded-[8px] bg-[var(--surface-charcoal,#111216)] hover:bg-[var(--surface-raised,#16181e)] text-[var(--text-secondary,#9ba1ad)] hover:text-[var(--text-primary,#f2f3f5)] transition-colors cursor-pointer"
              title="Expand (F)"
            >
              <Maximize2 className="h-4 w-4 stroke-[1.75]" />
            </Button>

            {/* Precision Volume */}
            <div
              onWheel={handleVolumeWheel}
              className="flex items-center gap-1.5 pl-1"
              title="Volume"
            >
              <Button
                variant="ghost"
                size="icon"
                aria-label={volume === 0 ? "Unmute" : "Mute"}
                onClick={toggleMute}
                className="h-8 w-8 text-[var(--text-tertiary,#6b7280)] hover:text-[var(--text-primary,#f2f3f5)] rounded-[8px] cursor-pointer"
              >
                {volume === 0 ? (
                  <VolumeX className="h-4 w-4 stroke-[1.75] text-[#C6604F]" />
                ) : (
                  <Volume2 className="h-4 w-4 stroke-[1.75]" />
                )}
              </Button>
              <Slider
                value={[volume * 100]}
                min={0}
                max={100}
                step={1}
                onValueChange={(vals) => setVolume(vals[0] / 100)}
                className="w-20"
                aria-label="Playback Volume"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default PlayerBar;
