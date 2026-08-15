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
  Shuffle,
  Repeat,
  X,
  Mic2,
  Activity,
  Disc,
} from "lucide-react";
import { usePlayer } from "@/lib/player";
import { useAppMode, type LocalTrack } from "@/lib/mode";
import { formatDuration } from "@/domain/music/types";
import { getTrackLyrics } from "@/lib/lyrics";
import { LocalLyricsService } from "@layam/storage-core";
import { Waveform } from "@/components/Waveform";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

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
    togglePlay,
    playNext,
    playPrevious,
    setVolume,
    seek,
    playFromQueue,
    removeFromQueue,
    clearQueue,
    getAnalyserNode,
    openConsole,
  } = usePlayer();

  const { isOffline, importLocalFiles } = useAppMode();
  const [queueDrawerOpen, setQueueDrawerOpen] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [viewMode, setViewMode] = useState<"art" | "lyrics" | "visualizer">("art");
  const [vizMode, setVizMode] = useState<"spectrum" | "oscilloscope">("spectrum");
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const bigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const activeLyricRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Drag and Drop handlers for Fullscreen Player
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await importLocalFiles(files);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await importLocalFiles(files);
    }
    e.target.value = "";
  };

  const [customLyrics, setCustomLyrics] = useState<{ time: number; text: string }[] | null>(null);

  useEffect(() => {
    if (!currentTrack) {
      setCustomLyrics(null);
      return;
    }
    // Check local IndexedDB lyrics vault
    LocalLyricsService.getLyrics(currentTrack.id).then((stored) => {
      if (stored && stored.lines && stored.lines.length > 0) {
        setCustomLyrics(stored.lines);
      } else {
        setCustomLyrics(null);
      }
    }).catch(() => setCustomLyrics(null));
  }, [currentTrack]);

  const lyrics = useMemo(() => {
    if (customLyrics && customLyrics.length > 0) return customLyrics;
    if (!currentTrack) return [];
    return getTrackLyrics(
      currentTrack.title,
      currentTrack.artistName || (currentTrack as any).artist || "Artist",
      duration || currentTrack.duration || 180,
    );
  }, [customLyrics, currentTrack, duration]);

  const activeLyricIndex = useMemo(() => {
    if (lyrics.length === 0) return 0;
    for (let i = lyrics.length - 1; i >= 0; i--) {
      const line = lyrics[i];
      if (line && currentTime >= line.time) {
        return i;
      }
    }
    return 0;
  }, [lyrics, currentTime]);

  useEffect(() => {
    if (viewMode === "lyrics" && activeLyricRef.current) {
      activeLyricRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeLyricIndex, viewMode]);

  // ESC key dismiss
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Clean Minimalist Spectrum / Oscilloscope Visualizer
  useEffect(() => {
    if (!open) return;
    const canvas = bigCanvasRef.current;
    const analyser = getAnalyserNode();
    const bufferLength = analyser ? analyser.frequencyBinCount : 64;
    const freqData = new Uint8Array(bufferLength);
    const timeData = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);

      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(freqData);
        analyser.getByteTimeDomainData(timeData);
      } else {
        freqData.fill(0);
        timeData.fill(128);
      }

      if (canvas && viewMode === "visualizer") {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const w = canvas.width;
          const h = canvas.height;

          if (vizMode === "spectrum") {
            const barWidth = 3;
            const gap = 3;
            const barsCount = Math.floor(w / (barWidth + gap));
            const step = Math.floor(bufferLength / barsCount);

            for (let i = 0; i < barsCount; i++) {
              const val = isPlaying ? freqData[i * step] || 0 : Math.sin(Date.now() / 400 + i) * 6 + 6;
              const barHeight = Math.max(2, (val / 255) * (h - 20));
              const x = i * (barWidth + gap);
              const y = h - barHeight - 10;

              ctx.fillStyle = isOffline ? "#e59e38" : "#ffffff";
              ctx.fillRect(x, y, barWidth, barHeight);
            }
          } else {
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = isOffline ? "#e59e38" : "#ffffff";
            ctx.beginPath();

            const sliceWidth = w / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
              const v = (timeData[i] || 128) / 128.0;
              const y = (v * h) / 2;

              if (i === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
              x += sliceWidth;
            }

            ctx.lineTo(w, h / 2);
            ctx.stroke();
          }
        }
      }
    };

    render();
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [open, viewMode, vizMode, isPlaying, isOffline, getAnalyserNode]);

  if (!open || !currentTrack) return null;

  const sampleRateKhz = currentTrack.sampleRate
    ? currentTrack.sampleRate >= 1000
      ? `${(currentTrack.sampleRate / 1000).toFixed(1)} kHz`
      : `${currentTrack.sampleRate} Hz`
    : "96.0 kHz";

  const bitDepthLabel = currentTrack.bitDepth ? `${currentTrack.bitDepth}-Bit` : "24-Bit";
  const formatLabel = currentTrack.format || currentTrack.quality || "FLAC";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="fixed inset-0 z-50 flex flex-col bg-[#08080a] text-foreground select-none overflow-hidden"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="audio/*,.flac,.wav,.mp3,.alac,.aac,.m4a,.ogg"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {isDraggingOver && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/90 backdrop-blur-md pointer-events-none">
            <img src="/logo.png" alt="Layam" className="h-16 w-16 rounded-2xl animate-pulse shadow-2xl" />
            <p className="text-base font-mono font-bold text-primary">
              Drop Master Audio File(s) to Play & Queue
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              Supports 24-Bit / 192kHz FLAC, WAV, ALAC, AIFF
            </p>
          </div>
        )}

        <header className="relative z-10 mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-6">
          <button
            onClick={onClose}
            aria-label="Minimize"
            className="p-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ChevronDown className="h-5 w-5" />
          </button>

          <div className="text-center">
            <p className="text-[11px] font-mono text-muted-foreground tracking-wider">
              {formatLabel} · {bitDepthLabel} / {sampleRateKhz}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition-all cursor-pointer"
              title="Add / Drop FLAC, WAV masters"
            >
              <img src="/logo.png" alt="Layam" className="h-3.5 w-3.5 rounded object-contain" />
              <span>+ Master</span>
            </button>
            <button
              onClick={() =>
                setViewMode((v) =>
                  v === "art" ? "visualizer" : v === "visualizer" ? "lyrics" : "art",
                )
              }
              aria-label="Toggle view"
              className={cn(
                "p-2 rounded-lg transition-colors cursor-pointer",
                viewMode !== "art" ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {viewMode === "art" ? (
                <Activity className="h-4 w-4" />
              ) : viewMode === "visualizer" ? (
                <Mic2 className="h-4 w-4" />
              ) : (
                <Disc className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => setQueueDrawerOpen(true)}
              aria-label="Queue"
              className="p-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer relative"
            >
              <ListMusic className="h-4 w-4" />
              {queue.length > 0 && (
                <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </button>
          </div>
        </header>

        <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 max-w-4xl mx-auto w-full">
          {viewMode === "art" ? (
            <div className="relative w-full max-w-xs sm:max-w-sm aspect-square my-auto flex items-center justify-center">
              <img
                src={currentTrack.coverImage || "/logo.png"}
                alt={currentTrack.title}
                className="w-full h-full object-cover rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] border border-white/[0.05]"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/logo.png";
                }}
              />
            </div>
          ) : viewMode === "visualizer" ? (
            <div className="relative w-full max-w-lg aspect-video my-auto flex flex-col items-center justify-center">
              <canvas
                ref={bigCanvasRef}
                width={500}
                height={220}
                className="w-full h-full max-h-[220px]"
              />
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setVizMode("spectrum")}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-mono transition-colors cursor-pointer",
                    vizMode === "spectrum"
                      ? "bg-primary/20 text-primary border border-primary/40"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Spectrum
                </button>
                <button
                  onClick={() => setVizMode("oscilloscope")}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-mono transition-colors cursor-pointer",
                    vizMode === "oscilloscope"
                      ? "bg-primary/20 text-primary border border-primary/40"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Wave
                </button>
              </div>
            </div>
          ) : (
            <div className="relative w-full max-w-lg h-72 my-auto overflow-y-auto px-4 py-8 space-y-4 text-center scroll-smooth no-scrollbar">
              {lyrics.length === 0 ? (
                <p className="text-sm font-mono text-muted-foreground my-auto">
                  No time-synced master lyrics available.
                </p>
              ) : (
                lyrics.map((line, idx) => (
                  <div
                    key={idx}
                    ref={idx === activeLyricIndex ? activeLyricRef : null}
                    onClick={() => seek(line.time)}
                    className={cn(
                      "text-base sm:text-lg font-medium transition-all duration-300 cursor-pointer py-1",
                      idx === activeLyricIndex
                        ? "text-primary text-xl sm:text-2xl font-bold scale-105"
                        : "text-muted-foreground/40 hover:text-muted-foreground",
                    )}
                  >
                    {line.text}
                  </div>
                ))
              )}
            </div>
          )}

          <div className="w-full text-center mt-4">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground truncate">
              {currentTrack.title}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">
              {currentTrack.artistName || (currentTrack as any).artist}
            </p>
          </div>

          <div className="w-full mt-6 space-y-2">
            <Waveform
              seed={currentTrack.id}
              peaks={currentTrack.waveform}
              progress={progress}
              duration={duration}
              bars={96}
              onSeek={seek}
              className="h-8 w-full"
            />
            <div className="flex justify-between text-[11px] font-mono text-muted-foreground/70 tabular-nums">
              <span className="text-primary/90 font-bold">{formatDuration(currentTime)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 mt-4 mb-8">
            <button
              onClick={() => setIsShuffle((s) => !s)}
              className={cn(
                "p-2 transition-colors cursor-pointer",
                isShuffle ? "text-primary" : "text-muted-foreground/60 hover:text-foreground",
              )}
              title="Shuffle"
            >
              <Shuffle className="h-4 w-4" />
            </button>
            <button
              onClick={playPrevious}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Previous"
            >
              <SkipBack className="h-6 w-6 fill-current" />
            </button>
            <button
              onClick={togglePlay}
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-full transition-transform active:scale-95 cursor-pointer shadow-xl",
                isOffline
                  ? "bg-[#e59e38] text-[#090a0c] hover:bg-[#f0ab4d]"
                  : "bg-foreground text-background hover:bg-foreground/90",
              )}
              title={isPlaying ? "Pause" : "Play"}
            >
              {status === "loading" || status === "buffering" ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-6 w-6 fill-current" />
              ) : (
                <Play className="h-6 w-6 fill-current ml-0.5" />
              )}
            </button>
            <button
              onClick={playNext}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Next"
            >
              <SkipForward className="h-6 w-6 fill-current" />
            </button>
            <button
              onClick={() => setIsRepeat((r) => !r)}
              className={cn(
                "p-2 transition-colors cursor-pointer",
                isRepeat ? "text-primary" : "text-muted-foreground/60 hover:text-foreground",
              )}
              title="Repeat"
            >
              <Repeat className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center justify-between w-full max-w-xs gap-3 pb-6">
            <button
              onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <Slider
              value={[volume * 100]}
              max={100}
              step={1}
              onValueChange={(val) => {
                const newVol = (val[0] ?? 80) / 100;
                setVolume(newVol);
              }}
              className="flex-1"
            />
            <button
              onClick={openConsole}
              className={cn(
                "p-1 transition-colors cursor-pointer",
                eqEnabled ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
              title="Equalizer"
            >
              <Sliders className="h-3.5 w-3.5" />
            </button>
          </div>
        </main>

        <AnimatePresence>
          {queueDrawerOpen && (
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="absolute right-0 top-0 bottom-0 z-30 w-full sm:w-96 bg-[#0a0a0c]/98 border-l border-white/[0.08] p-6 flex flex-col shadow-2xl backdrop-blur-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                <div className="flex items-center gap-2">
                  <ListMusic className="h-5 w-5 text-primary" />
                  <h3 className="text-sm font-bold tracking-tight">Active Queue ({queue.length})</h3>
                </div>
                <div className="flex items-center gap-2">
                  {queue.length > 0 && (
                    <button
                      onClick={clearQueue}
                      className="text-xs text-muted-foreground hover:text-red-400 font-mono transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    onClick={() => setQueueDrawerOpen(false)}
                    className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Layam Logo Dropzone / Add Master Trigger */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="my-3 flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] p-2.5 text-center transition-all cursor-pointer hover:border-primary/40 hover:bg-white/[0.04]"
              >
                <img src="/logo.png" alt="Layam" className="h-4 w-4 rounded object-contain opacity-80" />
                <span className="text-[11px] font-mono text-muted-foreground">
                  Drop audio masters to queue
                </span>
              </div>

              <ul className="flex-1 overflow-y-auto divide-y divide-white/[0.03] py-2">
                {queue.map((track, i) => (
                  <li
                    key={`${track.id}-${i}`}
                    className={cn(
                      "flex items-center justify-between gap-3 p-3 rounded-xl transition-colors cursor-pointer group",
                      i === queueIndex ? "bg-primary/10 text-primary font-medium" : "hover:bg-white/[0.03]",
                    )}
                    onClick={() => playFromQueue(i)}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <img
                        src={track.coverImage}
                        alt={track.title}
                        className="h-9 w-9 rounded-lg object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{track.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {track.artistName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground/60">
                        {formatDuration(track.duration)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromQueue(i);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 p-1 cursor-pointer transition-opacity"
                        title="Remove track"
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
      </motion.div>
    </AnimatePresence>
  );
}
