import React, { useState, useRef, useCallback } from "react";
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
import { useGlobalHotkeys } from "@/lib/useGlobalHotkeys";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Waveform } from "@/components/Waveform";
import { useAppMode } from "@/lib/mode";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function PlayerBar() {
  const {
    currentTrack,
    status,
    isPlaying,
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
    expandPlayer,
    toggleConsole,
  } = usePlayer();

  const { isOffline, importLocalFiles } = useAppMode();
  const [queueOpen, setQueueOpen] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Desktop audiophile hotkeys
  useGlobalHotkeys({
    onToggleConsole: toggleConsole,
    onToggleDac: () => {},
    onToggleShortcuts: () => {},
    onToggleQueue: () => setQueueOpen((o) => !o),
  });

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

      const files = e.dataTransfer.files;
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

  if (!currentTrack) return null;

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

      {/* ── Queue Popover Drawer ── */}
      <AnimatePresence>
        {queueOpen && (
          <motion.aside
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className="fixed bottom-[110px] right-4 z-50 max-h-[56vh] w-[min(92vw,24rem)] overflow-hidden rounded-3xl border border-[#D99A2B]/25 bg-[#08090B] shadow-2xl backdrop-blur-2xl sm:right-8 flex flex-col"
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3.5 bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <ListMusic className="h-4 w-4 text-[#D99A2B]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#f2f3f5]">Play Queue</span>
                <span className="rounded-full bg-[#D99A2B]/10 px-2 py-0.5 text-[10px] font-mono text-[#D99A2B] border border-[#D99A2B]/20">
                  {queue.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {/* Layam Logo Add Button in Queue Header */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 rounded-full bg-[#D99A2B]/10 border border-[#D99A2B]/30 px-2 py-0.5 text-[11px] font-semibold text-[#D99A2B] hover:bg-[#D99A2B]/20 transition-all cursor-pointer mr-1"
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
                    className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-full"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Close queue"
                  onClick={() => setQueueOpen(false)}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-full"
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
                "m-2 flex items-center justify-center gap-2 rounded-xl border border-dashed p-2 text-center transition-all cursor-pointer",
                isDraggingOver
                  ? "border-[#D99A2B] bg-[#D99A2B]/15 text-[#D99A2B] scale-[0.99]"
                  : "border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:border-[#D99A2B]/40 hover:text-foreground hover:bg-white/[0.04]",
              )}
            >
              <img
                src="/logo.png"
                alt="Layam Emblem"
                className="h-4 w-4 rounded object-contain opacity-80"
              />
              <span className="text-[11px] font-mono">
                {isDraggingOver ? "Drop master files now" : "Drag & drop audio masters here"}
              </span>
            </div>

            <ul className="max-h-[44vh] overflow-y-auto p-2 space-y-1">
              {queue.length === 0 && (
                <li className="px-4 py-8 text-center text-xs text-muted-foreground font-mono">
                  Queue is empty. Select a track or album to play.
                </li>
              )}
              {queue.map((track, i) => (
                <li
                  key={`${track.id}-${i}`}
                  onClick={() => playFromQueue(i)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-2xl px-3 py-2 text-xs transition-colors cursor-pointer group",
                    i === queueIndex
                      ? "bg-[#D99A2B]/10 text-[#D99A2B] font-medium border border-[#D99A2B]/20"
                      : "text-foreground hover:bg-white/[0.04]"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <img
                      src={track.coverImage || "/logo.png"}
                      alt={track.title}
                      className="h-8 w-8 rounded-lg object-cover flex-shrink-0 bg-surface"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "/logo.png";
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{track.title}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {track.artistName || "Local Artist"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {formatDuration(track.duration || 0)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromQueue(i);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
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

      {/* ── Fixed Floating Audiophile Hardware Cockpit Player Bar ── */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "fixed bottom-6 left-4 right-4 z-40 max-w-6xl mx-auto rounded-2xl border border-[#D99A2B]/20 bg-[#08090B] p-3 shadow-[0_20px_80px_rgba(0,0,0,0.85)] sm:px-5 sm:py-3.5 transition-all duration-200",
          isDraggingOver
            ? "border-[#D99A2B] shadow-[0_0_30px_rgba(217,154,43,0.3)] ring-2 ring-[#D99A2B]/40 scale-[1.005]"
            : "hover:border-[#D99A2B]/35"
        )}
      >
        {isDraggingOver && (
          <div className="absolute inset-0 z-50 flex items-center justify-center gap-2 rounded-2xl bg-black/80 backdrop-blur-md pointer-events-none">
            <img src="/logo.png" alt="Layam" className="h-6 w-6 rounded animate-pulse" />
            <span className="text-xs font-mono font-bold text-[#D99A2B]">
              Drop Master Audio File(s) Here to Play
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 sm:gap-4">
          {/* Left: 56x56 Album Cartridge & Track Info */}
          <div className="flex min-w-0 items-center gap-3.5 md:w-[30%]">
            <button
              onClick={expandPlayer}
              className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface group text-left cursor-pointer transition-transform hover:scale-[1.02] ring-1 ring-[#D99A2B]/30 shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
              title="Expand Audiophile Console"
            >
              <img
                src={currentTrack.coverImage || "/logo.png"}
                alt={currentTrack.title}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/logo.png";
                }}
              />
            </button>

            <div className="min-w-0 flex-1">
              <button
                onClick={expandPlayer}
                className="block truncate text-xs sm:text-sm font-bold text-[#f2f3f5] hover:text-[#D99A2B] transition-colors text-left w-full cursor-pointer tracking-tight"
              >
                {currentTrack.title || "Untitled Master"}
              </button>

              <div className="flex items-center gap-1.5 truncate text-xs text-muted-foreground mt-0.5">
                <span className="text-xs font-normal text-muted-foreground truncate">
                  {currentTrack.artistName || "Local Artist"}
                </span>

                <Badge
                  variant="outline"
                  className="font-mono text-[9px] px-1.5 py-0 border-[#D99A2B]/30 text-[#D99A2B] bg-[#D99A2B]/10 shrink-0"
                >
                  PCM · {currentTrack.quality || "FLAC"}
                  {currentTrack.sampleRate && Number(currentTrack.sampleRate) >= 96000 ? " 24/96" : ""}
                </Badge>

                {eqEnabled && (
                  <Badge
                    variant="outline"
                    className="font-mono text-[9px] px-1 py-0 border-emerald-500/30 text-emerald-400 bg-emerald-500/10 shrink-0 hidden sm:inline-flex"
                  >
                    DSP ON
                  </Badge>
                )}

                {status === "buffering" && (
                  <span className="text-[10px] text-amber-400 animate-pulse font-bold">· Buffering</span>
                )}
                {status === "loading" && (
                  <span className="text-[10px] text-[#D99A2B] animate-pulse font-bold">· Loading</span>
                )}
                {status === "error" && (
                  <span className="text-[10px] text-destructive font-bold flex items-center gap-0.5">
                    <AlertCircle className="h-2.5 w-2.5" /> Error
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Center: Precision Playback Controls & Waveform Seekbar */}
          <div className="flex flex-none items-center gap-2 md:flex-1 md:flex-col md:gap-1 max-w-xl">
            <div className="flex items-center gap-3 sm:gap-5">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Previous track"
                onClick={playPrevious}
                className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full transition-transform active:scale-95 cursor-pointer"
              >
                <SkipBack className="h-4 w-4 fill-current" />
              </Button>

              <motion.div whileTap={{ scale: 0.92 }}>
                <Button
                  size="icon"
                  aria-label={isPlaying ? "Pause" : "Play"}
                  onClick={togglePlay}
                  className="h-11 w-11 sm:h-12 sm:w-12 rounded-full shadow-lg transition-all cursor-pointer bg-gradient-to-b from-[#f5b84c] via-[#D99A2B] to-[#b37a1a] text-[#08090B] border border-[#fbd38d]/40 hover:shadow-[0_0_25px_rgba(217,154,43,0.45)]"
                >
                  {status === "loading" || status === "buffering" ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="h-5 w-5 fill-current" />
                  ) : (
                    <Play className="h-5 w-5 fill-current ml-0.5" />
                  )}
                </Button>
              </motion.div>

              <Button
                variant="ghost"
                size="icon"
                aria-label="Next track"
                onClick={playNext}
                className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full transition-transform active:scale-95 cursor-pointer"
              >
                <SkipForward className="h-4 w-4 fill-current" />
              </Button>
            </div>

            {/* Desktop Waveform & Seek Timeline */}
            <div className="hidden w-full items-center gap-2.5 md:flex">
              <span className="w-10 text-right font-mono text-[10px] font-semibold text-[#D99A2B] tabular-nums">
                {formatDuration(currentTime)}
              </span>

              <div className="relative flex-1">
                <Waveform
                  seed={currentTrack.id}
                  peaks={currentTrack.waveform}
                  progress={progress}
                  duration={duration}
                  onSeek={seek}
                  className="h-3 w-full"
                />
              </div>

              <span className="w-10 text-left font-mono text-[10px] text-muted-foreground tabular-nums">
                {formatDuration(duration)}
              </span>
            </div>
          </div>

          {/* Right: Studio Audio Console & Hardware Controls */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2.5 md:w-[30%]">
            {/* Layam Emblem Add / Drop Master Track Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="hidden xl:flex items-center gap-1 rounded-lg border border-[#D99A2B]/30 bg-[#D99A2B]/10 px-2.5 py-1 text-xs font-semibold text-[#D99A2B] hover:bg-[#D99A2B]/20 hover:border-[#D99A2B]/50 transition-all cursor-pointer"
              title="Add / Drop FLAC, WAV Masters"
            >
              <img
                src="/logo.png"
                alt="Layam"
                className="h-3.5 w-3.5 rounded object-contain"
              />
              <span className="text-[11px]">+ Add</span>
            </button>

            {/* Audio Console / 10-Band EQ Trigger */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleConsole}
              className={cn(
                "h-8 rounded-lg px-2.5 text-xs font-mono font-bold gap-1.5 transition-all border cursor-pointer",
                eqEnabled
                  ? "border-[#D99A2B]/50 bg-[#D99A2B]/15 text-[#D99A2B] shadow-[0_0_10px_rgba(217,154,43,0.2)]"
                  : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:bg-surface-raised hover:text-foreground"
              )}
              title="Studio Audio Console & 10-Band EQ"
            >
              <Sliders className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">DSP</span>
              {eqEnabled && (
                <span className="h-1.5 w-1.5 rounded-full bg-[#D99A2B] animate-pulse" />
              )}
            </Button>

            {/* Queue Toggle */}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle playback queue"
              onClick={() => setQueueOpen((o) => !o)}
              className={cn(
                "h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground relative transition-colors cursor-pointer border border-white/[0.06] bg-white/[0.02]",
                queueOpen && "bg-surface-raised text-foreground"
              )}
              title="Master Queue"
            >
              <ListMusic className="h-4 w-4" />
              {queue.length > 0 && (
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[#D99A2B]" />
              )}
            </Button>

            {/* Maximize / Fullscreen Audiophile Player Trigger */}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Expand Audiophile Player"
              onClick={expandPlayer}
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer border border-white/[0.06] bg-white/[0.02]"
              title="Expand Full Audiophile Player & Console"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>

            {/* Precision Volume */}
            <div className="hidden sm:flex items-center gap-2 pl-1 border-l border-white/[0.08]">
              <Button
                variant="ghost"
                size="icon"
                aria-label={volume === 0 ? "Unmute" : "Mute"}
                onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
              >
                {volume === 0 ? (
                  <VolumeX className="h-4 w-4 text-red-400" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
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
      </div>
    </>
  );
}

export default PlayerBar;
