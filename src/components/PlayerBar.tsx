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
} from "lucide-react";
import { usePlayer } from "@/lib/player";
import { formatDuration } from "@/domain/music/types";
import { useGlobalHotkeys } from "@/lib/useGlobalHotkeys";
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
    isExpanded,
    expandPlayer,
    collapsePlayer,
    isConsoleOpen,
    closeConsole,
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

  // Step 2: Temporary check to observe transition from empty to active
  if (!currentTrack) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-[9999] h-16 rounded-2xl border border-yellow-500/40 bg-[#0c0d10]/95 text-yellow-400 font-mono text-xs flex items-center justify-center gap-2 max-w-4xl mx-auto shadow-2xl backdrop-blur-md">
        <span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
        NO ACTIVE TRACK — SELECT ANY TRACK TO PLAY
      </div>
    );
  }

  try {
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

        {/* ── Minimalist Queue Popover ── */}
        <AnimatePresence>
          {queueOpen && (
            <motion.aside
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed bottom-[88px] right-4 z-50 max-h-[55vh] w-[min(92vw,24rem)] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0d10]/98 shadow-2xl backdrop-blur-2xl sm:right-8 flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <ListMusic className="h-4 w-4 text-[#e59e38]" />
                  <span className="text-xs font-mono font-medium tracking-wide text-foreground">
                    Queue ({queue.length})
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 rounded-full bg-[#e59e38]/10 border border-[#e59e38]/30 px-2 py-0.5 text-[11px] font-semibold text-[#e59e38] hover:bg-[#e59e38]/20 transition-all cursor-pointer"
                    title="Drop or Add FLAC/WAV masters"
                  >
                    <img src="/logo.png" alt="Layam" className="h-3.5 w-3.5 rounded object-contain" />
                    <span>+ Add</span>
                  </button>

                  {queue.length > 0 && (
                    <button
                      onClick={clearQueue}
                      className="p-1 text-muted-foreground hover:text-red-400 transition-colors cursor-pointer"
                      title="Clear all tracks"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setQueueOpen(false)}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
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
                    ? "border-[#e59e38] bg-[#e59e38]/15 text-[#e59e38] scale-[0.99]"
                    : "border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:border-[#e59e38]/40 hover:text-foreground hover:bg-white/[0.04]",
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

              <ul className="max-h-[35vh] overflow-y-auto p-2 space-y-1">
                {queue.length === 0 && (
                  <li className="px-4 py-6 text-center text-xs text-muted-foreground font-mono">
                    Queue is empty.
                  </li>
                )}
                {queue.map((track, i) => (
                  <li
                    key={`${track.id}-${i}`}
                    onClick={() => playFromQueue(i)}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs transition-colors cursor-pointer group",
                      i === queueIndex
                        ? "bg-[#e59e38]/10 text-[#e59e38] font-medium"
                        : "text-foreground hover:bg-white/[0.04]",
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <img
                        src={track.coverImage || "/logo.png"}
                        alt={track.title}
                        className="h-8 w-8 rounded-lg object-cover flex-shrink-0 bg-[#16181e]"
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

        {/* ── Floating Hi-Fi Player Bar ── */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "fixed bottom-4 left-4 right-4 z-40 max-w-4xl mx-auto rounded-2xl border bg-[#0c0d10]/95 shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl transition-all duration-200",
            isDraggingOver
              ? "border-[#e59e38] shadow-[0_0_30px_rgba(229,158,56,0.3)] ring-2 ring-[#e59e38]/40 scale-[1.01]"
              : "border-white/[0.08]",
          )}
        >
          {isDraggingOver && (
            <div className="absolute inset-0 z-50 flex items-center justify-center gap-2 rounded-2xl bg-black/80 backdrop-blur-md pointer-events-none">
              <img src="/logo.png" alt="Layam" className="h-6 w-6 rounded animate-pulse" />
              <span className="text-xs font-mono font-bold text-[#e59e38]">
                Drop Master Audio File(s) Here to Play
              </span>
            </div>
          )}

          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-5">
            {/* Left: Track Information */}
            <div className="flex min-w-0 items-center gap-3 md:w-[32%]">
              <button
                onClick={expandPlayer}
                className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-[#16181e] group text-left cursor-pointer transition-opacity hover:opacity-80 border border-white/[0.06]"
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
                  className="block truncate text-xs sm:text-sm font-semibold text-foreground hover:text-[#e59e38] transition-colors text-left w-full cursor-pointer"
                >
                  {currentTrack.title || "Untitled Master"}
                </button>

                <div className="flex items-center gap-2 truncate text-xs text-muted-foreground">
                  <span className="text-xs font-normal text-muted-foreground truncate">
                    {currentTrack.artistName || "Local Artist"}
                  </span>
                  <span className="font-mono text-[9px] text-[#e59e38]/80">
                    {currentTrack.quality || "FLAC 24/96"}
                  </span>
                </div>
              </div>
            </div>

            {/* Center: Minimal Controls & Waveform */}
            <div className="flex flex-1 flex-col items-center justify-center max-w-md">
              <div className="flex items-center gap-4">
                <button
                  onClick={playPrevious}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
                  aria-label="Previous"
                >
                  <SkipBack className="h-4 w-4 fill-current" />
                </button>

                <button
                  onClick={togglePlay}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full transition-transform active:scale-95 cursor-pointer shadow-md",
                    isOffline
                      ? "bg-[#e59e38] text-[#090a0c] hover:bg-[#f0ab4d]"
                      : "bg-foreground text-background hover:bg-foreground/90",
                  )}
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {status === "loading" || status === "buffering" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="h-4 w-4 fill-current" />
                  ) : (
                    <Play className="h-4 w-4 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  onClick={playNext}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
                  aria-label="Next"
                >
                  <SkipForward className="h-4 w-4 fill-current" />
                </button>
              </div>

              {/* Subtle Aesthetic Progress Bar */}
              <div className="hidden sm:flex w-full items-center gap-2.5 mt-1">
                <span className="text-[10px] font-mono text-[#e59e38] font-semibold tabular-nums">
                  {formatDuration(currentTime)}
                </span>
                <div className="relative flex-1">
                  <Waveform
                    seed={currentTrack.id}
                    peaks={currentTrack.waveform}
                    progress={progress}
                    duration={duration}
                    bars={64}
                    onSeek={seek}
                    className="h-4 w-full"
                  />
                </div>
                <span className="text-[10px] font-mono text-muted-foreground/70 tabular-nums">
                  {formatDuration(duration)}
                </span>
              </div>
            </div>

            {/* Right: Tactile Utilities & Controls */}
            <div className="flex items-center justify-end gap-1 sm:gap-2 md:w-[32%]">
              {/* Layam Emblem Add / Drop Master Track Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 rounded-full border border-[#e59e38]/30 bg-[#e59e38]/10 px-2 py-1 text-xs font-semibold text-[#e59e38] hover:bg-[#e59e38]/20 hover:border-[#e59e38]/50 transition-all cursor-pointer"
                title="Add / Drop FLAC, WAV Masters"
              >
                <img
                  src="/logo.png"
                  alt="Layam"
                  className="h-3.5 w-3.5 rounded object-contain"
                />
                <span className="hidden xl:inline text-[11px]">+ Add</span>
              </button>

              {/* Quick EQ Console */}
              <button
                onClick={toggleConsole}
                className={cn(
                  "p-2 rounded-lg transition-colors cursor-pointer",
                  eqEnabled
                    ? "text-[#e59e38]"
                    : "text-muted-foreground hover:text-foreground",
                )}
                title="EQ & DSP Console"
              >
                <Sliders className="h-4 w-4" />
              </button>

              {/* Queue */}
              <button
                onClick={() => setQueueOpen((o) => !o)}
                className={cn(
                  "p-2 rounded-lg transition-colors cursor-pointer relative",
                  queueOpen
                    ? "text-[#e59e38]"
                    : "text-muted-foreground hover:text-foreground",
                )}
                title="Queue"
              >
                <ListMusic className="h-4 w-4" />
                {queue.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-1 w-1 rounded-full bg-[#e59e38]" />
                )}
              </button>

              {/* Expand Fullscreen */}
              <button
                onClick={expandPlayer}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Expand Fullscreen"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </>
    );
  } catch (error) {
    console.error("PLAYERBAR FAILED", error);
    return (
      <div className="fixed bottom-4 left-4 right-4 z-[9999] h-16 rounded-xl border border-red-500 bg-red-950/90 text-white font-mono text-xs flex items-center justify-center">
        PLAYERBAR ERROR: {String(error)}
      </div>
    );
  }
}

export default PlayerBar;
