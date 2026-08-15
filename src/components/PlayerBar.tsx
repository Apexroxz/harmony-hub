import React, { useState, useRef, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ListMusic,
  Maximize2,
  Sliders,
  X,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { usePlayer } from "@/lib/player";
import { formatDuration } from "@/domain/music/types";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Waveform } from "@/components/Waveform";
import { useAppMode } from "@/lib/mode";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function PlayerBar() {
  const {
    currentTrack,
    status = "idle",
    isPlaying = false,
    progress = 0,
    volume = 0.8,
    currentTime = 0,
    duration = 180,
    queue = [],
    queueIndex = 0,
    eqEnabled = false,
    togglePlay,
    playNext,
    playPrevious,
    setVolume,
    seek,
    playFromQueue,
    removeFromQueue,
    clearQueue,
    isExpanded = false,
    expandPlayer,
    toggleConsole,
  } = usePlayer();

  useEffect(() => {
    console.log("[Layam Hi-Fi] PlayerBar mounted & active", {
      currentTrackTitle: currentTrack?.title,
      isPlaying,
      isExpanded,
    });
  }, [currentTrack, isPlaying, isExpanded]);

  const { isOffline, importLocalFiles } = useAppMode();
  const [queueOpen, setQueueOpen] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Drag and Drop handlers for Player
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(false);

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        toast.info(`Importing ${files.length} master track(s)...`);
        await importLocalFiles?.(files);
      }
    },
    [importLocalFiles],
  );

  const handleFileInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        toast.info(`Importing ${files.length} master track(s)...`);
        await importLocalFiles?.(files);
      }
      e.target.value = "";
    },
    [importLocalFiles],
  );

  // Never render in fullscreen mode (mutually exclusive)
  if (isExpanded) return null;

  // Defensive field extraction with safe fallbacks (supporting both active and resting/standby states)
  const hasActiveTrack = Boolean(currentTrack);
  const trackTitle = currentTrack?.title || (queue.length > 0 ? "Ready to Play" : "No Master Selected");
  const artistName =
    currentTrack?.artistName ||
    (currentTrack as any)?.artist ||
    (queue.length > 0 ? `${queue.length} track(s) in queue` : "Select a track or drop audio files");
  const albumName = currentTrack?.albumName || (currentTrack as any)?.album || "";
  const coverImage = currentTrack?.coverImage || "/logo.png";
  const formatLabel = currentTrack?.quality || (currentTrack as any)?.format || "FLAC";
  const rawSampleRate = currentTrack?.sampleRate;
  const sampleRateLabel = rawSampleRate
    ? Number(rawSampleRate) >= 1000
      ? `${(Number(rawSampleRate) / 1000).toFixed(1)} kHz`
      : `${rawSampleRate} Hz`
    : "96.0 kHz";
  const bitDepthLabel = currentTrack?.bitDepth ? `${currentTrack.bitDepth}-BIT` : "24-BIT";
  const trackDuration =
    typeof duration === "number" && !isNaN(duration) && duration > 0 ? duration : currentTrack?.duration || 180;
  const trackCurrentTime = typeof currentTime === "number" && !isNaN(currentTime) ? currentTime : 0;
  const trackProgress = typeof progress === "number" && !isNaN(progress) ? progress : 0;

  const handlePlayClick = () => {
    if (hasActiveTrack) {
      togglePlay();
    } else if (queue.length > 0) {
      playFromQueue(0);
    } else {
      fileInputRef.current?.click();
    }
  };

  return (
    <>
      {/* Hidden File Input for Layam Logo Add Master Button */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="audio/*,.flac,.wav,.mp3,.alac,.aac,.m4a,.ogg"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* ── Slide-up Master Queue Popover Drawer ── */}
      <AnimatePresence>
        {queueOpen && (
          <motion.aside
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            style={{
              position: "fixed",
              bottom: "96px",
              right: "16px",
              zIndex: 10000,
              backgroundColor: "#08090B",
            }}
            className="max-h-[58vh] w-[min(92vw,25rem)] overflow-hidden rounded-2xl border border-[#D99A2B]/25 shadow-[0_25px_70px_rgba(0,0,0,0.95)] flex flex-col"
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3.5 bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <ListMusic className="h-4 w-4 text-[#D99A2B]" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#f2f3f5]">
                  Master Play Queue
                </span>
                <span className="rounded-md bg-[#D99A2B]/10 px-2 py-0.5 text-[10px] font-mono text-[#D99A2B] border border-[#D99A2B]/20">
                  {queue.length} Tracks
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Layam Add Master Button in Queue */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 rounded-lg bg-[#D99A2B]/10 border border-[#D99A2B]/30 px-2.5 py-1 text-[11px] font-semibold text-[#D99A2B] hover:bg-[#D99A2B]/20 transition-all cursor-pointer mr-1"
                  title="Drop or Add FLAC/WAV masters"
                >
                  <img src="/logo.png" alt="Layam" className="h-3.5 w-3.5 rounded object-contain" />
                  <span>+ Add</span>
                </button>

                {queue.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Clear queue"
                    onClick={clearQueue}
                    className="h-7 w-7 text-[#9ba1ad] hover:text-red-400 rounded-lg hover:bg-white/[0.04]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Close queue"
                  onClick={() => setQueueOpen(false)}
                  className="h-7 w-7 text-[#9ba1ad] hover:text-[#f2f3f5] rounded-lg hover:bg-white/[0.04]"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Drag & Drop Zone inside Queue */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "m-3 flex items-center justify-center gap-2 rounded-xl border border-dashed p-2.5 text-center transition-all cursor-pointer",
                isDraggingOver
                  ? "border-[#D99A2B] bg-[#D99A2B]/15 text-[#D99A2B] scale-[0.99]"
                  : "border-white/[0.08] bg-white/[0.02] text-[#9ba1ad] hover:border-[#D99A2B]/40 hover:text-[#f2f3f5] hover:bg-white/[0.04]",
              )}
            >
              <img
                src="/logo.png"
                alt="Layam Emblem"
                className="h-4 w-4 rounded object-contain opacity-80"
              />
              <span className="text-[11px] font-mono">
                {isDraggingOver ? "Drop master files now" : "Drag & drop audio masters into queue"}
              </span>
            </div>

            <ul className="max-h-[42vh] overflow-y-auto px-3 pb-3 space-y-1">
              {queue.length === 0 && (
                <li className="px-4 py-8 text-center text-xs text-[#9ba1ad] font-mono">
                  Queue is empty. Select a master track to play.
                </li>
              )}
              {queue.map((track, i) => (
                <li
                  key={`${track.id || i}-${i}`}
                  onClick={() => playFromQueue(i)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs transition-colors cursor-pointer group",
                    i === queueIndex
                      ? "bg-[#D99A2B]/10 text-[#D99A2B] font-medium border border-[#D99A2B]/20"
                      : "text-[#f2f3f5] hover:bg-white/[0.04] border border-transparent",
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img
                      src={track.coverImage || "/logo.png"}
                      alt={track.title || "Track"}
                      className="h-9 w-9 rounded-lg object-cover flex-shrink-0 bg-[#121316] ring-1 ring-white/[0.06]"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "/logo.png";
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{track.title || "Untitled"}</p>
                      <p className="truncate text-[11px] text-[#9ba1ad]">
                        {track.artistName || (track as any).artist || "Local Artist"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-[#9ba1ad]">
                      {formatDuration(track.duration || 0)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromQueue(i);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-[#9ba1ad] hover:text-[#f2f3f5] p-1 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Fixed Full-Width Solid Obsidian Audiophile Hardware Cockpit ── */}
      <footer
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          backgroundColor: "#08090B",
          borderTop: "1px solid rgba(217,154,43,0.25)",
          boxShadow: "0 -12px 45px rgba(0,0,0,0.92)",
          padding: "12px 24px",
          display: "block",
          visibility: "visible",
          opacity: 1,
        }}
      >
        {isDraggingOver && (
          <div className="absolute inset-0 z-50 flex items-center justify-center gap-2 bg-[#08090B]/95 backdrop-blur-md pointer-events-none">
            <img src="/logo.png" alt="Layam" className="h-6 w-6 rounded animate-pulse" />
            <span className="text-xs font-mono font-bold text-[#D99A2B]">
              Drop Master Audio File(s) Here to Play
            </span>
          </div>
        )}

        <div className="mx-auto flex max-w-7xl flex-col gap-2">
          {/* Main Controls Row */}
          <div className="flex items-center justify-between gap-3 sm:gap-6">
            {/* 1. Track Information & Master Quality Readout */}
            <div className="flex min-w-0 items-center gap-3.5 md:w-[30%]">
              <button
                onClick={hasActiveTrack ? expandPlayer : undefined}
                className="relative block h-12 w-12 sm:h-13 sm:w-13 shrink-0 overflow-hidden rounded-xl bg-[#111216] shadow-md group border border-[#D99A2B]/30 text-left cursor-pointer transition-transform hover:scale-105"
                title={hasActiveTrack ? "Expand Audiophile Console" : "Layam Hi-Fi Vault"}
              >
                <img
                  src={coverImage}
                  alt={trackTitle}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "/logo.png";
                  }}
                />
              </button>

              <div className="min-w-0 flex-1">
                <button
                  onClick={hasActiveTrack ? expandPlayer : undefined}
                  className="block truncate text-xs sm:text-sm font-bold text-[#f2f3f5] hover:text-[#D99A2B] transition-colors text-left cursor-pointer"
                >
                  {trackTitle}
                </button>

                <div className="flex items-center gap-2 truncate mt-0.5">
                  <span className="text-xs text-[#9ba1ad] truncate font-medium">{artistName}</span>
                  {albumName && (
                    <span className="hidden sm:inline text-[11px] text-[#6b7280] truncate">
                      · {albumName}
                    </span>
                  )}
                </div>

                {/* Audiophile Hardware Badges */}
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider bg-[#D99A2B]/10 text-[#D99A2B] border border-[#D99A2B]/25">
                    PCM
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono text-[#9ba1ad] bg-white/[0.03] border border-white/[0.06]">
                    {formatLabel} · {bitDepthLabel}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono text-[#D99A2B]/90 bg-[#D99A2B]/5 border border-[#D99A2B]/20">
                    {sampleRateLabel}
                  </span>
                  {eqEnabled ? (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-1">
                      <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                      DSP ON
                    </span>
                  ) : (
                    <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-mono text-[#6b7280] bg-white/[0.02] border border-white/[0.04]">
                      DSP DIRECT
                    </span>
                  )}
                  {status === "buffering" && (
                    <span className="text-[10px] text-amber-400 animate-pulse font-mono font-bold">
                      · Buffering
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

            {/* 2. Precision Transport & Center Cockpit Controls */}
            <div className="flex flex-1 flex-col items-center justify-center max-w-xl px-2">
              <div className="flex items-center gap-3 sm:gap-5">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Previous track"
                  onClick={playPrevious}
                  disabled={!hasActiveTrack && queue.length === 0}
                  className="h-8 w-8 text-[#9ba1ad] hover:text-[#f2f3f5] hover:bg-white/[0.04] rounded-full transition-transform active:scale-95 cursor-pointer disabled:opacity-30"
                >
                  <SkipBack className="h-4 w-4 fill-current" />
                </Button>

                {/* Large Gold Hardware Circular Play Button */}
                <motion.div whileTap={{ scale: 0.93 }}>
                  <button
                    aria-label={isPlaying ? "Pause" : "Play"}
                    onClick={handlePlayClick}
                    className="h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-gradient-to-b from-[#f5b84c] via-[#D99A2B] to-[#b37a1a] text-[#08090B] shadow-[0_0_20px_rgba(217,154,43,0.35)] hover:shadow-[0_0_30px_rgba(217,154,43,0.55)] active:scale-95 transition-all flex items-center justify-center cursor-pointer border border-[#fbd38d]/40"
                  >
                    {status === "loading" || status === "buffering" ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : isPlaying ? (
                      <Pause className="h-5 w-5 fill-current" />
                    ) : (
                      <Play className="h-5 w-5 fill-current ml-0.5" />
                    )}
                  </button>
                </motion.div>

                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Next track"
                  onClick={playNext}
                  disabled={!hasActiveTrack && queue.length === 0}
                  className="h-8 w-8 text-[#9ba1ad] hover:text-[#f2f3f5] hover:bg-white/[0.04] rounded-full transition-transform active:scale-95 cursor-pointer disabled:opacity-30"
                >
                  <SkipForward className="h-4 w-4 fill-current" />
                </Button>
              </div>
            </div>

            {/* 3. Studio Hardware Utilities & Volume */}
            <div className="flex items-center justify-end gap-1.5 sm:gap-2.5 md:w-[30%]">
              {/* Layam Add Master Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="hidden xl:flex items-center gap-1.5 rounded-lg border border-[#D99A2B]/30 bg-[#D99A2B]/10 px-2.5 py-1 text-xs font-semibold text-[#D99A2B] hover:bg-[#D99A2B]/20 hover:border-[#D99A2B]/50 transition-all cursor-pointer"
                title="Add / Drop FLAC, WAV Masters"
              >
                <img src="/logo.png" alt="Layam" className="h-3.5 w-3.5 rounded object-contain" />
                <span className="text-[11px]">+ Add Master</span>
              </button>

              {/* Hardware DSP Console Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleConsole}
                className={cn(
                  "h-8 rounded-lg px-2.5 text-xs font-mono font-bold gap-1.5 transition-all border cursor-pointer",
                  eqEnabled
                    ? "border-[#D99A2B]/50 bg-[#D99A2B]/15 text-[#D99A2B] shadow-[0_0_12px_rgba(217,154,43,0.2)]"
                    : "border-white/[0.06] bg-white/[0.02] text-[#9ba1ad] hover:bg-white/[0.06] hover:text-[#f2f3f5]",
                )}
                title="Studio Audio Console & 10-Band EQ"
              >
                <Sliders className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">DSP</span>
                {eqEnabled && <span className="h-1.5 w-1.5 rounded-full bg-[#D99A2B] animate-pulse" />}
              </Button>

              {/* Master Queue Popover Toggle */}
              <Button
                variant="ghost"
                size="icon"
                aria-label="Toggle playback queue"
                onClick={() => setQueueOpen((o) => !o)}
                className={cn(
                  "h-8 w-8 rounded-lg text-[#9ba1ad] hover:text-[#f2f3f5] relative transition-colors cursor-pointer border border-white/[0.06] bg-white/[0.02]",
                  queueOpen && "bg-white/[0.08] text-[#f2f3f5] border-[#D99A2B]/40",
                )}
                title="Master Queue"
              >
                <ListMusic className="h-4 w-4" />
                {queue.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[#D99A2B]" />
                )}
              </Button>

              {/* Fullscreen Cockpit Modal Toggle */}
              <Button
                variant="ghost"
                size="icon"
                aria-label="Expand Audiophile Player"
                onClick={hasActiveTrack ? expandPlayer : undefined}
                disabled={!hasActiveTrack}
                className="h-8 w-8 rounded-lg text-[#9ba1ad] hover:text-[#f2f3f5] cursor-pointer border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] disabled:opacity-30"
                title="Expand Full Audiophile Cockpit"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>

              {/* Precision Volume Knob / Slider */}
              <div className="hidden sm:flex items-center gap-2 pl-1 border-l border-white/[0.08]">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={volume === 0 ? "Unmute" : "Mute"}
                  onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
                  className="h-8 w-8 text-[#9ba1ad] hover:text-[#f2f3f5] rounded-lg hover:bg-white/[0.04] cursor-pointer"
                >
                  {volume === 0 ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <div className="w-16 lg:w-20">
                  <Slider
                    value={[volume * 100]}
                    max={100}
                    step={1}
                    onValueChange={([val]) => setVolume(val / 100)}
                    className="cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4. Precision Hardware Waveform Seekbar Strip */}
          <div className="flex w-full items-center gap-3 pt-1 border-t border-white/[0.04]">
            <span className="w-10 text-right font-mono text-[10px] font-semibold text-[#D99A2B]/90 tabular-nums">
              {formatDuration(trackCurrentTime)}
            </span>

            <div className="relative flex-1">
              <Waveform
                seed={currentTrack?.id || "layam-resting"}
                peaks={currentTrack?.waveform}
                progress={trackProgress}
                duration={trackDuration}
                onSeek={hasActiveTrack ? seek : undefined}
                className="h-3 w-full"
              />
            </div>

            <span className="w-10 text-left font-mono text-[10px] text-[#9ba1ad] tabular-nums">
              {formatDuration(trackDuration)}
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}

export default PlayerBar;
