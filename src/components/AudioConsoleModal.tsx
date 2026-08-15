import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sliders,
  Sparkles,
  X,
  RotateCcw,
  AudioWaveform,
  Flame,
  Activity,
  Layers,
  Radio,
  Box,
  Compass,
  Headphones,
  SlidersHorizontal,
} from "lucide-react";
import {
  usePlayer,
  EQ_FREQUENCIES,
  EQ_PRESETS,
  type SpatialRoomPreset,
} from "@/lib/player";
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

      // Precision hardware background grid
      ctx.strokeStyle = "rgba(217, 154, 43, 0.08)";
      ctx.lineWidth = 1;
      for (let y = 0; y < height; y += 18) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      if (analyser && isPlaying) {
        if (visualizerMode === "bars") {
          analyser.getByteFrequencyData(dataArray);

          const barCount = 36;
          const barWidth = width / barCount - 2.5;
          const step = Math.floor(bufferLength / barCount);

          for (let i = 0; i < barCount; i++) {
            const val = dataArray[i * step] || 0;
            const barHeight = (val / 255) * (height - 8);
            const x = i * (barWidth + 2.5);
            const y = height - barHeight;

            // Luxury metallic gold gradient
            const grad = ctx.createLinearGradient(0, height, 0, 0);
            grad.addColorStop(0, "rgba(179, 122, 26, 0.3)");
            grad.addColorStop(0.6, "rgba(217, 154, 43, 0.85)");
            grad.addColorStop(1, "rgba(245, 184, 76, 1)");

            ctx.fillStyle = grad;
            ctx.shadowColor = "rgba(217, 154, 43, 0.4)";
            ctx.shadowBlur = 6;
            ctx.fillRect(x, y, barWidth, barHeight);

            // Precision peak cap
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(x, y - 2, barWidth, 1.5);
          }
        } else {
          // Oscilloscope wave
          analyser.getByteTimeDomainData(dataArray);
          ctx.lineWidth = 2;
          ctx.strokeStyle = "#D99A2B";
          ctx.shadowColor = "rgba(217, 154, 43, 0.7)";
          ctx.shadowBlur = 8;
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
        // Idle resting telemetry line
        ctx.strokeStyle = "rgba(217, 154, 43, 0.25)";
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Solid Dark Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#000000]/88 backdrop-blur-sm"
        />

        {/* ── Solid Obsidian Audiophile Hardware Rack ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 12 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          style={{
            backgroundColor: "#08090B",
            borderColor: "rgba(217, 154, 43, 0.25)",
            boxShadow: "0 30px 100px rgba(0, 0, 0, 0.96)",
          }}
          className="relative z-10 w-full max-w-4xl max-h-[94vh] overflow-y-auto rounded-2xl border bg-[#08090B] p-5 sm:p-7 text-[#f2f3f5] shadow-2xl"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0D0E12] text-[#D99A2B] border border-[#D99A2B]/35 shadow-[0_0_18px_rgba(217,154,43,0.18)]">
                <Sliders className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#f2f3f5]">
                    Layam DSP Hardware Console
                  </h2>
                  <span className="font-mono text-[10px] uppercase font-bold text-[#D99A2B] border border-[#D99A2B]/30 bg-[#D99A2B]/10 px-2 py-0.5 rounded-md">
                    64-BIT FLOAT PCM
                  </span>
                </div>
                <p className="text-xs text-[#9ba1ad] font-mono mt-0.5">
                  10-Band Graphic Equalizer · Dynamic Range Limiter · Spatial Acoustic Engine
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* EQ Active / Bypass Hardware Switch */}
              <button
                onClick={toggleEq}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider uppercase border transition-all cursor-pointer flex items-center gap-1.5",
                  eqEnabled
                    ? "bg-[#D99A2B] text-[#08090B] border-[#f5b84c] shadow-[0_0_18px_rgba(217,154,43,0.4)]"
                    : "bg-[#0D0E12] text-[#9ba1ad] border-white/[0.08] hover:text-[#f2f3f5] hover:border-white/[0.15]"
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    eqEnabled ? "bg-[#08090B] animate-pulse" : "bg-[#9ba1ad]"
                  )}
                />
                {eqEnabled ? "EQ ACTIVE" : "EQ BYPASS"}
              </button>

              <button
                onClick={onClose}
                className="p-2 text-[#9ba1ad] hover:text-[#f2f3f5] rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer border border-transparent hover:border-white/[0.08]"
                title="Close (Esc)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Real-time Spectrum Visualizer Screen */}
          <div className="relative mb-5 overflow-hidden rounded-xl border border-white/[0.08] bg-[#060709] p-3 shadow-inner">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#D99A2B] animate-pulse" />
                <span className="font-mono text-[10px] font-bold text-[#9ba1ad] uppercase tracking-wider">
                  Master Output Spectrum Readout
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setVisualizerMode("bars")}
                  className={cn(
                    "px-2.5 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer",
                    visualizerMode === "bars"
                      ? "bg-[#D99A2B]/20 text-[#D99A2B] font-bold border border-[#D99A2B]/40 shadow-sm"
                      : "text-[#9ba1ad] hover:text-[#f2f3f5] bg-white/[0.02] border border-white/[0.05]"
                  )}
                >
                  FFT Bars
                </button>
                <button
                  onClick={() => setVisualizerMode("wave")}
                  className={cn(
                    "px-2.5 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer",
                    visualizerMode === "wave"
                      ? "bg-[#D99A2B]/20 text-[#D99A2B] font-bold border border-[#D99A2B]/40 shadow-sm"
                      : "text-[#9ba1ad] hover:text-[#f2f3f5] bg-white/[0.02] border border-white/[0.05]"
                  )}
                >
                  Oscilloscope
                </button>
              </div>
            </div>

            <canvas
              ref={canvasRef}
              width={780}
              height={85}
              className="w-full h-[80px] rounded bg-[#040405]"
            />
          </div>

          {/* Sound Profiles & Preset Selection */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="font-mono text-xs font-bold text-[#9ba1ad] uppercase tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5 text-[#D99A2B]" />
                Audiophile EQ Presets
              </label>
              <button
                onClick={() => setEqPreset("Flat")}
                className="flex items-center gap-1 text-[11px] font-mono text-[#9ba1ad] hover:text-[#D99A2B] transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                Reset Flat
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {Object.keys(EQ_PRESETS).map((preset) => (
                <button
                  key={preset}
                  onClick={() => setEqPreset(preset)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer border",
                    eqPreset === preset
                      ? "bg-[#D99A2B]/15 text-[#D99A2B] border-[#D99A2B]/50 shadow-[0_0_12px_rgba(217,154,43,0.2)] font-bold"
                      : "bg-[#0D0E12] text-[#9ba1ad] border-white/[0.06] hover:text-[#f2f3f5] hover:bg-[#14161C]"
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* 10-Band Parametric Hardware Fader Rack */}
          <div className="mb-6 rounded-xl border border-white/[0.08] bg-[#0D0E12] p-4 sm:p-5 shadow-inner">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.05]">
              <span className="font-mono text-xs font-bold text-[#9ba1ad] uppercase tracking-wider">
                10-Band Hardware Fader Rack (±12 dB)
              </span>
              <span className="font-mono text-[10px] text-[#D99A2B]">
                CENTER DETENT: 0.0 dB
              </span>
            </div>

            <div className="grid grid-cols-10 gap-1 sm:gap-2">
              {EQ_FREQUENCIES.map((freq, idx) => {
                const gain = eqGains[idx] ?? 0;
                const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
                return (
                  <div key={freq} className="flex flex-col items-center gap-1.5">
                    {/* Active dB Readout */}
                    <span
                      className={cn(
                        "font-mono text-[10px] font-bold tabular-nums",
                        gain > 0
                          ? "text-[#D99A2B]"
                          : gain < 0
                          ? "text-[#9ba1ad]"
                          : "text-[#6b7280]"
                      )}
                    >
                      {gain > 0 ? `+${gain.toFixed(0)}` : `${gain.toFixed(0)}`}
                    </span>

                    {/* Vertical Fader Track with Center Detent */}
                    <div className="relative h-36 w-full flex items-center justify-center py-2">
                      {/* Zero dB Center Detent Line */}
                      <div className="absolute left-1/2 top-1/2 w-4 -translate-x-1/2 -translate-y-1/2 h-[1px] bg-[#D99A2B]/40 pointer-events-none z-0" />

                      <input
                        type="range"
                        min={-12}
                        max={12}
                        step={0.5}
                        value={gain}
                        onChange={(e) => setEqGain(idx, parseFloat(e.target.value))}
                        className="h-28 -rotate-90 appearance-none bg-transparent cursor-pointer w-24 accent-[#D99A2B] z-10"
                        style={{ transformOrigin: "center" }}
                        title={`${label}Hz: ${gain > 0 ? `+${gain}` : gain} dB`}
                      />
                    </div>

                    {/* Frequency Axis Label */}
                    <span className="font-mono text-[10px] font-bold text-[#f2f3f5] tracking-tight mt-1">
                      {label}Hz
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* DSP Dynamics, Ambience & Enhancement Controls */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-4">
            {/* Sub-Bass Driver */}
            <div className="rounded-xl border border-white/[0.08] bg-[#0D0E12] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#f2f3f5] flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-[#D99A2B]" />
                  Sub-Bass Driver
                </span>
                <span className="font-mono text-xs font-bold text-[#D99A2B]">
                  {bassBoostLevel > 0 ? `+${bassBoostLevel.toFixed(1)} dB` : "OFF"}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={0.5}
                value={bassBoostLevel}
                onChange={(e) => setBassBoostLevel(parseFloat(e.target.value))}
                className="w-full appearance-none bg-transparent cursor-pointer accent-[#D99A2B]"
              />
              <p className="mt-2 text-[10px] text-[#9ba1ad] font-mono">
                60Hz low-shelf sub-harmonic punch
              </p>
            </div>

            {/* Treble Sparkle */}
            <div className="rounded-xl border border-white/[0.08] bg-[#0D0E12] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#f2f3f5] flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#D99A2B]" />
                  Air & Clarity
                </span>
                <span className="font-mono text-xs font-bold text-[#D99A2B]">
                  {trebleLevel > 0 ? `+${trebleLevel.toFixed(1)} dB` : "OFF"}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={0.5}
                value={trebleLevel}
                onChange={(e) => setTrebleLevel(parseFloat(e.target.value))}
                className="w-full appearance-none bg-transparent cursor-pointer accent-[#D99A2B]"
              />
              <p className="mt-2 text-[10px] text-[#9ba1ad] font-mono">
                12kHz high-shelf top-end detail
              </p>
            </div>

            {/* Stereo Width */}
            <div className="rounded-xl border border-white/[0.08] bg-[#0D0E12] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#f2f3f5] flex items-center gap-1.5">
                  <AudioWaveform className="h-3.5 w-3.5 text-[#D99A2B]" />
                  Soundstage Expansion
                </span>
                <span className="font-mono text-xs font-bold text-[#D99A2B]">
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
                className="w-full appearance-none bg-transparent cursor-pointer accent-[#D99A2B]"
              />
              <p className="mt-2 text-[10px] text-[#9ba1ad] font-mono">
                Binaural stereo acoustic panning
              </p>
            </div>
          </div>

          {/* Spatial Room Ambience & Normalizer */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#0D0E12] p-4">
            <div className="flex items-center gap-2.5">
              <button
                onClick={toggleNormalizer}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer",
                  normalizerEnabled
                    ? "bg-[#D99A2B]/15 text-[#D99A2B] border-[#D99A2B]/50 shadow-sm"
                    : "bg-[#14161C] text-[#9ba1ad] border-white/[0.06] hover:text-[#f2f3f5]"
                )}
              >
                Dynamic Normalizer: {normalizerEnabled ? "ON" : "OFF"}
              </button>
              <span className="text-[10px] text-[#9ba1ad] font-mono hidden sm:inline">
                EBU R128 True Peak Limiter
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
                    "px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all cursor-pointer border",
                    spatialMode === mode
                      ? "bg-[#D99A2B] text-[#08090B] border-[#f5b84c] shadow-[0_0_12px_rgba(217,154,43,0.3)] font-bold"
                      : "bg-[#14161C] text-[#9ba1ad] border-white/[0.06] hover:text-[#f2f3f5] hover:bg-white/[0.04]"
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
