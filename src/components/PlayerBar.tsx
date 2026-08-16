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
  Sparkles,
  Maximize2,
  Disc3,
} from "lucide-react";
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
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.08] bg-[#08090B]/95 backdrop-blur-2xl shadow-[0_-8px_40px_rgba(0,0,0,0.9)]">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0D0E12] border border-[#D99A2B]/30 text-[#D99A2B] shadow-inner">
              <Disc3 className="h-6 w-6 opacity-60" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-[#f2f3f5]">
                Layam Audiophile Player
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-[10px] text-[#D99A2B] font-semibold uppercase">
                  64-BIT FLOAT PCM DIRECT
                </span>
                <span className="text-[10px] text-[#9ba1ad]">· Select or drop audio file</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleConsole}
              className="h-8 rounded-lg border border-white/[0.08] bg-[#0D0E12] px-3 text-xs font-mono font-medium text-[#9ba1ad] hover:text-[#f2f3f5] hover:border-[#D99A2B]/40"
            >
              <Sliders className="h-3.5 w-3.5 mr-1.5 text-[#D99A2B]" />
              Audio Console
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const formatLabel = currentTrack.format || currentTrack.quality || "FLAC";
  const sampleRateKhz = currentTrack.sampleRate
    ? currentTrack.sampleRate >= 1000
      ? `${(currentTrack.sampleRate / 1000).toFixed(1)} kHz`
      : `${currentTrack.sampleRate} Hz`
    : "96.0 kHz";

  return (
    <>
      {/* ── Queue Popover Drawer ── */}
      <AnimatePresence>
        {queueOpen && (
          <motion.aside
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className="fixed bottom-[88px] right-3 z-50 max-h-[58vh] w-[min(92vw,25rem)] overflow-hidden rounded-2xl border border-[#D99A2B]/25 bg-[#08090B] shadow-[0_25px_90px_rgba(0,0,0,0.98)] sm:right-6"
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3.5 bg-[#0D0E12]">
              <div className="flex items-center gap-2">
                <ListMusic className="h-4 w-4 text-[#D99A2B]" />
                <span className="text-xs font-bold font-mono uppercase tracking-wider text-[#f2f3f5]">
                  MASTER PLAY QUEUE
                </span>
                <span className="rounded bg-[#14161C] border border-[#D99A2B]/30 px-2 py-0.5 text-[10px] font-mono text-[#D99A2B] font-bold">
                  {queue.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Clear queue"
                  onClick={clearQueue}
                  className="h-7 w-7 text-[#9ba1ad] hover:text-[#f2f3f5] rounded-lg"
                  title="Clear Queue"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Close queue"
                  onClick={() => setQueueOpen(false)}
                  className="h-7 w-7 text-[#9ba1ad] hover:text-[#f2f3f5] rounded-lg"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <ul className="max-h-[46vh] overflow-y-auto p-2 space-y-1 divide-y divide-white/[0.03]">
              {queue.length === 0 && (
                <li className="px-4 py-8 text-center text-xs font-mono text-[#9ba1ad]">
                  Queue is empty. Select a track to play.
                </li>
              )}
              {queue.map((track, i) => (
                <li key={`${track.id}-${i}`}>
                  <div
                    className={cn(
                      "group flex items-center justify-between gap-3 rounded-xl p-2 transition-all cursor-pointer",
                      i === queueIndex
                        ? "bg-[#14161C] border border-[#D99A2B]/40 shadow-sm"
                        : "hover:bg-[#0D0E12] border border-transparent"
                    )}
                  >
                    <button
                      onClick={() => playFromQueue(i)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left cursor-pointer"
                    >
                      <img
                        src={track.coverImage || "/placeholder.svg"}
                        alt=""
                        className="h-10 w-10 rounded-lg object-cover shadow-sm shrink-0 bg-[#0D0E12]"
                      />
                      <div className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block truncate text-xs font-bold",
                            i === queueIndex ? "text-[#D99A2B]" : "text-[#f2f3f5]"
                          )}
                        >
                          {track.title}
                        </span>
                        <span className="block truncate text-[11px] text-[#9ba1ad] mt-0.5">
                          {track.artistName} ·{" "}
                          <span className="font-mono text-[9px] font-bold text-[#D99A2B]">
                            {track.quality || "FLAC"}
                          </span>
                        </span>
                      </div>
                    </button>

                    {i === queueIndex && (
                      <span className="rounded bg-[#D99A2B]/20 border border-[#D99A2B]/40 px-2 py-0.5 text-[9px] font-mono font-extrabold text-[#D99A2B] shrink-0">
                        NOW
                      </span>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remove from queue"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromQueue(i);
                      }}
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 rounded-md shrink-0 text-[#9ba1ad] hover:text-[#f2f3f5]"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Luxury Audiophile Floating Player Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.08] bg-[#08090B]/98 backdrop-blur-2xl shadow-[0_-10px_45px_rgba(0,0,0,0.92)]">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          {/* Left: Track Information & Master Quality Readout */}
          <div className="flex min-w-0 items-center gap-3.5 md:w-[28%]">
            <button
              onClick={expandPlayer}
              className="relative block h-13 w-13 shrink-0 overflow-hidden rounded-xl bg-[#0D0E12] shadow-md group border border-[#D99A2B]/25 text-left cursor-pointer transition-transform active:scale-95"
              title="Expand Full Audiophile Cockpit (Space/Click)"
            >
              <img
                src={currentTrack.coverImage || "/placeholder.svg"}
                alt={currentTrack.title}
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Maximize2 className="h-4 w-4 text-[#f2f3f5]" />
              </div>
            </button>

            <div className="min-w-0 flex-1">
              <button
                onClick={expandPlayer}
                className="block truncate text-xs sm:text-sm font-bold text-[#f2f3f5] hover:text-[#D99A2B] transition-colors text-left w-full cursor-pointer"
              >
                {currentTrack.title}
              </button>

              <div className="flex items-center gap-2 truncate text-xs text-[#9ba1ad] mt-0.5">
                <span className="text-xs font-medium text-[#9ba1ad] truncate">
                  {currentTrack.artistName || "Unknown Artist"}
                </span>

                {/* Audiophile Master Spec Badge */}
                <Badge
                  variant="outline"
                  className="font-mono text-[9px] font-bold px-1.5 py-0 rounded border border-[#D99A2B]/35 text-[#D99A2B] bg-[#D99A2B]/10"
                >
                  {formatLabel} · {sampleRateKhz}
                </Badge>

                {status === "buffering" && (
                  <span className="text-[10px] text-[#D99A2B] animate-pulse font-mono font-bold">
                    · Buffering
                  </span>
                )}
                {status === "loading" && (
                  <span className="text-[10px] text-[#D99A2B] animate-pulse font-mono font-bold">
                    · Loading
                  </span>
                )}
                {status === "error" && (
                  <span className="text-[10px] text-red-400 font-mono font-bold flex items-center gap-0.5">
                    <AlertCircle className="h-2.5 w-2.5" /> Error
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Center: Precision Playback Controls & Waveform Seekbar */}
          <div className="flex flex-none items-center gap-2 md:flex-1 md:flex-col md:gap-1 max-w-xl">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Previous track"
                onClick={playPrevious}
                className="h-8 w-8 text-[#9ba1ad] hover:text-[#f2f3f5] rounded-full transition-transform active:scale-90"
              >
                <SkipBack className="h-4 w-4 fill-current" />
              </Button>

              <motion.div whileTap={{ scale: 0.92 }}>
                <Button
                  size="icon"
                  aria-label={isPlaying ? "Pause" : "Play"}
                  onClick={togglePlay}
                  className="h-10 w-10 sm:h-11 sm:w-11 rounded-full shadow-[0_0_20px_rgba(217,154,43,0.35)] bg-gradient-to-b from-[#f5b84c] via-[#D99A2B] to-[#b37a1a] text-[#08090B] hover:brightness-110 active:brightness-95 border border-[#fbd38d]/50 transition-all cursor-pointer"
                >
                  {status === "loading" || status === "buffering" ? (
                    <Loader2 className="h-5 w-5 animate-spin text-[#08090B]" />
                  ) : isPlaying ? (
                    <Pause className="h-5 w-5 fill-current text-[#08090B]" />
                  ) : (
                    <Play className="h-5 w-5 fill-current ml-0.5 text-[#08090B]" />
                  )}
                </Button>
              </motion.div>

              <Button
                variant="ghost"
                size="icon"
                aria-label="Next track"
                onClick={playNext}
                className="h-8 w-8 text-[#9ba1ad] hover:text-[#f2f3f5] rounded-full transition-transform active:scale-90"
              >
                <SkipForward className="h-4 w-4 fill-current" />
              </Button>
            </div>

            {/* Desktop Waveform & Seek Timeline */}
            <div className="hidden w-full items-center gap-2.5 md:flex">
              <span className="w-10 text-right font-mono text-[10px] text-[#9ba1ad] tabular-nums">
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
                    className="absolute -top-6 -translate-x-1/2 rounded bg-[#0D0E12] border border-[#D99A2B]/50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#D99A2B] shadow-[0_0_10px_rgba(217,154,43,0.3)] pointer-events-none z-30 tabular-nums"
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

              <span className="w-10 text-left font-mono text-[10px] text-[#9ba1ad] tabular-nums">
                {formatDuration(duration)}
              </span>
            </div>
          </div>

          {/* Right: Studio Audio Console & Hardware Controls */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2.5 md:w-[28%]">
            {/* Audio Console / 10-Band EQ Trigger */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleConsole}
              className={cn(
                "h-8 rounded-lg px-2.5 text-xs font-mono font-bold gap-1.5 transition-all border cursor-pointer",
                eqEnabled
                  ? "border-[#D99A2B]/60 bg-[#D99A2B]/15 text-[#D99A2B] shadow-[0_0_12px_rgba(217,154,43,0.2)]"
                  : "border-white/[0.08] bg-[#0D0E12] text-[#9ba1ad] hover:text-[#f2f3f5] hover:border-white/[0.15]"
              )}
              title="Studio DSP Console & 10-Band EQ (E)"
            >
              <Sliders className="h-3.5 w-3.5 text-[#D99A2B]" />
              <span className="hidden xl:inline">Console</span>
              {eqEnabled && (
                <span className="h-1.5 w-1.5 rounded-full bg-[#D99A2B] animate-pulse" />
              )}
            </Button>

            {/* Playback Rate / Speed Selector */}
            <div className="relative hidden sm:block">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSpeedOpen((o) => !o)}
                className="h-8 px-2 font-mono text-xs font-bold text-[#9ba1ad] hover:text-[#f2f3f5] rounded-lg border border-white/[0.08] bg-[#0D0E12]"
                title="Playback Rate"
              >
                <Gauge className="h-3.5 w-3.5 mr-1 text-[#D99A2B]" />
                {playbackRate}x
              </Button>

              <AnimatePresence>
                {speedOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full right-0 mb-2 rounded-xl border border-white/[0.08] bg-[#08090B] p-1 shadow-2xl z-50 min-w-[70px]"
                  >
                    {PLAYBACK_RATES.map((rate) => (
                      <button
                        key={rate}
                        onClick={() => {
                          setPlaybackRate(rate);
                          setSpeedOpen(false);
                        }}
                        className={cn(
                          "w-full rounded-lg px-2.5 py-1 text-left font-mono text-xs transition-colors cursor-pointer",
                          playbackRate === rate
                            ? "bg-[#D99A2B]/20 text-[#D99A2B] font-bold"
                            : "text-[#9ba1ad] hover:bg-[#14161C] hover:text-[#f2f3f5]"
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
                "h-8 w-8 rounded-lg border border-white/[0.08] bg-[#0D0E12] text-[#9ba1ad] hover:text-[#f2f3f5] relative transition-colors cursor-pointer",
                queueOpen && "border-[#D99A2B]/40 text-[#D99A2B] bg-[#14161C]"
              )}
              title="Master Queue"
            >
              <ListMusic className="h-4 w-4" />
              {queue.length > 0 && (
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-[#D99A2B]" />
              )}
            </Button>

            {/* Maximize / Fullscreen Audiophile Player Trigger */}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Expand Audiophile Player"
              onClick={expandPlayer}
              className="h-8 w-8 rounded-lg border border-white/[0.08] bg-[#0D0E12] text-[#9ba1ad] hover:text-[#f2f3f5] hover:border-[#D99A2B]/40 transition-colors cursor-pointer"
              title="Expand Full Audiophile Cockpit (F)"
            >
              <Maximize2 className="h-4 w-4 text-[#D99A2B]" />
            </Button>

            {/* Precision Volume Slider with Wheel Adjustment */}
            <div
              onWheel={handleVolumeWheel}
              className="hidden items-center gap-2 lg:flex p-1 rounded-lg hover:bg-white/[0.02] transition-colors"
              title="Adjust Volume (Scroll wheel: ±5%)"
            >
              <Button
                variant="ghost"
                size="icon"
                aria-label={volume === 0 ? "Unmute" : "Mute"}
                onClick={toggleMute}
                className="h-8 w-8 text-[#9ba1ad] hover:text-[#f2f3f5] rounded-lg cursor-pointer"
                title={volume === 0 ? "Unmute" : "Mute (M)"}
              >
                {volume === 0 ? (
                  <VolumeX className="h-4 w-4 text-rose-400" />
                ) : (
                  <Volume2 className="h-4 w-4 text-[#D99A2B]" />
                )}
              </Button>
              <div className="w-18 lg:w-22">
                <Slider
                  value={[volume * 100]}
                  max={100}
                  step={1}
                  onValueChange={([val]) => setVolume((val ?? 0) / 100)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default PlayerBar;
