import { useState, useRef, useEffect } from "react";
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
  Activity,
  Zap,
  Disc3,
  Sparkles,
  Loader2,
  AlertCircle,
  HardDrive,
  RotateCcw,
} from "lucide-react";
import { usePlayer } from "@/lib/player";
import { useAppMode, type LocalTrack } from "@/lib/mode";
import { formatDuration } from "@/domain/music/types";
import { QualityBadge } from "@/components/QualityBadge";
import { AudioConsoleModal } from "@/components/AudioConsoleModal";
import { Waveform } from "@/components/Waveform";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FullscreenAudiophilePlayerProps {
  open: boolean;
  onClose: () => void;
}

export function FullscreenAudiophilePlayer({ open, onClose }: FullscreenAudiophilePlayerProps) {
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
    eqEnabled,
    bassBoostLevel,
    trebleLevel,
    stereoWidth,
    normalizerEnabled,
    togglePlay,
    playNext,
    playPrevious,
    setVolume,
    seek,
    toggleEq,
    setBassBoostLevel,
    setTrebleLevel,
    toggleNormalizer,
    getAnalyserNode,
  } = usePlayer();

  const { isOffline } = useAppMode();
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Mini live spectrum visualizer
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const analyser = getAnalyserNode();
    const bufferLength = analyser ? analyser.frequencyBinCount : 32;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(dataArray);
        const barCount = 24;
        const barWidth = width / barCount - 2;
        const step = Math.floor(bufferLength / barCount);

        for (let i = 0; i < barCount; i++) {
          const val = dataArray[i * step] || 0;
          const barHeight = (val / 255) * height;
          const x = i * (barWidth + 2);
          const y = height - barHeight;

          ctx.fillStyle = isOffline ? "rgba(16, 185, 129, 0.85)" : "rgba(255, 122, 24, 0.85)";
          ctx.fillRect(x, y, barWidth, barHeight);
        }
      }
    };

    render();
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [open, isPlaying, isOffline, getAnalyserNode]);

  if (!open || !currentTrack) return null;

  const localMeta = currentTrack as LocalTrack;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        transition={{ type: "spring", stiffness: 350, damping: 35 }}
        className="fixed inset-0 z-50 flex flex-col bg-background/98 backdrop-blur-3xl overflow-y-auto"
      >
        {/* Top Bar */}
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-raised"
          >
            <ChevronDown className="h-6 w-6" />
          </Button>

          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-muted-foreground">
                {isOffline ? "LAYAM HI-FI PLAYER" : "LAYAM STUDIO PLAYER"}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "font-mono text-[9px] font-bold px-1.5 py-0",
                  isOffline
                    ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                    : "border-primary/40 text-primary bg-primary/10"
                )}
              >
                {currentTrack.quality} {currentTrack.sampleRate && currentTrack.sampleRate >= 96000 ? "24/96" : ""}
              </Badge>
            </div>
            {localMeta.album && (
              <span className="text-xs font-semibold text-foreground/80 mt-0.5">
                {localMeta.album}
              </span>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConsoleOpen(true)}
            className="rounded-full text-xs font-bold gap-1.5 border border-border/60 hover:border-primary/40 text-primary hover:bg-primary/10"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">EQ & DSP</span>
          </Button>
        </div>

        {/* Main Audiophile Deck Content */}
        <div className="mx-auto flex flex-1 w-full max-w-2xl flex-col items-center justify-center px-6 py-6 sm:py-8">
          {/* Large Album Artwork */}
          <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-3xl bg-surface-raised shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-border/50 mb-8 group">
            <img
              src={currentTrack.coverImage}
              alt={currentTrack.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-60" />

            {/* Live Spectrum Overlay at bottom of artwork */}
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
              <canvas
                ref={canvasRef}
                width={120}
                height={24}
                className="h-6 w-28 rounded opacity-80"
              />
              <span className="text-[10px] font-mono text-white/80 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10">
                {currentTrack.bitrate ? `${currentTrack.bitrate} kbps` : "1411 kbps"}
              </span>
            </div>
          </div>

          {/* Track Title & Artist */}
          <div className="w-full text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground truncate">
              {currentTrack.title}
            </h2>
            <p className="text-base font-medium text-muted-foreground mt-1 truncate">
              {currentTrack.artistName}
            </p>
            {localMeta.folderPath && (
              <p className="text-[11px] font-mono text-muted-foreground/60 mt-1 truncate">
                📁 {localMeta.folderPath}
              </p>
            )}
          </div>

          {/* Precision Waveform & Seek Timeline */}
          <div className="w-full space-y-2 mb-8">
            <Waveform progress={progress} onSeek={seek} className="h-6 w-full" />
            <div className="flex justify-between text-xs font-mono text-muted-foreground tabular-nums px-1">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>

          {/* Hardware Playback Controls */}
          <div className="flex items-center justify-center gap-6 sm:gap-8 mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={playPrevious}
              className="h-12 w-12 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-raised"
              aria-label="Previous track"
            >
              <SkipBack className="h-6 w-6 fill-current" />
            </Button>

            <motion.div whileTap={{ scale: 0.92 }}>
              <Button
                size="icon"
                onClick={togglePlay}
                className={cn(
                  "h-16 w-16 rounded-full shadow-2xl transition-all",
                  isOffline
                    ? "bg-emerald-500 text-white hover:bg-emerald-400 shadow-emerald-500/30"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/30"
                )}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {status === "loading" || status === "buffering" ? (
                  <Loader2 className="h-7 w-7 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-8 w-8 fill-current" />
                ) : (
                  <Play className="h-8 w-8 fill-current ml-1" />
                )}
              </Button>
            </motion.div>

            <Button
              variant="ghost"
              size="icon"
              onClick={playNext}
              className="h-12 w-12 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-raised"
              aria-label="Next track"
            >
              <SkipForward className="h-6 w-6 fill-current" />
            </Button>
          </div>

          {/* Quick Hardware Audio Knobs */}
          <div className="grid grid-cols-3 gap-3 w-full rounded-2xl border border-border/40 bg-surface/60 p-4 mb-6 text-xs font-mono">
            {/* Bass Boost */}
            <div className="flex flex-col items-center justify-center text-center">
              <span className="text-[10px] text-muted-foreground mb-1 font-bold">BASS BOOST</span>
              <button
                onClick={() => setBassBoostLevel(bassBoostLevel > 0 ? 0 : 6)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-bold transition-colors border",
                  bassBoostLevel > 0
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-border/60 text-muted-foreground hover:text-foreground"
                )}
              >
                {bassBoostLevel > 0 ? `+${bassBoostLevel} dB` : "OFF"}
              </button>
            </div>

            {/* 10-Band EQ */}
            <div className="flex flex-col items-center justify-center text-center border-x border-border/30">
              <span className="text-[10px] text-muted-foreground mb-1 font-bold">10-BAND EQ</span>
              <button
                onClick={toggleEq}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-bold transition-colors border",
                  eqEnabled
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border/60 text-muted-foreground hover:text-foreground"
                )}
              >
                {eqEnabled ? "ACTIVE" : "BYPASS"}
              </button>
            </div>

            {/* Normalizer */}
            <div className="flex flex-col items-center justify-center text-center">
              <span className="text-[10px] text-muted-foreground mb-1 font-bold">NORMALIZER</span>
              <button
                onClick={toggleNormalizer}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-bold transition-colors border",
                  normalizerEnabled
                    ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                    : "border-border/60 text-muted-foreground hover:text-foreground"
                )}
              >
                {normalizerEnabled ? "ON" : "OFF"}
              </button>
            </div>
          </div>

          {/* Precision Volume */}
          <div className="flex items-center gap-3 w-full max-w-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Slider
              value={[volume * 100]}
              max={100}
              step={1}
              onValueChange={([val]) => setVolume(val / 100)}
              className="flex-1"
            />
          </div>
        </div>

        {/* Audio Console Modal */}
        <AudioConsoleModal open={consoleOpen} onClose={() => setConsoleOpen(false)} />
      </motion.div>
    </AnimatePresence>
  );
}
