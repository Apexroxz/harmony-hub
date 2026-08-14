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
} from "lucide-react";
import { usePlayer, EQ_FREQUENCIES, EQ_PRESETS } from "@/lib/player";
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
    setEqGain,
    setEqPreset,
    toggleEq,
    setBassBoostLevel,
    setTrebleLevel,
    setStereoWidth,
    toggleNormalizer,
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

      // Background grid / oscilloscope lines
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
            grad.addColorStop(0, "rgba(255, 107, 0, 0.4)");
            grad.addColorStop(0.5, "rgba(255, 165, 0, 0.8)");
            grad.addColorStop(1, "rgba(255, 220, 100, 1)");

            ctx.fillStyle = grad;
            ctx.shadowColor = "rgba(255, 140, 0, 0.5)";
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
          ctx.strokeStyle = "#ff9900";
          ctx.shadowColor = "rgba(255, 140, 0, 0.8)";
          ctx.shadowBlur = 10;
          ctx.beginPath();

          const sliceWidth = width / bufferLength;
          let x = 0;

          for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
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
        // Idle ambient pulse
        ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
        ctx.font = "11px monospace";
        ctx.textAlign = "center";
        ctx.fillText(
          isPlaying ? "CONNECTING DSP ENGINE..." : "PLAYBACK PAUSED — DSP READY",
          width / 2,
          height / 2 + 4,
        );
      }
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [open, isPlaying, visualizerMode, getAnalyserNode]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="relative z-10 max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/15 bg-card/95 p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:p-8"
        >
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-inner">
                <Sliders className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                    Audiophile Audio Console
                  </h2>
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] font-mono">
                    10-BAND DSP
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Real-time WebAudio parametric equalization, dynamics compression, and harmonic
                  acoustics.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleEq}
                className={cn(
                  "h-8 rounded-full text-xs font-bold gap-1.5 transition-all",
                  eqEnabled
                    ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "border-border/60 text-muted-foreground hover:text-foreground",
                )}
              >
                <Zap className="h-3.5 w-3.5 fill-current" />
                <span>{eqEnabled ? "EQ ACTIVE" : "BYPASS EQ"}</span>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Real-time Spectrum Canvas */}
          <div className="my-6 overflow-hidden rounded-2xl border border-border/50 bg-black/60 p-4 shadow-inner">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-primary">
                <Activity className="h-3.5 w-3.5 animate-pulse" />
                <span className="font-mono text-[11px] tracking-wider uppercase">
                  Real-Time FFT Spectrum Visualizer
                </span>
                {currentTrack && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    ({currentTrack.quality}{" "}
                    {currentTrack.sampleRate ? `${currentTrack.sampleRate / 1000}kHz` : "44.1kHz"})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setVisualizerMode("bars")}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-mono transition-colors",
                    visualizerMode === "bars"
                      ? "bg-primary/20 text-primary font-bold"
                      : "text-muted-foreground hover:text-white",
                  )}
                >
                  Bars
                </button>
                <button
                  onClick={() => setVisualizerMode("wave")}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-mono transition-colors",
                    visualizerMode === "wave"
                      ? "bg-primary/20 text-primary font-bold"
                      : "text-muted-foreground hover:text-white",
                  )}
                >
                  Oscilloscope
                </button>
              </div>
            </div>

            <canvas
              ref={canvasRef}
              width={780}
              height={100}
              className="h-24 w-full rounded-lg bg-black/40"
            />
          </div>

          {/* EQ Presets Bar */}
          <div className="mb-6">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Acoustic Presets
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEqPreset("Flat")}
                className="h-6 text-[11px] text-muted-foreground hover:text-foreground gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Reset Flat
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {Object.keys(EQ_PRESETS).map((preset) => (
                <button
                  key={preset}
                  onClick={() => setEqPreset(preset)}
                  className={cn(
                    "rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all",
                    eqPreset === preset
                      ? "border-primary bg-primary/20 text-primary shadow-sm"
                      : "border-border/40 bg-surface-raised text-muted-foreground hover:bg-card hover:text-foreground",
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* 10-Band Graphic Equalizer Sliders */}
          <div className="rounded-2xl border border-border/40 bg-surface-raised p-5 mb-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                10-Band Graphic Frequencies
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">
                Range: -12dB to +12dB
              </span>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-10 gap-3 sm:gap-2">
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
                        disabled={!eqEnabled}
                        onChange={(e) => setEqGain(idx, parseFloat(e.target.value))}
                        className="h-32 -rotate-90 appearance-none bg-transparent cursor-pointer disabled:opacity-40 accent-primary w-24"
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

          {/* DSP Enhancement Dials & Controls */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Bass Boost */}
            <div className="rounded-2xl border border-border/40 bg-surface-raised p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange" />
                  <span className="text-xs font-bold text-foreground">Bass Boost</span>
                </div>
                <span className="font-mono text-xs font-bold text-primary">
                  +{bassBoostLevel.toFixed(1)} dB
                </span>
              </div>
              <Slider
                min={0}
                max={12}
                step={0.5}
                value={[bassBoostLevel]}
                onValueChange={([val]) => setBassBoostLevel(val)}
                className="my-3"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Sub-bass low-shelf harmonic resonance at 100Hz.
              </p>
            </div>

            {/* Treble Boost / Cut */}
            <div className="rounded-2xl border border-border/40 bg-surface-raised p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber" />
                  <span className="text-xs font-bold text-foreground">Treble Presence</span>
                </div>
                <span className="font-mono text-xs font-bold text-primary">
                  {trebleLevel > 0 ? `+${trebleLevel.toFixed(1)}` : trebleLevel.toFixed(1)} dB
                </span>
              </div>
              <Slider
                min={-12}
                max={12}
                step={0.5}
                value={[trebleLevel]}
                onValueChange={([val]) => setTrebleLevel(val)}
                className="my-3"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                High-shelf clarity & sparkle above 8kHz.
              </p>
            </div>

            {/* Dynamics Normalizer & Stereo Width */}
            <div className="rounded-2xl border border-border/40 bg-surface-raised p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold text-foreground">Dynamics Normalizer</span>
                  </div>
                  <Button
                    size="sm"
                    variant={normalizerEnabled ? "default" : "outline"}
                    onClick={toggleNormalizer}
                    className="h-6 text-[10px] rounded-full px-2.5"
                  >
                    {normalizerEnabled ? "ON" : "OFF"}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug">
                  Compresses loud spikes & normalizes volume dynamics.
                </p>
              </div>

              <div className="mt-3 pt-3 border-t border-border/30">
                <div className="flex items-center justify-between text-[11px] font-bold text-foreground mb-1">
                  <span>Stereo Width</span>
                  <span className="font-mono text-primary">{Math.round(stereoWidth * 100)}%</span>
                </div>
                <Slider
                  min={0}
                  max={2}
                  step={0.1}
                  value={[stereoWidth]}
                  onValueChange={([val]) => setStereoWidth(val)}
                  className="my-1.5"
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
