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

      {/* ── Original 07d8597 Play Queue Popover Drawer ── */}
      <AnimatePresence>
        {queueOpen && (
          <motion.aside
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className="fixed bottom-[96px] right-3 z-50 max-h-[56vh] w-[min(92vw,24rem)] overflow-hidden rounded-3xl border border-border/80 bg-background/95 shadow-2xl backdrop-blur-2xl sm:right-6 flex flex-col"
          >
            <div className="flex items-center justify-between border-b border-border/40 px-5 py-3.5 bg-surface/50">
              <div className="flex items-center gap-2">
                <ListMusic className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">Play Queue</span>
                <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                  {queue.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {/* Layam Logo Add Button in Queue Header */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 rounded-full bg-primary/10 border border-primary/30 px-2 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/20 transition-all cursor-pointer mr-1"
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
                  ? "border-primary bg-primary/15 text-primary scale-[0.99]"
                  : "border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-white/[0.04]",
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
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-surface-raised/60"
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

      {/* ── Original 07d8597 Fixed Floating Obsidian Player Bar ── */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "fixed bottom-3 left-3 right-3 z-40 max-w-5xl mx-auto rounded-3xl border border-border/80 bg-background/95 p-3 shadow-2xl backdrop-blur-2xl sm:bottom-4 sm:left-4 sm:right-4 sm:px-4 sm:py-3 transition-all duration-200",
          isDraggingOver
            ? "border-primary shadow-[0_0_30px_rgba(229,158,56,0.3)] ring-2 ring-primary/40 scale-[1.01]"
            : "border-white/[0.08]"
        )}
      >
        {isDraggingOver && (
          <div className="absolute inset-0 z-50 flex items-center justify-center gap-2 rounded-3xl bg-black/80 backdrop-blur-md pointer-events-none">
            <img src="/logo.png" alt="Layam" className="h-6 w-6 rounded animate-pulse" />
            <span className="text-xs font-mono font-bold text-primary">
              Drop Master Audio File(s) Here to Play
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 sm:gap-4">
          {/* Left: Track Information & Expand Trigger */}
          <div className="flex min-w-0 items-center gap-3 md:w-[28%]">
            <button
              onClick={expandPlayer}
              className="relative block h-11 w-11 shrink-0 overflow-hidden rounded-2xl bg-surface group text-left cursor-pointer transition-opacity hover:opacity-80 border border-white/[0.06]"
              title="Expand player"
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
                className="block truncate text-xs sm:text-sm font-semibold text-foreground hover:text-primary transition-colors text-left w-full cursor-pointer"
              >
                {currentTrack.title || "Untitled Master"}
              </button>

              <div className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                <span className="text-xs font-normal text-muted-foreground truncate">
                  {currentTrack.artistName || "Local Artist"}
                </span>

                <Badge
                  variant="outline"
                  className="font-mono text-[9px] px-1 py-0 border-primary/30 text-primary bg-primary/5 shrink-0"
                >
                  {currentTrack.quality || "FLAC"}
                  {currentTrack.sampleRate && Number(currentTrack.sampleRate) >= 96000 ? " 24/96" : ""}
                </Badge>

                {status === "buffering" && (
                  <span className="text-[10px] text-amber-400 animate-pulse font-bold">· Buffering</span>
                )}
                {status === "loading" && (
                  <span className="text-[10px] text-primary animate-pulse font-bold">· Loading</span>
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
            <div className="flex items-center gap-2 sm:gap-4">
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
                  className={cn(
                    "h-10 w-10 sm:h-11 sm:w-11 rounded-full shadow-lg transition-all cursor-pointer",
                    isOffline
                      ? "bg-[#e59e38] text-[#090a0c] hover:bg-[#f0ab4d] shadow-[#e59e38]/25"
                      : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/25"
                  )}
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
              <span className="w-10 text-right font-mono text-[10px] text-muted-foreground tabular-nums">
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
          <div className="flex items-center justify-end gap-1.5 sm:gap-2.5 md:w-[28%]">
            {/* Layam Emblem Add / Drop Master Track Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="hidden xl:flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/20 hover:border-primary/50 transition-all cursor-pointer"
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
                "h-8 rounded-full px-2.5 text-xs font-bold gap-1.5 transition-all border cursor-pointer",
                eqEnabled
                  ? "border-primary/40 bg-primary/15 text-primary shadow-sm"
                  : "border-transparent text-muted-foreground hover:bg-surface-raised hover:text-foreground"
              )}
              title="Studio Audio Console & 10-Band EQ"
            >
              <Sliders className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">Console</span>
              {eqEnabled && (
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              )}
            </Button>

            {/* Queue Toggle */}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle playback queue"
              onClick={() => setQueueOpen((o) => !o)}
              className={cn(
                "h-8 w-8 rounded-full text-muted-foreground hover:text-foreground relative transition-colors cursor-pointer",
                queueOpen && "bg-surface-raised text-foreground"
              )}
              title="Master Queue"
            >
              <ListMusic className="h-4 w-4" />
              {queue.length > 0 && (
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </Button>

            {/* Maximize / Fullscreen Audiophile Player Trigger */}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Expand Audiophile Player"
              onClick={expandPlayer}
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
              title="Expand Full Audiophile Player & Console"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>

            {/* Precision Volume */}
            <div className="hidden items-center gap-2 sm:flex">
              <Button
                variant="ghost"
                size="icon"
                aria-label={volume === 0 ? "Unmute" : "Mute"}
                onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full cursor-pointer"
              >
                {volume === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              <div className="w-18 lg:w-22">
                <Slider
                  value={[volume * 100]}
                  max={100}
                  step={1}
                  onValueChange={([val]) => setVolume(val / 100)}
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
