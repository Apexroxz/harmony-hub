import { useState, useEffect } from "react";
import {
  Headphones,
  Speaker,
  Radio,
  Sliders,
  CheckCircle2,
  Sparkles,
  Zap,
  RotateCcw,
  Volume2,
  Layers,
  Activity,
  ArrowRight,
  ShieldCheck,
  Disc,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePlayer, type SoundProfile, type SpatialRoomPreset } from "@/lib/player";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface GearPreset {
  id: string;
  name: string;
  category: "open_back" | "planar" | "iem" | "wireless" | "monitors" | "speakers";
  models: string;
  description: string;
  acousticTarget: string;
  eqGains: number[]; // 10 bands: 32, 64, 125, 250, 500, 1k, 2k, 4k, 8k, 16k
  bassBoostLevel: number;
  trebleLevel: number;
  stereoWidth: number;
  normalizerEnabled: boolean;
  spatialMode: SpatialRoomPreset;
  spatialAmbience: number;
  recommendedTracks?: string;
}

export const GEAR_PRESETS: GearPreset[] = [
  {
    id: "open_back_senn",
    name: "Open-Back Dynamic Reference",
    category: "open_back",
    models: "Sennheiser HD600 / HD650 / HD800S, Focal Clear, Beyerdynamic DT1990",
    description:
      "Optimized for diffuse-field natural timbre with sub-bass extension boost and silky smooth vocal clarity.",
    acousticTarget: "Diffuse-Field Neutral + Harmless Sub-Bass Lift (+2.5dB @ 64Hz)",
    eqGains: [3.0, 2.5, 1.2, 0.0, 0.0, 0.5, 0.0, -0.5, -1.0, -0.5],
    bassBoostLevel: 2.0,
    trebleLevel: 0,
    stereoWidth: 1.1,
    normalizerEnabled: false,
    spatialMode: "control_room",
    spatialAmbience: 0.35,
  },
  {
    id: "planar_audeze",
    name: "Planar Magnetic Audiophile",
    category: "planar",
    models: "Audeze LCD-X / LCD-2, Hifiman Arya / Sundara, Dan Clark Stealth",
    description:
      "Linear sub-bass extension to 20Hz, gentle ear-gain adjustment at 3kHz, and analog vinyl crossfeed warmth.",
    acousticTarget: "Ultra-Fast Transient Precision + Deep Planar Linearity",
    eqGains: [2.0, 1.5, 0.5, 0.0, 0.0, 0.0, 1.5, 1.0, 0.0, -1.0],
    bassBoostLevel: 1.0,
    trebleLevel: 0.5,
    stereoWidth: 1.15,
    normalizerEnabled: false,
    spatialMode: "vinyl_lounge",
    spatialAmbience: 0.45,
  },
  {
    id: "iem_harman",
    name: "In-Ear Monitors (IEMs)",
    category: "iem",
    models: "Moondrop Blessing 3, Shure SE846, Thieaudio Monarch, 64 Audio U12t",
    description:
      "Harman In-Ear target compensation with peak sibilance damping at 8kHz and expanded soundstage.",
    acousticTarget: "Harman Target In-Ear Curve + 8kHz Anti-Sibilance Filter",
    eqGains: [3.5, 2.0, 0.5, -0.5, 0.0, 0.5, 1.0, -1.8, -1.5, 0.5],
    bassBoostLevel: 1.5,
    trebleLevel: -1.0,
    stereoWidth: 1.25,
    normalizerEnabled: false,
    spatialMode: "concert_hall",
    spatialAmbience: 0.4,
  },
  {
    id: "wireless_anc",
    name: "Wireless ANC & Bluetooth Codecs",
    category: "wireless",
    models: "Apple AirPods Max / Pro 2, Sony WH-1000XM5, Bose QuietComfort Ultra",
    description:
      "Compensates for lossy Bluetooth compression artifacts (AAC/LDAC) with harmonic air enhancement and dynamics lift.",
    acousticTarget: "Lossless Restoration + Air Brilliance Lift (+2dB @ 16kHz)",
    eqGains: [1.5, 1.0, 0.0, 0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0],
    bassBoostLevel: 1.0,
    trebleLevel: 2.0,
    stereoWidth: 1.2,
    normalizerEnabled: true,
    spatialMode: "studio_control",
    spatialAmbience: 0.3,
  },
  {
    id: "studio_monitors",
    name: "Studio Reference Nearfield Monitors",
    category: "monitors",
    models: "Genelec 8030C, Yamaha HS8, Neumann KH 120, ADAM Audio A7V",
    description:
      "Bit-perfect zero-coloration PCM passthrough. Pure master tape transparency for acoustic mastering.",
    acousticTarget: "Bit-Perfect Transparent Linear Studio Master (0 dB Flat)",
    eqGains: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    bassBoostLevel: 0,
    trebleLevel: 0,
    stereoWidth: 1.0,
    normalizerEnabled: false,
    spatialMode: "pure",
    spatialAmbience: 0.0,
  },
  {
    id: "living_room_speakers",
    name: "Living Room Hi-Fi Floor Speakers",
    category: "speakers",
    models: "KEF LS50 / R3, Bowers & Wilkins 700, Klipsch Forte, Dynaudio Special Forty",
    description:
      "Wide stereo room dispersion with natural acoustic room reverb and low-end punch for ambient listening.",
    acousticTarget: "Room-Acoustic Dispersion + Warm Low-End Presence",
    eqGains: [2.5, 2.0, 1.0, 0.5, 0.0, 0.0, 0.5, 1.0, 1.5, 1.0],
    bassBoostLevel: 2.5,
    trebleLevel: 1.0,
    stereoWidth: 1.3,
    normalizerEnabled: false,
    spatialMode: "concert_hall",
    spatialAmbience: 0.5,
  },
];

