import { useState, useRef, useCallback } from "react";
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
  Plus,
  UploadCloud,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { usePlayer } from "@/lib/player";
import { formatDuration } from "@/domain/music/types";
import { AudioConsoleModal } from "./AudioConsoleModal";
import { FullscreenAudiophilePlayer } from "./FullscreenAudiophilePlayer";
import { useGlobalHotkeys } from "@/lib/useGlobalHotkeys";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Waveform } from "@/components/Waveform";
import { ArtistName } from "@/components/ArtistAvatar";
import { useAppMode } from "@/lib/mode";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function PlayerBar() {
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
    togglePlay,
    playNext,
    playPrevious,
    setVolume,
    seek,
    playFromQueue,
    removeFromQueue,
    clearQueue,
    addToQueue,
    playTrack,
    isExpanded,
    expandPlayer,
    collapsePlayer,
  } = usePlayer();

  const { isOffline, importLocalFiles } = useAppMode();
  const [queueOpen, setQueueOpen] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(false);
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

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        toast.info(`Importing ${files.length} master track(s)...`);
        await importLocalFiles(files);
      }
    },
    [importLocalFiles],
  );

  const handleFileInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        toast.info(`Importing ${files.length} master track(s)...`);
        await importLocalFiles(files);
      }
      e.target.value = "";
    },
    [importLocalFiles],
  );

  // Desktop audiophile hotkeys
  useGlobalHotkeys({
    onToggleConsole: () => setConsoleOpen((o) => !o),
    onToggleDac: () => {},
    onToggleShortcuts: () => {},
    onToggleQueue: () => setQueueOpen((o) => !o),
  });

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

      {/* ── Minimalist Queue Popover with Layam Dropzone & Track Removal ── */}
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
                <ListMusic className="h-4 w-4 text-primary" />
                <span className="text-xs font-mono font-medium tracking-wide text-foreground">
                  Queue ({queue.length})
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Layam Logo Add Button in Queue Header */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 rounded-full bg-primary/10 border border-primary/30 px-2 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/20 transition-all cursor-pointer"
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
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-white/[0.04]",
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <img
                      src={track.coverImage}
                      alt={track.title}
                      className="h-8 w-8 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{track.title}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {track.artistName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {formatDuration(track.duration)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromQueue(i);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Ultra-Minimalist Floating Player Bar (Drag & Drop zone) ── */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "fixed bottom-4 left-4 right-4 z-40 max-w-4xl mx-auto rounded-2xl border bg-[#0c0d10]/95 shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl transition-all duration-200",
          isDraggingOver
            ? "border-primary shadow-[0_0_30px_rgba(var(--color-primary-rgb,16,185,129),0.3)] ring-2 ring-primary/40 scale-[1.01]"
            : "border-white/[0.08]",
        )}
      >
        {isDraggingOver && (
          <div className="absolute inset-0 z-50 flex items-center justify-center gap-2 rounded-2xl bg-black/80 backdrop-blur-md pointer-events-none">
            <img src="/logo.png" alt="Layam" className="h-6 w-6 rounded animate-pulse" />
            <span className="text-xs font-mono font-bold text-primary">
              Drop Master Audio File(s) Here to Play
            </span>
          </div>
        )}

        <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-5">
          {/* Left: Track Information */}
          <div className="flex min-w-0 items-center gap-3 md:w-[32%]">
            <button
              onClick={expandPlayer}
              className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-surface group text-left cursor-pointer transition-opacity hover:opacity-80"
              title="Expand player"
            >
              <img
                src={currentTrack.coverImage}
                alt={currentTrack.title}
                className="h-full w-full object-cover"
              />
            </button>

            <div className="min-w-0 flex-1">
              <button
                onClick={expandPlayer}
                className="block truncate text-xs sm:text-sm font-semibold text-foreground hover:text-primary transition-colors text-left w-full cursor-pointer"
              >
                {currentTrack.title}
              </button>

              <div className="flex items-center gap-2 truncate text-xs text-muted-foreground">
                <ArtistName
                  artistId={currentTrack.artistId}
                  name={currentTrack.artistName}
                  className="text-xs font-normal text-muted-foreground truncate"
                />
                <span className="font-mono text-[9px] text-muted-foreground/60">
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
                  "flex h-9 w-9 items-center justify-center rounded-full transition-transform active:scale-95 cursor-pointer",
                  isOffline
                    ? "bg-emerald-500 text-white hover:bg-emerald-400"
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
              <span className="text-[10px] font-mono text-primary/90 font-semibold tabular-nums">
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

          {/* Right: Minimal Utilities */}
          <div className="flex items-center justify-end gap-1 sm:gap-2 md:w-[32%]">
            {/* Layam Emblem Add / Drop Master Track Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/20 hover:border-primary/50 transition-all cursor-pointer"
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
              onClick={() => setConsoleOpen(true)}
              className={cn(
                "p-2 rounded-lg transition-colors cursor-pointer",
                eqEnabled
                  ? "text-primary"
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
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
              title="Queue"
            >
              <ListMusic className="h-4 w-4" />
              {queue.length > 0 && (
                <span className="absolute top-1.5 right-1.5 h-1 w-1 rounded-full bg-primary" />
              )}
            </button>

            {/* Expand Fullscreen */}
            <button
              onClick={expandPlayer}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Expand"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      <FullscreenAudiophilePlayer open={isExpanded} onClose={collapsePlayer} />
      <AudioConsoleModal open={consoleOpen} onClose={() => setConsoleOpen(false)} />
    </>
  );
}
