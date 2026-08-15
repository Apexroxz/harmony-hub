import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sliders,
  Volume2,
  Sparkles,
  Zap,
  Activity,
  X,
  RotateCcw,
  AudioWaveform,
  Disc3,
  Flame,
  Layers,
  Radio,
  Box,
  Compass,
  Headphones,
} from "lucide-react";
import {
  usePlayer,
  EQ_FREQUENCIES,
  EQ_PRESETS,
  type SpatialRoomPreset,
} from "@/lib/player";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AudioConsoleModalProps {
  open: boolean;
  onClose: () => void;
}

export function AudioConsoleModal({ open, onClose }: AudioConsoleModalProps) {
  const {
    eqEnabled,
    eqGains,
    eqPreset,
    bassBoostLevel,
    trebleLevel,
    stereoWidth,
    normalizerEnabled,
    spatialMode,
    spatialAmbience,
    setEqGain,
    setEqPreset,
    toggleEq,
    setBassBoostLevel,
    setTrebleLevel,
    setStereoWidth,
    toggleNormalizer,
    setSpatialMode,
    setSpatialAmbience,
    getAnalyserNode,
    isPlaying,
    currentTrack,
  } = usePlayer();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [visualizerMode, setVisualizerMode] = useState<"bars" | "wave">("bars");

  // Real-time FFT spectrum visualizer loop
  useEffect(() => {
    if (!open) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const analyser = getAnalyserNode();
    const bufferLength = analyser ? analyser.frequencyBinCount : 64;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Background grid
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      for (let y = 0; y < height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      if (analyser && isPlaying) {
        if (visualizerMode === "bars") {
          analyser.getByteFrequencyData(dataArray);

          const barCount = 32;
          const barWidth = width / barCount - 2;
          const step = Math.floor(bufferLength / barCount);

          for (let i = 0; i < barCount; i++) {
            const val = dataArray[i * step] || 0;
            const barHeight = (val / 255) * (height - 10);
            const x = i * (barWidth + 2);
            const y = height - barHeight;

            // Gradient bar
            const grad = ctx.createLinearGradient(0, height, 0, 0);
            grad.addColorStop(0, "rgba(229, 158, 56, 0.4)");
            grad.addColorStop(0.5, "rgba(245, 158, 11, 0.8)");
            grad.addColorStop(1, "rgba(252, 211, 77, 1)");

            ctx.fillStyle = grad;
            ctx.shadowColor = "rgba(229, 158, 56, 0.5)";
            ctx.shadowBlur = 8;
            ctx.fillRect(x, y, barWidth, barHeight);

            // Peak cap
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(x, y - 2, barWidth, 2);
          }
        } else {
          // Oscilloscope wave
          analyser.getByteTimeDomainData(dataArray);
          ctx.lineWidth = 2;
          ctx.strokeStyle = "#e59e38";
          ctx.shadowColor = "rgba(229, 158, 56, 0.6)";
          ctx.shadowBlur = 6;
          ctx.beginPath();

          const sliceWidth = width / bufferLength;
          let x = 0;

          for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i]! / 128.0;
            const y = (v * height) / 2;

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }

            x += sliceWidth;
          }

          ctx.lineTo(width, height / 2);
          ctx.stroke();
        }
      } else {
        // Idle ambient line
        ctx.strokeStyle = "rgba(229, 158, 56, 0.3)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
      }
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [open, isPlaying, visualizerMode, getAnalyserNode]);

  // Global Escape key listener
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

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        {/* Solid Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Audiophile Console Hardware Panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative z-10 w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl border border-white/[0.1] bg-[#111216] p-6 sm:p-8 shadow-2xl text-foreground"
          style={{
            backgroundColor: "#111216",
            boxShadow: "0 25px 80px rgba(0, 0, 0, 0.95)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-5 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#16181e] text-[#e59e38] border border-[#e59e38]/30 shadow-[0_0_15px_rgba(229,158,56,0.15)]">
                <Sliders className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black tracking-tight text-foreground">
                    Hardware DSP Console
                  </h2>
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] uppercase font-bold text-[#e59e38] border-[#e59e38]/30 bg-[#e59e38]/10"
                  >
                    64-Bit Float PCM
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  10-Band Graphic Parametric Equalizer & Dynamic Range Processor
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleEq}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider uppercase border transition-all cursor-pointer",
                  eqEnabled
                    ? "bg-[#e59e38] text-[#090a0c] border-[#e59e38] shadow-[0_0_15px_rgba(229,158,56,0.3)]"
                    : "bg-[#16181e] text-muted-foreground border-white/[0.08] hover:text-foreground"
                )}
              >
                {eqEnabled ? "EQ Active" : "EQ Bypass"}
              </button>

              <button
                onClick={onClose}
                className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Real-time Spectrum Visualizer Screen */}
          <div className="relative mb-6 overflow-hidden rounded-xl border border-white/[0.08] bg-[#07080a] p-3">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#e59e38] animate-pulse" />
                <span className="font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Master Output Spectrum
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setVisualizerMode("bars")}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer",
                    visualizerMode === "bars"
                      ? "bg-[#e59e38]/20 text-[#e59e38] font-bold border border-[#e59e38]/30"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  FFT Bars
                </button>
                <button
                  onClick={() => setVisualizerMode("wave")}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer",
                    visualizerMode === "wave"
                      ? "bg-[#e59e38]/20 text-[#e59e38] font-bold border border-[#e59e38]/30"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Oscilloscope
                </button>
              </div>
            </div>

            <canvas
              ref={canvasRef}
              width={760}
              height={90}
              className="w-full h-20 rounded bg-black/40"
            />
          </div>

          {/* EQ Presets Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="font-mono text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Sound Profiles & Presets
              </label>
              <button
                onClick={() => setEqPreset("Flat")}
                className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-[#e59e38] transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                Reset Flat
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {Object.keys(EQ_PRESETS).map((preset) => (
                <button
                  key={preset}
                  onClick={() => setEqPreset(preset)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border",
                    eqPreset === preset
                      ? "bg-[#e59e38]/15 text-[#e59e38] border-[#e59e38]/40 shadow-sm"
                      : "bg-[#16181e] text-muted-foreground border-white/[0.06] hover:text-foreground hover:bg-[#1a1d24]"
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* 10-Band Parametric Graphic Sliders */}
          <div className="mb-8 rounded-xl border border-white/[0.06] bg-[#0c0d10] p-4 sm:p-6">
            <div className="grid grid-cols-10 gap-1 sm:gap-2">
              {EQ_FREQUENCIES.map((freq, idx) => {
                const gain = eqGains[idx] ?? 0;
                const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
                return (
                  <div key={freq} className="flex flex-col items-center gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {gain > 0 ? `+${gain.toFixed(0)}` : `${gain.toFixed(0)}`}
                    </span>

                    <div className="h-36 flex items-center justify-center py-2">
                      <input
                        type="range"
                        min={-12}
                        max={12}
                        step={0.5}
                        value={gain}
                        onChange={(e) => setEqGain(idx, parseFloat(e.target.value))}
                        className="h-32 -rotate-90 appearance-none bg-transparent cursor-pointer accent-[#e59e38] w-24"
                        style={{ transformOrigin: "center" }}
                      />
                    </div>

                    <span className="font-mono text-[11px] font-bold text-foreground mt-1">
                      {label}Hz
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* DSP Dynamics, Ambience & Enhancement Controls */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Bass Boost */}
            <div className="rounded-xl border border-white/[0.06] bg-[#0c0d10] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-[#e59e38]" />
                  Sub-Bass Driver
                </span>
                <span className="font-mono text-xs font-bold text-[#e59e38]">
                  {bassBoostLevel > 0 ? `+${bassBoostLevel.toFixed(1)} dB` : "Off"}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={0.5}
                value={bassBoostLevel}
                onChange={(e) => setBassBoostLevel(parseFloat(e.target.value))}
                className="w-full appearance-none bg-transparent cursor-pointer accent-[#e59e38]"
              />
              <p className="mt-2 text-[10px] text-muted-foreground">
                60Hz low-shelf sub-harmonic punch
              </p>
            </div>

            {/* Treble Sparkle */}
            <div className="rounded-xl border border-white/[0.06] bg-[#0c0d10] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#e59e38]" />
                  Air & Clarity
                </span>
                <span className="font-mono text-xs font-bold text-[#e59e38]">
                  {trebleLevel > 0 ? `+${trebleLevel.toFixed(1)} dB` : "Off"}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={0.5}
                value={trebleLevel}
                onChange={(e) => setTrebleLevel(parseFloat(e.target.value))}
                className="w-full appearance-none bg-transparent cursor-pointer accent-[#e59e38]"
              />
              <p className="mt-2 text-[10px] text-muted-foreground">
                12kHz high-shelf top-end detail
              </p>
            </div>

            {/* Stereo Width */}
            <div className="rounded-xl border border-white/[0.06] bg-[#0c0d10] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <AudioWaveform className="h-3.5 w-3.5 text-[#e59e38]" />
                  Soundstage Expansion
                </span>
                <span className="font-mono text-xs font-bold text-[#e59e38]">
                  {Math.round(stereoWidth * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={stereoWidth}
                onChange={(e) => setStereoWidth(parseFloat(e.target.value))}
                className="w-full appearance-none bg-transparent cursor-pointer accent-[#e59e38]"
              />
              <p className="mt-2 text-[10px] text-muted-foreground">
                Binaural stereo acoustic panning
              </p>
            </div>
          </div>

          {/* Spatial Room Ambience & Normalizer */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-[#0c0d10] p-4">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleNormalizer}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                  normalizerEnabled
                    ? "bg-[#e59e38]/15 text-[#e59e38] border-[#e59e38]/40"
                    : "bg-[#16181e] text-muted-foreground border-white/[0.06]"
                )}
              >
                Dynamic Normalizer: {normalizerEnabled ? "ON" : "OFF"}
              </button>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                EBU R128 Peak Limiter
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {(
                [
                  "Direct Monitor",
                  "Studio Master",
                  "Concert Hall",
                  "Acoustic Lounge",
                ] as SpatialRoomPreset[]
              ).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSpatialMode(mode)}
                  className={cn(
                    "px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer",
                    spatialMode === mode
                      ? "bg-[#e59e38] text-[#090a0c] font-bold"
                      : "bg-[#16181e] text-muted-foreground hover:text-foreground"
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default AudioConsoleModal;