interface GearCalibrationModalProps {
  open: boolean;
  onClose: () => void;
}

export function GearCalibrationModal({ open, onClose }: GearCalibrationModalProps) {
  const { applyFullSoundProfile } = usePlayer();
  const [selectedGearId, setSelectedGearId] = useState<string>("open_back_senn");
  const [activeCalibratedId, setActiveCalibratedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("layam_active_calibrated_gear");
      if (saved) {
        setSelectedGearId(saved);
        setActiveCalibratedId(saved);
      }
    } catch {}
  }, []);

  const selectedPreset: GearPreset =
    GEAR_PRESETS.find((p) => p.id === selectedGearId) ?? GEAR_PRESETS[0]!;

  const handleApplyCalibration = (preset: GearPreset) => {
    const profile: SoundProfile = {
      id: `gear_${preset.id}`,
      name: preset.name,
      hardwareDevice: preset.models,
      eqGains: [...preset.eqGains],
      eqPreset: preset.name,
      bassBoostLevel: preset.bassBoostLevel,
      trebleLevel: preset.trebleLevel,
      stereoWidth: preset.stereoWidth,
      normalizerEnabled: preset.normalizerEnabled,
      spatialMode: preset.spatialMode,
      spatialAmbience: preset.spatialAmbience,
      syncedAt: new Date().toISOString(),
    };

    applyFullSoundProfile(profile);
    setActiveCalibratedId(preset.id);
    try {
      localStorage.setItem("layam_active_calibrated_gear", preset.id);
    } catch {}

    toast.success(`Acoustic Profile Calibrated: ${preset.name}!`, {
      description: `Target curve and 3D ${preset.spatialMode} DSP applied to audio stream.`,
    });
  };

  const getCategoryIcon = (category: GearPreset["category"]) => {
    switch (category) {
      case "open_back":
      case "planar":
      case "iem":
      case "wireless":
        return <Headphones className="h-5 w-5" />;
      case "monitors":
        return <Activity className="h-5 w-5" />;
      case "speakers":
        return <Speaker className="h-5 w-5" />;
      default:
        return <Disc className="h-5 w-5" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-3xl overflow-hidden rounded-3xl border border-primary/40 bg-card p-0 shadow-2xl backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 p-6 bg-surface-raised/80">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary border border-primary/30">
              <Headphones className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-extrabold text-foreground flex items-center gap-2">
                <span>Audiophile Gear Auto-Calibration Engine</span>
                <Badge className="bg-primary/20 text-primary border-primary/40 text-[9px] font-mono font-bold px-2 py-0.5">
                  DSP PROFILES
                </Badge>
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automatically calibrate the 10-band EQ and 3D spatial stage for your specific headphones or monitors.
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Hardware Selector Grid */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
              1. Select Your Listening Hardware:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {GEAR_PRESETS.map((preset) => {
                const isSelected = selectedGearId === preset.id;
                const isCalibrated = activeCalibratedId === preset.id;

                return (
                  <div
                    key={preset.id}
                    onClick={() => setSelectedGearId(preset.id)}
                    className={cn(
                      "p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between text-xs space-y-2 relative overflow-hidden",
                      isSelected
                        ? "border-primary bg-primary/10 shadow-md ring-1 ring-primary/40"
                        : "border-border/40 bg-surface-raised hover:border-border/80",
                    )}
                  >
                    {isCalibrated && (
                      <Badge className="absolute top-2 right-2 bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[8px] font-mono font-bold px-1.5 py-0.2">
                        ACTIVE CALIBRATION
                      </Badge>
                    )}

                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          "h-8 w-8 rounded-xl flex items-center justify-center border",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-surface text-muted-foreground border-border/40",
                        )}
                      >
                        {getCategoryIcon(preset.category)}
                      </div>
                      <div className="pr-12">
                        <p className="font-extrabold text-foreground line-clamp-1">{preset.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {preset.spatialMode.replace("_", " ").toUpperCase()}
                        </p>
                      </div>
                    </div>

                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {preset.models}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Preset Acoustic Blueprint */}
          <div className="rounded-2xl border border-primary/30 bg-surface-raised p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
              <div>
                <span className="text-[10px] font-mono text-primary uppercase tracking-wider font-bold">
                  Acoustic Target Calibration
                </span>
                <h4 className="text-sm font-black text-foreground">{selectedPreset.name}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{selectedPreset.description}</p>
              </div>

              <Button
                size="sm"
                onClick={() => handleApplyCalibration(selectedPreset)}
                className="rounded-xl bg-primary text-primary-foreground font-bold text-xs h-9 px-5 gap-1.5 cursor-pointer shadow-md shrink-0"
              >
                <Sparkles className="h-4 w-4" /> Calibrate Audio Stream
              </Button>
            </div>

            {/* Target Response Curve Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <span>Frequency Curve (10 Bands: 32Hz → 16kHz)</span>
                <span className="text-primary font-bold">{selectedPreset.acousticTarget}</span>
              </div>

              {/* 10-band interactive bar visualization */}
              <div className="h-28 rounded-xl bg-card border border-border/40 p-3 flex items-end justify-between gap-1.5">
                {[
                  "32Hz",
                  "64Hz",
                  "125Hz",
                  "250Hz",
                  "500Hz",
                  "1kHz",
                  "2kHz",
                  "4kHz",
                  "8kHz",
                  "16kHz",
                ].map((freq, i) => {
                  const gain = selectedPreset.eqGains[i] ?? 0;
                  const heightPercent = Math.max(15, Math.min(95, 50 + (gain / 12) * 45));
                  const isBoost = gain > 0;
                  const isCut = gain < 0;

                  return (
                    <div key={freq} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                      <span className="text-[8px] font-mono font-bold text-foreground">
                        {gain > 0 ? `+${gain.toFixed(1)}` : `${gain.toFixed(1)}`}
                      </span>
                      <div className="w-full bg-border/30 rounded-t-sm overflow-hidden flex items-end h-16">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={cn(
                            "w-full rounded-t transition-all duration-300",
                            isBoost
                              ? "bg-emerald-400"
                              : isCut
                              ? "bg-amber"
                              : "bg-primary/50",
                          )}
                        />
                      </div>
                      <span className="text-[8px] font-mono text-muted-foreground">{freq}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DSP Parameters Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-surface border border-border/30">
                <span className="text-[10px] text-muted-foreground block font-mono">3D Room Ambience</span>
                <span className="font-bold text-foreground capitalize">
                  {selectedPreset.spatialMode.replace("_", " ")} ({Math.round(selectedPreset.spatialAmbience * 100)}%)
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface border border-border/30">
                <span className="text-[10px] text-muted-foreground block font-mono">Stereo Soundstage</span>
                <span className="font-bold text-foreground">{selectedPreset.stereoWidth.toFixed(2)}x Expansion</span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface border border-border/30">
                <span className="text-[10px] text-muted-foreground block font-mono">Bass Boost</span>
                <span className="font-bold text-foreground">+{selectedPreset.bassBoostLevel.toFixed(1)} dB</span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface border border-border/30">
                <span className="text-[10px] text-muted-foreground block font-mono">Loudness Normalizer</span>
                <span className="font-bold text-foreground">
                  {selectedPreset.normalizerEnabled ? "Enabled (EBU R128)" : "Bypassed (Audiophile)"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
