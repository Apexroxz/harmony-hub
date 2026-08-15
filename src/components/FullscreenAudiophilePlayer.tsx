import React, { useState, useRef, useEffect, useMemo } from "react";
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
  Trash2,
} from "lucide-react";
import { usePlayer } from "@/lib/player";
import { useAppMode, type LocalTrack } from "@/lib/mode";
import { formatDuration } from "@/domain/music/types";
import { getTrackLyrics } from "@/lib/lyrics";
import { LocalLyricsService } from "@layam/storage-core";
import { Waveform } from "@/components/Waveform";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
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
      await importLocalFiles?.(files);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await importLocalFiles?.(files);
    }
    e.target.value = "";
  };

  const [customLyrics, setCustomLyrics] = useState<{ time: number; text: string }[] | null>(null);

  useEffect(() => {
    if (!currentTrack) {
      setCustomLyrics(null);
      return;
    }
    LocalLyricsService.getLyrics(currentTrack.id)
      .then((stored) => {
        if (stored && stored.lines && stored.lines.length > 0) {
          setCustomLyrics(stored.lines);
        } else {
          setCustomLyrics(null);
        }
      })
      .catch(() => setCustomLyrics(null));
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

  // Real-time Canvas FFT Visualizer in Fullscreen
  useEffect(() => {
    if (!open || viewMode !== "visualizer") {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      const canvas = bigCanvasRef.current;
      if (!canvas) return;

      const analyser = getAnalyserNode?.();
      const bufferLength = analyser ? analyser.frequencyBinCount : 64;
      const freqData = new Uint8Array(bufferLength);
      const timeData = new Uint8Array(bufferLength);

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

              ctx.fillStyle = "#D99A2B";
              ctx.fillRect(x, y, barWidth, barHeight);
            }
          } else {
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = "#D99A2B";
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
  }, [open, viewMode, vizMode, isPlaying, getAnalyserNode]);

  if (!open || !currentTrack) return null;

  const sampleRateKhz = currentTrack.sampleRate
    ? currentTrack.sampleRate >= 1000
      ? `${(currentTrack.sampleRate / 1000).toFixed(1)} kHz`
      : `${currentTrack.sampleRate} Hz`
    : "96.0 kHz";

  const bitDepthLabel = currentTrack.bitDepth ? `${currentTrack.bitDepth}-BIT` : "24-BIT";
  const formatLabel = currentTrack.quality || "FLAC";

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
        className="fixed inset-0 z-50 flex flex-col bg-[#08090B] text-[#f2f3f5] select-none overflow-hidden"
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
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-[#08090B]/95 backdrop-blur-md pointer-events-none">
            <img src="/logo.png" alt="Layam" className="h-16 w-16 rounded-2xl animate-pulse shadow-2xl" />
            <p className="text-base font-mono font-bold text-[#D99A2B]">
              Drop Master Audio File(s) to Play & Queue
            </p>
            <p className="text-xs text-[#9ba1ad] font-mono">
              Supports 24-Bit / 192kHz FLAC, WAV, ALAC, AIFF
            </p>
          </div>
        )}

        {/* ── Top Header Navigation Bar ── */}
        <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5 border-b border-white/[0.06]">
          <button
            onClick={onClose}
            aria-label="Minimize"
            className="flex items-center gap-1.5 p-2 rounded-lg text-[#9ba1ad] hover:text-[#f2f3f5] hover:bg-white/[0.04] transition-colors cursor-pointer"
          >
            <ChevronDown className="h-5 w-5" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider hidden sm:inline">Cockpit</span>
          </button>

          {/* Precision Telemetry Badges */}
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-widest bg-[#D99A2B]/10 text-[#D99A2B] border border-[#D99A2B]/25">
              PCM
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono text-[#9ba1ad] bg-white/[0.03] border border-white/[0.06]">
              {formatLabel} · {bitDepthLabel}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono text-[#D99A2B]/90 bg-[#D99A2B]/5 border border-[#D99A2B]/20">
              {sampleRateKhz}
            </span>
            {eqEnabled ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-1">
                <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                DSP ON
              </span>
            ) : (
              <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono text-[#6b7280] bg-white/[0.02] border border-white/[0.04]">
                DSP DIRECT
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle: Cartridge / Visualizer / Lyrics */}
            <button
              onClick={() =>
                setViewMode((v) =>
                  v === "art" ? "visualizer" : v === "visualizer" ? "lyrics" : "art",
                )
              }
              aria-label="Toggle view mode"
              className={cn(
                "p-2 rounded-lg transition-colors cursor-pointer border border-white/[0.06] bg-white/[0.02]",
                viewMode !== "art" ? "text-[#D99A2B] border-[#D99A2B]/40 bg-[#D99A2B]/10" : "text-[#9ba1ad] hover:text-[#f2f3f5]"
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

            {/* DSP Console Trigger */}
            <button
              onClick={openConsole}
              aria-label="DSP Studio Console"
              className={cn(
                "p-2 rounded-lg transition-colors cursor-pointer border border-white/[0.06] bg-white/[0.02]",
                eqEnabled ? "text-[#D99A2B] border-[#D99A2B]/40" : "text-[#9ba1ad] hover:text-[#f2f3f5]"
              )}
              title="DSP 10-Band Graphic EQ"
            >
              <Sliders className="h-4 w-4" />
            </button>

            {/* Queue Trigger */}
            <button
              onClick={() => setQueueDrawerOpen(true)}
              aria-label="Queue"
              className="p-2 rounded-lg text-[#9ba1ad] hover:text-[#f2f3f5] border border-white/[0.06] bg-white/[0.02] transition-colors cursor-pointer relative"
            >
              <ListMusic className="h-4 w-4" />
              {queue.length > 0 && (
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[#D99A2B]" />
              )}
            </button>
          </div>
        </header>

        {/* ── Main Audiophile Console Cockpit ── */}
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 max-w-4xl mx-auto w-full my-auto">
          {viewMode === "art" ? (
            <div className="relative w-full max-w-xs sm:max-w-sm aspect-square my-auto flex items-center justify-center">
              <img
                src={currentTrack.coverImage || "/logo.png"}
                alt={currentTrack.title}
                className="w-full h-full object-cover rounded-2xl shadow-[0_20px_80px_rgba(0,0,0,0.95)] border border-[#D99A2B]/25 ring-1 ring-[#D99A2B]/30"
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
                      ? "bg-[#D99A2B]/20 text-[#D99A2B] border border-[#D99A2B]/40"
                      : "text-[#9ba1ad] hover:text-[#f2f3f5]",
                  )}
                >
                  Spectrum
                </button>
                <button
                  onClick={() => setVizMode("oscilloscope")}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-mono transition-colors cursor-pointer",
                    vizMode === "oscilloscope"
                      ? "bg-[#D99A2B]/20 text-[#D99A2B] border border-[#D99A2B]/40"
                      : "text-[#9ba1ad] hover:text-[#f2f3f5]",
                  )}
                >
                  Oscilloscope
                </button>
              </div>
            </div>
          ) : (
            <div className="relative w-full max-w-lg h-72 my-auto overflow-y-auto px-4 py-8 space-y-4 text-center scroll-smooth no-scrollbar">
              {lyrics.length === 0 ? (
                <p className="text-sm font-mono text-[#9ba1ad] my-auto">
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
                        ? "text-[#D99A2B] text-xl sm:text-2xl font-bold scale-105"
                        : "text-[#9ba1ad]/40 hover:text-[#9ba1ad]",
                    )}
                  >
                    {line.text}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Track Titles */}
          <div className="w-full text-center mt-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#f2f3f5] tracking-tight truncate">
              {currentTrack.title}
            </h2>
            <p className="text-sm text-[#9ba1ad] mt-1 truncate font-medium">
              {currentTrack.artistName || "Local Artist"}
              {currentTrack.albumName && <span> · {currentTrack.albumName}</span>}
            </p>
          </div>

          {/* Precision Waveform Timeline Seekbar */}
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
            <div className="flex justify-between text-xs font-mono text-[#9ba1ad] tabular-nums">
              <span className="text-[#D99A2B] font-bold">{formatDuration(currentTime)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>

          {/* Center Transport Controls */}
          <div className="flex items-center justify-center gap-6 sm:gap-8 mt-4 mb-4">
            <button
              onClick={() => setIsShuffle((s) => !s)}
              className={cn(
                "p-2 transition-colors cursor-pointer rounded-lg",
                isShuffle ? "text-[#D99A2B]" : "text-[#9ba1ad]/60 hover:text-[#f2f3f5]",
              )}
              title="Shuffle"
            >
              <Shuffle className="h-4 w-4" />
            </button>

            <button
              onClick={playPrevious}
              className="p-3 text-[#9ba1ad] hover:text-[#f2f3f5] rounded-full hover:bg-white/[0.04] transition-colors cursor-pointer"
              title="Previous"
            >
              <SkipBack className="h-6 w-6 fill-current" />
            </button>

            {/* Large Gold Circular Center Button */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={togglePlay}
              className="h-16 w-16 sm:h-18 sm:w-18 rounded-full bg-gradient-to-b from-[#f5b84c] via-[#D99A2B] to-[#b37a1a] text-[#08090B] shadow-[0_0_35px_rgba(217,154,43,0.45)] hover:shadow-[0_0_45px_rgba(217,154,43,0.65)] flex items-center justify-center cursor-pointer border border-[#fbd38d]/40 transition-transform"
              title={isPlaying ? "Pause" : "Play"}
            >
              {status === "loading" || status === "buffering" ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-8 w-8 fill-current" />
              ) : (
                <Play className="h-8 w-8 fill-current ml-1" />
              )}
            </motion.button>

            <button
              onClick={playNext}
              className="p-3 text-[#9ba1ad] hover:text-[#f2f3f5] rounded-full hover:bg-white/[0.04] transition-colors cursor-pointer"
              title="Next"
            >
              <SkipForward className="h-6 w-6 fill-current" />
            </button>

            <button
              onClick={() => setIsRepeat((r) => !r)}
              className={cn(
                "p-2 transition-colors cursor-pointer rounded-lg",
                isRepeat ? "text-[#D99A2B]" : "text-[#9ba1ad]/60 hover:text-[#f2f3f5]",
              )}
              title="Repeat"
            >
              <Repeat className="h-4 w-4" />
            </button>
          </div>

          {/* Volume Slider in Fullscreen */}
          <div className="flex items-center gap-3 w-full max-w-xs justify-center mb-6">
            <button
              onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
              className="text-[#9ba1ad] hover:text-[#f2f3f5] cursor-pointer"
            >
              {volume === 0 ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <div className="flex-1">
              <Slider
                value={[volume * 100]}
                max={100}
                step={1}
                onValueChange={([val]) => setVolume(val / 100)}
                className="cursor-pointer"
              />
            </div>
            <span className="text-[10px] font-mono text-[#9ba1ad] w-8 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </main>

        {/* ── Slide-up Queue Drawer within Fullscreen ── */}
        <AnimatePresence>
          {queueDrawerOpen && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="absolute inset-x-0 bottom-0 z-50 max-h-[60vh] rounded-t-3xl border-t border-[#D99A2B]/25 bg-[#08090B] shadow-[0_-20px_60px_rgba(0,0,0,0.95)] flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <ListMusic className="h-4 w-4 text-[#D99A2B]" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#f2f3f5]">
                    Play Queue ({queue.length})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {queue.length > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={clearQueue}
                      className="h-8 w-8 text-[#9ba1ad] hover:text-red-400 rounded-lg hover:bg-white/[0.04]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQueueDrawerOpen(false)}
                    className="h-8 w-8 text-[#9ba1ad] hover:text-[#f2f3f5] rounded-lg hover:bg-white/[0.04]"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <ul className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
                {queue.map((track, i) => (
                  <li
                    key={`${track.id}-${i}`}
                    onClick={() => playFromQueue(i)}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs transition-colors cursor-pointer",
                      i === queueIndex
                        ? "bg-[#D99A2B]/10 text-[#D99A2B] font-medium border border-[#D99A2B]/20"
                        : "text-[#f2f3f5] hover:bg-white/[0.04]"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <img
                        src={track.coverImage || "/logo.png"}
                        alt={track.title}
                        className="h-9 w-9 rounded-lg object-cover flex-shrink-0 bg-[#121316]"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "/logo.png";
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{track.title}</p>
                        <p className="truncate text-[11px] text-[#9ba1ad]">
                          {track.artistName || "Local Artist"}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-[#9ba1ad]">
                      {formatDuration(track.duration || 0)}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}

export default FullscreenAudiophilePlayer;
