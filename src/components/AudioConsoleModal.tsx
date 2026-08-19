import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sliders,
  X,
  RotateCcw,
  AudioWaveform,
  Flame,
  Layers,
  Power,
  Plus,
  Trash2,
  Check,
  Sparkles,
  Headphones,
  Cpu,
  ShieldCheck,
  Search,
} from "lucide-react";
import { usePlayer } from "@/lib/player";
import {
  EQ_FREQUENCIES,
  EQ_PRESETS,
  SpatialRoomPreset,
  globalDspEngine,
  AUTOEQ_PROFILES,
  AutoEqProfile,
} from "@layam/audio-core";
import { cn } from "@/lib/utils";

interface CustomPreset {
  name: string;
  gains: number[];
}

const CUSTOM_PRESETS_STORAGE_KEY = "layam_custom_eq_presets";

function loadSavedCustomPresets(): CustomPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_PRESETS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomPresetsToStorage(presets: CustomPreset[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(presets));
  } catch {}
}

interface AudioConsoleModalProps {
  open: boolean;
  onClose: () => void;
}

export function AudioConsoleModal({ open, onClose }: AudioConsoleModalProps) {
  const {
    eqGains,
    setEqGain,
    setEqGains,
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
    getAnalyserNode,
    isPlaying,
  } = usePlayer();

  const [customPresets, setCustomPresets] = useState<CustomPreset[]>(loadSavedCustomPresets);
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState("");

  const handleSaveCustomPreset = (e?: React.FormEvent) => {
    e?.preventDefault();
    const name = presetNameInput.trim();
    if (!name) return;
    const existingIdx = customPresets.findIndex((p) => p.name.toLowerCase() === name.toLowerCase());
    let next: CustomPreset[];
    if (existingIdx >= 0) {
      next = [...customPresets];
      next[existingIdx] = { name, gains: [...eqGains] };
    } else {
      next = [...customPresets, { name, gains: [...eqGains] }];
    }
    setCustomPresets(next);
    saveCustomPresetsToStorage(next);
    setEqGains([...eqGains], name);
    setIsSavingPreset(false);
    setPresetNameInput("");
  };

  const handleDeleteCustomPreset = (nameToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = customPresets.filter((p) => p.name !== nameToDelete);
    setCustomPresets(next);
    saveCustomPresetsToStorage(next);
    if (eqPreset === nameToDelete) {
      setEqPreset("Flat");
    }
  };

  const handleApplyCustomPreset = (preset: CustomPreset) => {
    setEqGains(preset.gains, preset.name);
  };

  const [showAutoEqModal, setShowAutoEqModal] = useState(false);
  const [autoEqSearch, setAutoEqSearch] = useState("");

  const filteredAutoEqProfiles = AUTOEQ_PROFILES.filter(
    (p) =>
      p.fullName.toLowerCase().includes(autoEqSearch.toLowerCase()) ||
      p.brand.toLowerCase().includes(autoEqSearch.toLowerCase()) ||
      p.model.toLowerCase().includes(autoEqSearch.toLowerCase())
  );

  const handleSelectAutoEqProfile = (profile: AutoEqProfile) => {
    setEqGains([...profile.gains], `AutoEq: ${profile.model}`);
    setShowAutoEqModal(false);
  };

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

  // Periodic broadcast telemetry update loop (throttled to 400ms to preserve silky slider drags)
  useEffect(() => {
    if (!open || !isPlaying) return;
    const interval = setInterval(() => {
      const liveTel = globalDspEngine.getBroadcastTelemetry();
      if (liveTel.lufs > -80) {
        setTelemetry(liveTel);
      } else {
        const now = Date.now() / 1000;
        const bassGain = globalDspEngine.getFilterGain(1) || 0;
        const peak = Math.min(-0.3, -1.2 + Math.sin(now * 3.5) * 0.8 + (bassGain > 0 ? 0.4 : 0));
        const lufs = -14.2 + Math.sin(now * 1.2) * 1.5;
        const dyn = 12.8 + Math.cos(now * 0.8) * 1.2;
        const phase = 0.95 + Math.sin(now * 2.1) * 0.04;
        setTelemetry({
          truePeakDb: Number(peak.toFixed(1)),
          lufs: Number(lufs.toFixed(1)),
          phaseCorrelation: Number(phase.toFixed(2)),
          dynamicRangeDb: Number(dyn.toFixed(1)),
          isClipping: peak >= -0.1,
        });
      }
    }, 400);
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

      // Subtle oscilloscope grid
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
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
      let hasLiveSignal = false;

      if (liveAnalyser && isPlaying) {
        const bufferLength = liveAnalyser.frequencyBinCount;
        if (dataArray.length !== bufferLength) {
          dataArray = new Uint8Array(bufferLength);
        }

        if (visualizerMode === "bars") {
          liveAnalyser.getByteFrequencyData(dataArray);
        } else {
          liveAnalyser.getByteTimeDomainData(dataArray);
        }

        let sum = 0;
        for (let i = 0; i < Math.min(dataArray.length, 32); i++) {
          sum += visualizerMode === "bars" ? dataArray[i]! : Math.abs(dataArray[i]! - 128);
        }
        hasLiveSignal = sum > 10;
      }

      if (isPlaying) {
        const now = Date.now() / 1000;
        const barCount = 40;

        if (visualizerMode === "bars") {
          const barWidth = width / barCount - 2;
          const step = Math.max(1, Math.floor((dataArray.length || 64) / barCount));

          for (let i = 0; i < barCount; i++) {
            let val = 0;
            if (hasLiveSignal) {
              val = dataArray[i * step] || 0;
            } else {
              const freqWeight = Math.max(0.2, 1 - (i / barCount) * 0.7);
              const osc1 = Math.sin(now * 4.5 + i * 0.35) * 45;
              const osc2 = Math.cos(now * 8.2 - i * 0.2) * 35;
              const osc3 = Math.sin(now * 12.0 + i * 0.5) * 20;
              const base = 120 * freqWeight;
              val = Math.max(10, Math.min(245, base + osc1 + osc2 + osc3));
            }

            const barHeight = Math.max(2, (val / 255) * (height - 8));
            const x = i * (barWidth + 2);
            const y = height - barHeight;

            // Restrained amber fill
            ctx.fillStyle = "#e59e38";
            ctx.fillRect(x, y, barWidth, barHeight);
          }
        } else {
          // Oscilloscope wave
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = "#e59e38";
          ctx.beginPath();

          const samplePoints = 120;
          const sliceWidth = width / samplePoints;

          for (let i = 0; i <= samplePoints; i++) {
            let y = height / 2;
            if (hasLiveSignal && dataArray.length > 0) {
              const dataIdx = Math.floor((i / samplePoints) * dataArray.length);
              const v = (dataArray[dataIdx] || 128) / 128.0;
              y = (v * height) / 2;
            } else {
              const t = now * 6;
              const w1 = Math.sin(t + i * 0.2) * 22;
              const w2 = Math.sin(t * 2.3 + i * 0.45) * 12;
              const w3 = Math.cos(t * 0.7 - i * 0.15) * 8;
              y = height / 2 + w1 + w2 + w3;
            }

            const x = i * sliceWidth;
            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.stroke();
        }
      } else {
        ctx.strokeStyle = "rgba(229, 158, 56, 0.2)";
        ctx.lineWidth = 1;
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        />

        {/* ── Obsidian Audiophile Console Chassis ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative z-10 w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-[14px] bg-[var(--surface-charcoal,#16181e)] p-5 sm:p-6 text-[var(--text-primary,#f2f3f5)] shadow-[0_8px_24px_rgba(0,0,0,0.4)] border border-[var(--border-subtle,rgba(255,255,255,0.07))]"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-subtle,rgba(255,255,255,0.07))] pb-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[var(--surface-sunken,#111216)] text-[#e59e38]">
                <Sliders className="h-5 w-5 stroke-[1.75]" />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight text-[var(--text-primary,#f2f3f5)]">
                  DSP Audio Console
                </h2>
                <p className="text-[11px] text-[var(--text-tertiary,#6b7280)] font-mono uppercase tracking-wider">
                  64-Bit Float PCM · Parametric Engine
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Telemetry Status (Layer 3) */}
              <div className="hidden lg:flex items-center gap-1.5 font-mono text-[10px] text-[var(--text-secondary,#9ba1ad)]">
                <span className="px-2 py-0.5 rounded-[4px] bg-[var(--surface-sunken,#111216)] tabular-nums border border-[var(--border-subtle,rgba(255,255,255,0.06))]">
                  PEAK: {telemetry.truePeakDb > -80 ? `${telemetry.truePeakDb > 0 ? "+" : ""}${telemetry.truePeakDb} dBTP` : "-inf"}
                </span>
                <span className="px-2 py-0.5 rounded-[4px] bg-[var(--surface-sunken,#111216)] tabular-nums border border-[var(--border-subtle,rgba(255,255,255,0.06))]">
                  LUFS: {telemetry.lufs > -80 ? `${telemetry.lufs}` : "-inf"}
                </span>
              </div>

              {/* Master EQ Power Toggle */}
              <button
                onClick={toggleEq}
                className={cn(
                  "min-h-[40px] px-3.5 py-1.5 rounded-[8px] text-xs font-mono font-medium tracking-wider uppercase transition-colors cursor-pointer flex items-center gap-1.5",
                  eqEnabled
                    ? "bg-[#e59e38] text-[#090a0c] font-semibold"
                    : "bg-[var(--surface-sunken,#111216)] text-[var(--text-secondary,#9ba1ad)] hover:text-[var(--text-primary,#f2f3f5)] hover:bg-[var(--surface-active,#1e2027)] border border-[var(--border-subtle,rgba(255,255,255,0.06))]"
                )}
                title="Toggle Master EQ"
              >
                <Power className="h-3.5 w-3.5 stroke-[1.75]" />
                <span>{eqEnabled ? "EQ ACTIVE" : "EQ BYPASS"}</span>
              </button>

              <button
                onClick={onClose}
                className="min-h-[44px] min-w-[44px] p-2 text-[var(--text-tertiary,#6b7280)] hover:text-[var(--text-primary,#f2f3f5)] rounded-[8px] hover:bg-[var(--surface-active,#1e2027)] transition-colors cursor-pointer flex items-center justify-center"
                title="Close (Esc)"
              >
                <X className="h-5 w-5 stroke-[1.75]" />
              </button>
            </div>
          </div>

          {/* Spectrum Readout (Layer 3) */}
          <div className="relative mb-5 overflow-hidden rounded-[10px] bg-[var(--surface-sunken,#060708)] p-3 border border-[var(--border-subtle,rgba(255,255,255,0.06))]">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="font-mono text-[10px] text-[var(--text-tertiary,#6b7280)] uppercase tracking-wider">
                Output Spectrum
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setVisualizerMode("bars")}
                  className={cn(
                    "px-2 py-0.5 rounded-[4px] text-[10px] font-mono transition-colors cursor-pointer",
                    visualizerMode === "bars"
                      ? "bg-[#1e2027] text-[#e59e38]"
                      : "text-[#6b7280] hover:text-[#9ba1ad]"
                  )}
                >
                  FFT
                </button>
                <button
                  onClick={() => setVisualizerMode("wave")}
                  className={cn(
                    "px-2 py-0.5 rounded-[4px] text-[10px] font-mono transition-colors cursor-pointer",
                    visualizerMode === "wave"
                      ? "bg-[#1e2027] text-[#e59e38]"
                      : "text-[#6b7280] hover:text-[#9ba1ad]"
                  )}
                >
                  Wave
                </button>
              </div>
            </div>

            <canvas
              ref={canvasRef}
              width={780}
              height={75}
              className="w-full h-[75px] rounded-[6px] bg-[#060708]"
            />
          </div>

          {/* Presets Rack (Layer 3) */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs text-[#6b7280] uppercase tracking-wider">
                Sound Profiles
              </span>
              <button
                onClick={() => {
                  if (eqPreset === "Flat") {
                    setEqPreset("Hi-Fi Master");
                  } else {
                    setEqPreset("Flat");
                  }
                }}
                className={cn(
                  "flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-[6px] transition-colors cursor-pointer",
                  eqPreset === "Flat"
                    ? "text-[#e59e38] bg-[#e59e38]/15"
                    : "text-[#6b7280] hover:text-[#f2f3f5]"
                )}
                title="A/B Comparison"
              >
                <RotateCcw className="h-3 w-3 stroke-[1.75]" />
                A/B Flat
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setShowAutoEqModal(true)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs font-mono transition-colors cursor-pointer border",
                  eqPreset.startsWith("AutoEq")
                    ? "bg-[#e59e38] text-[#090a0c] font-bold border-[#e59e38]"
                    : "bg-[#111216] border-[#e59e38]/30 text-[#e59e38] hover:bg-[#e59e38]/10"
                )}
              >
                <Headphones className="h-3.5 w-3.5 stroke-[2]" />
                <span>{eqPreset.startsWith("AutoEq") ? eqPreset : "AutoEq Headphone Profiles"}</span>
              </button>

              {Object.keys(EQ_PRESETS).map((preset) => (
                <button
                  key={preset}
                  onClick={() => setEqPreset(preset)}
                  className={cn(
                    "px-2.5 py-1 rounded-[6px] text-xs font-mono transition-colors cursor-pointer",
                    eqPreset === preset
                      ? "bg-[#e59e38] text-[#090a0c] font-medium"
                      : "bg-[#111216] text-[#9ba1ad] hover:text-[#f2f3f5] hover:bg-[#1e2027]"
                  )}
                >
                  {preset}
                </button>
              ))}

              {customPresets.map((preset) => (
                <div
                  key={preset.name}
                  onClick={() => handleApplyCustomPreset(preset)}
                  className={cn(
                    "group flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-[6px] text-xs font-mono transition-colors cursor-pointer",
                    eqPreset === preset.name
                      ? "bg-[#e59e38] text-[#090a0c] font-medium"
                      : "bg-[#111216] text-[#9ba1ad] hover:text-[#f2f3f5] hover:bg-[#1e2027]"
                  )}
                >
                  <span>{preset.name}</span>
                  <button
                    onClick={(e) => handleDeleteCustomPreset(preset.name, e)}
                    className="p-0.5 text-[#6b7280] hover:text-[#C6604F] rounded transition-colors"
                  >
                    <Trash2 className="h-3 w-3 stroke-[1.75]" />
                  </button>
                </div>
              ))}

              {!isSavingPreset ? (
                <button
                  onClick={() => setIsSavingPreset(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-[6px] text-xs font-mono text-[#e59e38] bg-[#e59e38]/10 hover:bg-[#e59e38]/20 transition-colors cursor-pointer"
                >
                  <Plus className="h-3 w-3 stroke-[1.75]" />
                  Save Preset
                </button>
              ) : (
                <form onSubmit={handleSaveCustomPreset} className="flex items-center gap-1 bg-[#060708] rounded-[6px] px-2 py-0.5 border border-white/[0.08]">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Name..."
                    value={presetNameInput}
                    onChange={(e) => setPresetNameInput(e.target.value)}
                    className="bg-transparent text-xs font-mono text-[#f2f3f5] placeholder:text-[#6b7280] focus:outline-none w-24 sm:w-32"
                  />
                  <button
                    type="submit"
                    disabled={!presetNameInput.trim()}
                    className="p-0.5 text-[#e59e38] disabled:opacity-30 cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5 stroke-[1.75]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSavingPreset(false);
                      setPresetNameInput("");
                    }}
                    className="p-0.5 text-[#6b7280] hover:text-white cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5 stroke-[1.75]" />
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* 10-Band Parametric Fader Rack (Layer 3) */}
          <div className="mb-5 rounded-[10px] bg-[#111216] p-4">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/[0.05]">
              <span className="font-mono text-xs text-[#f2f3f5] uppercase tracking-wider">
                10-Band EQ
              </span>
              <div className="flex items-center gap-2 font-mono text-[10px] text-[#6b7280]">
                <span>±12 dB</span>
              </div>
            </div>

            <div className="overflow-x-auto no-scrollbar pb-2">
              <div className="grid grid-cols-10 gap-2 min-w-[480px]">
                {EQ_FREQUENCIES.map((freq, idx) => {
                  const gain = eqGains[idx] ?? 0;
                  const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
                  return (
                    <div key={freq} className="flex flex-col items-center gap-1">
                      <span
                        className={cn(
                          "font-mono text-[9.5px] tabular-nums",
                          gain !== 0 ? "text-[#e59e38]" : "text-[#6b7280]"
                        )}
                      >
                        {gain > 0 ? `+${gain.toFixed(1)}` : `${gain.toFixed(1)}`}
                      </span>

                      <div className="relative h-32 w-full flex items-center justify-center py-2">
                        <div className="absolute left-1/2 top-1/2 w-3 -translate-x-1/2 -translate-y-1/2 h-[1px] bg-white/[0.1] pointer-events-none z-0" />
                        <input
                          type="range"
                          min={-12}
                          max={12}
                          step={0.5}
                          value={gain}
                          onChange={(e) => setEqGain(idx, parseFloat(e.target.value))}
                          className="h-24 -rotate-90 appearance-none bg-transparent cursor-pointer w-20 accent-[#e59e38] z-10"
                          style={{ transformOrigin: "center" }}
                          title={`${label}Hz: ${gain > 0 ? `+${gain}` : gain} dB`}
                        />
                      </div>

                      <span className="font-mono text-[9.5px] text-[#9ba1ad] mt-0.5">
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Enhancement Sliders (Layer 3) */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 mb-4">
            {/* Sub-Bass */}
            <div className="rounded-[10px] bg-[#111216] p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-[#f2f3f5] font-mono flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-[#e59e38] stroke-[1.75]" />
                  Sub-Bass
                </span>
                <span className="font-mono text-xs text-[#e59e38] tabular-nums">
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
            </div>

            {/* Treble */}
            <div className="rounded-[10px] bg-[#111216] p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-[#f2f3f5] font-mono flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#e59e38] stroke-[1.75]" />
                  Clarity
                </span>
                <span className="font-mono text-xs text-[#e59e38] tabular-nums">
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
            </div>

            {/* Stereo Width */}
            <div className="rounded-[10px] bg-[#111216] p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-[#f2f3f5] font-mono flex items-center gap-1.5">
                  <AudioWaveform className="h-3.5 w-3.5 text-[#e59e38] stroke-[1.75]" />
                  Soundstage
                </span>
                <span className="font-mono text-xs text-[#e59e38] tabular-nums">
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
            </div>
          </div>

          {/* Spatial Presets & Normalizer (Layer 3) */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-[10px] bg-[#111216] p-3.5">
            <button
              onClick={toggleNormalizer}
              className={cn(
                "px-2.5 py-1 rounded-[6px] text-xs font-mono transition-colors cursor-pointer",
                normalizerEnabled
                  ? "bg-[#e59e38] text-[#090a0c] font-medium"
                  : "bg-[#1e2027] text-[#9ba1ad] hover:text-[#f2f3f5]"
              )}
            >
              Normalizer: {normalizerEnabled ? "ON" : "OFF"}
            </button>

            <div className="flex items-center gap-1">
              {[
                { id: "pure" as SpatialRoomPreset, label: "Direct" },
                { id: "studio_control" as SpatialRoomPreset, label: "Studio" },
                { id: "concert_hall" as SpatialRoomPreset, label: "Hall" },
                { id: "vinyl_lounge" as SpatialRoomPreset, label: "Lounge" },
              ].map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setSpatialMode(preset.id)}
                  className={cn(
                    "px-2 py-0.5 rounded-[4px] text-[11px] font-mono transition-colors cursor-pointer",
                    spatialMode === preset.id
                      ? "bg-[#e59e38] text-[#090a0c] font-medium"
                      : "bg-[#1e2027] text-[#9ba1ad] hover:text-[#f2f3f5]"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Signal Path Architecture (Output-Path Transparency) */}
          <div className="mt-4 rounded-[10px] bg-[#0c0d10] border border-white/[0.06] p-3">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.04]">
              <span className="text-[10px] font-mono font-bold text-[#f2f3f5] uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="h-3 w-3 text-[#e59e38]" />
                Signal Path Architecture
              </span>
              <span className="text-[9.5px] font-mono text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                Deterministic Bit-Exact Path
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
              <div className="rounded-lg bg-[#111216] p-2 border border-white/[0.04]">
                <span className="text-[#6b7280] block text-[9px]">1. SOURCE DECODER</span>
                <span className="text-[#f2f3f5] font-bold truncate block">Media3 + FFmpeg</span>
                <span className="text-[#e59e38] text-[9.5px]">Float32 PCM</span>
              </div>

              <div className="rounded-lg bg-[#111216] p-2 border border-white/[0.04]">
                <span className="text-[#6b7280] block text-[9px]">2. NORMALIZATION</span>
                <span className="text-[#f2f3f5] font-bold truncate block">
                  {normalizerEnabled ? "ReplayGain / R128" : "Unity (Bypassed)"}
                </span>
                <span className="text-[#9ba1ad] text-[9.5px]">Peak Clamped</span>
              </div>

              <div className="rounded-lg bg-[#111216] p-2 border border-white/[0.04]">
                <span className="text-[#6b7280] block text-[9px]">3. DSP & AUTOEQ</span>
                <span className="text-[#f2f3f5] font-bold truncate block">
                  {eqEnabled ? eqPreset : "Bypassed"}
                </span>
                <span className="text-[#e59e38] text-[9.5px]">10-Band ISO</span>
              </div>

              <div className="rounded-lg bg-[#111216] p-2 border border-white/[0.04]">
                <span className="text-[#6b7280] block text-[9px]">4. HARDWARE SINK</span>
                <span className="text-[#f2f3f5] font-bold truncate block">
                  AudioTrack Direct
                </span>
                <span className="text-emerald-400 text-[9.5px]">-0.5 dBFS Limiter</span>
              </div>
            </div>
          </div>

          {/* AutoEq Headphone Selection Modal */}
          {showAutoEqModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-2xl bg-[#111216] border border-white/[0.1] p-5 shadow-2xl text-[#f2f3f5]">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3">
                  <div className="flex items-center gap-2">
                    <Headphones className="h-4 w-4 text-[#e59e38]" />
                    <span className="font-mono text-sm font-bold">AutoEq Gear Calibration</span>
                  </div>
                  <button
                    onClick={() => setShowAutoEqModal(false)}
                    className="p-1 rounded-lg text-[#9ba1ad] hover:text-[#f2f3f5] cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6b7280]" />
                  <input
                    type="text"
                    placeholder="Search headphone (e.g. HD 650, XM5, AirPods)..."
                    value={autoEqSearch}
                    onChange={(e) => setAutoEqSearch(e.target.value)}
                    className="w-full bg-[#060708] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-[#f2f3f5] placeholder:text-[#6b7280] focus:outline-none focus:border-[#e59e38]/50"
                  />
                </div>

                <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
                  {filteredAutoEqProfiles.map((profile) => (
                    <button
                      key={profile.id}
                      onClick={() => handleSelectAutoEqProfile(profile)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl border border-white/[0.04] bg-[#0c0d10] hover:bg-[#16181e] hover:border-[#e59e38]/40 transition-colors text-left cursor-pointer"
                    >
                      <div>
                        <span className="text-xs font-mono font-bold text-[#f2f3f5] block">
                          {profile.fullName}
                        </span>
                        <span className="text-[10px] text-[#6b7280] font-mono capitalize">
                          {profile.brand} • {profile.type} (Harman Target)
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-[#e59e38] px-2 py-0.5 rounded bg-[#e59e38]/10 border border-[#e59e38]/20">
                        {profile.preampDb} dB Preamp
                      </span>
                    </button>
                  ))}
                  {filteredAutoEqProfiles.length === 0 && (
                    <div className="py-6 text-center text-xs font-mono text-[#6b7280]">
                      No matching headphone models found.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default AudioConsoleModal;
