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
  Power,
  ShieldAlert,
  Cpu,
} from "lucide-react";
import { usePlayer } from "@/lib/player";
import {
  EQ_FREQUENCIES,
  EQ_PRESETS,
  SoundProfile,
  SpatialRoomPreset,
  SPATIAL_ROOM_PRESETS,
  globalDspEngine,
} from "@layam/audio-core";
import { cn } from "@/lib/utils";

interface AudioConsoleModalProps {
  open: boolean;
  onClose: () => void;
}

export function AudioConsoleModal({ open, onClose }: AudioConsoleModalProps) {
  const {
    eqGains,
    setEqGain,
    eqPreset,
    setEqPreset,
    eqEnabled,
    toggleEq,
    bassBoostLevel,
    setBassBoostLevel,
    trebleLevel,
    setTrebleLevel,
    stereoWidth,
    setStereoWidth,
    normalizerEnabled,
    toggleNormalizer,
    spatialMode,
    setSpatialMode,
    spatialAmbience,
    setSpatialAmbience,
    applyFullSoundProfile,
    getAnalyserNode,
    isPlaying,
    currentTrack,
  } = usePlayer();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [visualizerMode, setVisualizerMode] = useState<"bars" | "wave">("bars");
  const [telemetry, setTelemetry] = useState(() => ({
    truePeakDb: -90,
    lufs: -90,
    phaseCorrelation: 1.0,
    dynamicRangeDb: 0,
    isClipping: false,
  }));

  // Periodic broadcast telemetry update loop
  useEffect(() => {
    if (!open || !isPlaying) return;
    const interval = setInterval(() => {
      setTelemetry(globalDspEngine.getBroadcastTelemetry());
    }, 150);
    return () => clearInterval(interval);
  }, [open, isPlaying]);

  // Real-time 60fps FFT spectrum visualizer loop
  useEffect(() => {
    if (!open) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dataArray = new Uint8Array(64);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Engraved oscilloscope grid
      ctx.strokeStyle = "rgba(217, 154, 43, 0.08)";
      ctx.lineWidth = 1;
      for (let y = 0; y < height; y += 16) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      for (let x = 0; x < width; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      const liveAnalyser = getAnalyserNode();

      if (liveAnalyser && isPlaying) {
        const bufferLength = liveAnalyser.frequencyBinCount;
        if (dataArray.length !== bufferLength) {
          dataArray = new Uint8Array(bufferLength);
        }

        if (visualizerMode === "bars") {
          liveAnalyser.getByteFrequencyData(dataArray);

          const barCount = 40;
          const barWidth = width / barCount - 2.5;
          const step = Math.max(1, Math.floor(bufferLength / barCount));

          for (let i = 0; i < barCount; i++) {
            const val = dataArray[i * step] || 0;
            const barHeight = (val / 255) * (height - 8);
            const x = i * (barWidth + 2.5);
            const y = height - barHeight;

            // Luxury metallic gold gradient
            const grad = ctx.createLinearGradient(0, height, 0, 0);
            grad.addColorStop(0, "rgba(179, 122, 26, 0.25)");
            grad.addColorStop(0.6, "rgba(217, 154, 43, 0.85)");
            grad.addColorStop(1, "rgba(245, 184, 76, 1)");

            ctx.fillStyle = grad;
            ctx.shadowColor = "rgba(217, 154, 43, 0.45)";
            ctx.shadowBlur = 6;
            ctx.fillRect(x, y, barWidth, barHeight);

            // Precision white peak line
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(x, y - 2, barWidth, 1.5);
          }
        } else {
          // Oscilloscope wave
          liveAnalyser.getByteTimeDomainData(dataArray);
          ctx.lineWidth = 2;
          ctx.strokeStyle = "#D99A2B";
          ctx.shadowColor = "rgba(217, 154, 43, 0.75)";
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
        // Resting ambient telemetry baseline
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
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Solid Studio Dark Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#000000]/90 backdrop-blur-sm"
        />

        {/* ── Solid Obsidian Audiophile Hardware Rack Chassis ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 12 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          style={{
            backgroundColor: "#08090B",
            borderColor: "rgba(217, 154, 43, 0.25)",
            boxShadow: "0 35px 120px rgba(0, 0, 0, 0.98)",
          }}
          className="relative z-10 w-full max-w-4xl max-h-[94vh] overflow-y-auto rounded-2xl border bg-[#08090B] p-5 sm:p-7 text-[#f2f3f5] shadow-2xl"
        >
          {/* 1. Technical Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0D0E12] text-[#D99A2B] border border-[#D99A2B]/40 shadow-[0_0_20px_rgba(217,154,43,0.22)]">
                <Sliders className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-[#f2f3f5] font-mono uppercase">
                    LAYAM DSP AUDIO CONSOLE
                  </h2>
                </div>
                <p className="text-xs text-[#D99A2B]/90 font-mono tracking-widest uppercase font-semibold">
                  REAL-TIME PARAMETRIC ENGINE · 64-BIT FLOAT PCM
                </p>
              </div>
            </div>

            {/* Hardware Status Indicators & Master Controls */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Telemetry Status Badges */}
              <div className="hidden lg:flex items-center gap-1.5 font-mono text-[10px]">
                <span className="px-2 py-0.5 rounded bg-[#0D0E12] border border-[#D99A2B]/30 text-[#D99A2B] font-bold">
                  DSP {eqEnabled ? "ACTIVE" : "DIRECT"}
                </span>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded bg-[#0D0E12] border font-bold tabular-nums",
                    telemetry.isClipping ? "border-rose-500/50 text-rose-400" : "border-white/[0.08] text-[#f2f3f5]"
                  )}
                >
                  PEAK: {telemetry.truePeakDb > -80 ? `${telemetry.truePeakDb > 0 ? "+" : ""}${telemetry.truePeakDb} dBTP` : "-inf"}
                </span>
                <span className="px-2 py-0.5 rounded bg-[#0D0E12] border border-white/[0.08] text-amber-300 font-bold tabular-nums">
                  LUFS: {telemetry.lufs > -80 ? `${telemetry.lufs}` : "-inf"}
                </span>
                <span className="px-2 py-0.5 rounded bg-[#0D0E12] border border-white/[0.08] text-[#9ba1ad]">
                  MONO-BASS: &lt;120Hz
                </span>
              </div>

              {/* Physical EQ Power Toggle Switch */}
              <button
                onClick={toggleEq}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider uppercase border transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95",
                  eqEnabled
                    ? "bg-gradient-to-b from-[#f5b84c] via-[#D99A2B] to-[#b37a1a] text-[#08090B] border-[#fbd38d]/60 shadow-[0_0_20px_rgba(217,154,43,0.45)]"
                    : "bg-[#0D0E12] text-[#9ba1ad] border-white/[0.1] hover:text-[#f2f3f5] hover:border-white/[0.2]"
                )}
                title="Toggle Master EQ Processing"
              >
                <Power className="h-3.5 w-3.5" />
                <span>{eqEnabled ? "EQ ENABLED" : "EQ BYPASS"}</span>
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

          {/* 2. Real-time Output Spectrum Display Cavity */}
          <div className="relative mb-5 overflow-hidden rounded-xl border border-white/[0.08] bg-[#060709] p-3 shadow-inner">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#D99A2B] animate-pulse" />
                <span className="font-mono text-[10px] font-bold text-[#9ba1ad] uppercase tracking-wider">
                  MASTER OUTPUT SPECTRUM READOUT
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setVisualizerMode("bars")}
                  className={cn(
                    "px-2.5 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer",
                    visualizerMode === "bars"
                      ? "bg-[#D99A2B]/20 text-[#D99A2B] font-bold border border-[#D99A2B]/50 shadow-sm"
                      : "text-[#9ba1ad] hover:text-[#f2f3f5] bg-white/[0.02] border border-white/[0.05]"
                  )}
                >
                  FFT BARS
                </button>
                <button
                  onClick={() => setVisualizerMode("wave")}
                  className={cn(
                    "px-2.5 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer",
                    visualizerMode === "wave"
                      ? "bg-[#D99A2B]/20 text-[#D99A2B] font-bold border border-[#D99A2B]/50 shadow-sm"
                      : "text-[#9ba1ad] hover:text-[#f2f3f5] bg-white/[0.02] border border-white/[0.05]"
                  )}
                >
                  OSCILLOSCOPE
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

          {/* 3. Sound Profiles & Preset Selection */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="font-mono text-xs font-bold text-[#9ba1ad] uppercase tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5 text-[#D99A2B]" />
                HARDWARE SOUND PROFILES & PRESETS
              </label>
              <button
                onClick={() => setEqPreset("Flat")}
                className="flex items-center gap-1 text-[11px] font-mono text-[#9ba1ad] hover:text-[#D99A2B] transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                RESET FLAT
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
                      ? "bg-[#D99A2B]/20 text-[#D99A2B] border-[#D99A2B]/60 shadow-[0_0_12px_rgba(217,154,43,0.25)] font-bold"
                      : "bg-[#0D0E12] text-[#9ba1ad] border-white/[0.06] hover:text-[#f2f3f5] hover:bg-[#14161C]"
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* 4. 10-Band Parametric Hardware Fader Rack */}
          <div className="mb-6 rounded-xl border border-white/[0.08] bg-[#0D0E12] p-4 sm:p-5 shadow-inner">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.05]">
              <span className="font-mono text-xs font-bold text-[#f2f3f5] uppercase tracking-wider flex items-center gap-1.5">
                10-BAND PARAMETRIC FADER RACK
              </span>
              <div className="flex items-center gap-3 font-mono text-[10px] text-[#9ba1ad]">
                <span>RANGE: ±12 dB</span>
                <span className="text-[#D99A2B] font-bold">CENTER DETENT: 0.0 dB</span>
              </div>
            </div>

            <div className="grid grid-cols-10 gap-1 sm:gap-2">
              {EQ_FREQUENCIES.map((freq, idx) => {
                const gain = eqGains[idx] ?? 0;
                const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
                return (
                  <div key={freq} className="flex flex-col items-center gap-1.5">
                    {/* Active Gain Readout in dB */}
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
                      {gain > 0 ? `+${gain.toFixed(1)}` : `${gain.toFixed(1)}`}
                    </span>

                    {/* Vertical Hardware Fader Groove */}
                    <div className="relative h-36 w-full flex items-center justify-center py-2">
                      {/* Center 0dB Detent Alignment Line */}
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

                    {/* Engraved Frequency Axis Label */}
                    <span className="font-mono text-[10px] font-bold text-[#f2f3f5] tracking-tight mt-1">
                      {label}Hz
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. DSP Dynamics, Ambience & Enhancement Controls */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-4">
            {/* Sub-Bass Driver */}
            <div className="rounded-xl border border-white/[0.08] bg-[#0D0E12] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#f2f3f5] font-mono flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-[#D99A2B]" />
                  SUB-BASS DRIVER
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
                <span className="text-xs font-bold text-[#f2f3f5] font-mono flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#D99A2B]" />
                  AIR & CLARITY
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
                <span className="text-xs font-bold text-[#f2f3f5] font-mono flex items-center gap-1.5">
                  <AudioWaveform className="h-3.5 w-3.5 text-[#D99A2B]" />
                  SOUNDSTAGE EXPANSION
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

          {/* 6. Spatial Room Ambience & Normalizer */}
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
                DYNAMIC NORMALIZER: {normalizerEnabled ? "ON" : "OFF"}
              </button>
              <span className="text-[10px] text-[#9ba1ad] font-mono hidden sm:inline">
                EBU R128 True Peak Limiter
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {[
                { id: "pure" as SpatialRoomPreset, label: "DIRECT MONITOR" },
                { id: "studio_control" as SpatialRoomPreset, label: "STUDIO MASTER" },
                { id: "concert_hall" as SpatialRoomPreset, label: "CONCERT HALL" },
                { id: "vinyl_lounge" as SpatialRoomPreset, label: "ACOUSTIC LOUNGE" },
              ].map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setSpatialMode(preset.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all cursor-pointer border",
                    spatialMode === preset.id
                      ? "bg-gradient-to-b from-[#f5b84c] via-[#D99A2B] to-[#b37a1a] text-[#08090B] border-[#fbd38d]/60 shadow-[0_0_12px_rgba(217,154,43,0.35)] font-bold"
                      : "bg-[#14161C] text-[#9ba1ad] border-white/[0.06] hover:text-[#f2f3f5] hover:bg-white/[0.04]"
                  )}
                >
                  {preset.label}
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
