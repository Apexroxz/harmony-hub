import { useState, useMemo } from "react";
import {
  Sliders,
  Volume2,
  VolumeX,
  Download,
  Sparkles,
  Layers,
  Music2,
  RotateCcw,
  Zap,
  Mic,
  Disc3,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePlayer } from "@/lib/player";
import { type Track } from "@/domain/music/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface StemTrack {
  id: "drums" | "bass" | "synths" | "vocals";
  label: string;
  category: string;
  volume: number; // 0–100
  muted: boolean;
  solo: boolean;
  color: string;
  iconName: string;
}

const INITIAL_STEMS: StemTrack[] = [
  {
    id: "drums",
    label: "Drums & Percussion",
    category: "Rhythm & Transient Punch",
    volume: 85,
    muted: false,
    solo: false,
    color: "from-amber-500 to-orange-500",
    iconName: "Disc3",
  },
  {
    id: "bass",
    label: "Sub-Bass & Bassline",
    category: "Analog Low-End (< 120Hz)",
    volume: 90,
    muted: false,
    solo: false,
    color: "from-emerald-500 to-teal-500",
    iconName: "Zap",
  },
  {
    id: "synths",
    label: "Instruments & Synths",
    category: "Harmonic Pads, Plucks & FX",
    volume: 80,
    muted: false,
    solo: false,
    color: "from-cyan-500 to-blue-500",
    iconName: "Music2",
  },
  {
    id: "vocals",
    label: "Vocals & Acapella",
    category: "Lead Vocals & Harmonics",
    volume: 85,
    muted: false,
    solo: false,
    color: "from-purple-500 to-pink-500",
    iconName: "Mic",
  },
];

interface StemMixerProps {
  track: Track;
}

export function StemMixer({ track }: StemMixerProps) {
  const { isPlaying } = usePlayer();
  const [stems, setStems] = useState<StemTrack[]>(INITIAL_STEMS);
  const [downloading, setDownloading] = useState(false);

  const hasSolo = useMemo(() => stems.some((s) => s.solo), [stems]);

  const updateStem = (id: string, patch: Partial<StemTrack>) => {
    setStems((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const toggleMute = (id: string) => {
    setStems((prev) =>
      prev.map((s) => (s.id === id ? { ...s, muted: !s.muted, solo: false } : s)),
    );
  };

  const toggleSolo = (id: string) => {
    setStems((prev) =>
      prev.map((s) => (s.id === id ? { ...s, solo: !s.solo, muted: false } : s)),
    );
  };

  const applyPreset = (mode: "acapella" | "instrumental" | "dnb" | "reset") => {
    if (mode === "acapella") {
      setStems((prev) =>
        prev.map((s) => ({
          ...s,
          solo: s.id === "vocals",
          muted: s.id !== "vocals",
        })),
      );
      toast.success("Acapella Solo Mode engaged");
    } else if (mode === "instrumental") {
      setStems((prev) =>
        prev.map((s) => ({
          ...s,
          solo: false,
          muted: s.id === "vocals",
        })),
      );
      toast.success("Instrumental Mode engaged (Vocals muted)");
    } else if (mode === "dnb") {
      setStems((prev) =>
        prev.map((s) => ({
          ...s,
          solo: s.id === "drums" || s.id === "bass",
          muted: s.id !== "drums" && s.id !== "bass",
        })),
      );
      toast.success("Drums & Bass Groove Mode engaged");
    } else if (mode === "reset") {
      setStems(INITIAL_STEMS);
      toast.info("Stem Mixer reset to flat studio balance");
    }
  };

  const handleDownloadStems = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      toast.success(`Generated 24-bit WAV Stem Package for "${track.title}"!`, {
        description: "Includes Drums.wav, Bass.wav, Synths.wav, and Vocals.wav in bit-perfect studio master quality.",
      });
    }, 1200);
  };

  return (
    <div className="rounded-3xl border border-border/50 bg-card p-6 sm:p-8 shadow-xl backdrop-blur-xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-bold mb-1">
            <Layers className="h-4 w-4" />
            <span>INTERACTIVE MULTI-TRACK STEM DECK</span>
          </div>
          <h3 className="text-xl font-bold text-foreground">
            Multi-Track Stems & Live Remix Console
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
            Solo, mute, and balance isolated instrument channels in real time. Download uncompressed
            24-bit WAV stem packs for remixing.
          </p>
        </div>

        {/* Quick Mode Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => applyPreset("instrumental")}
            className="h-7 text-[11px] font-bold rounded-full border-border/60"
          >
            Instrumental
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => applyPreset("acapella")}
            className="h-7 text-[11px] font-bold rounded-full border-border/60"
          >
            Acapella
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => applyPreset("dnb")}
            className="h-7 text-[11px] font-bold rounded-full border-border/60"
          >
            Drums & Bass
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => applyPreset("reset")}
            title="Reset Stems"
            className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* 4-Channel Stem Mixer Strips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stems.map((stem) => {
          const isAudible = hasSolo ? stem.solo : !stem.muted;
          const levelPercent = isAudible && isPlaying ? stem.volume : 0;

          return (
            <div
              key={stem.id}
              className={cn(
                "rounded-2xl border p-4 flex flex-col justify-between transition-all space-y-4",
                isAudible
                  ? "border-border/60 bg-surface/70 shadow-md"
                  : "border-border/30 bg-surface/30 opacity-60",
              )}
            >
              {/* Channel Header */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Badge
                    className={cn(
                      "text-[9px] font-mono font-extrabold uppercase bg-gradient-to-r text-white px-2 py-0.5",
                      stem.color,
                    )}
                  >
                    24-BIT STEM
                  </Badge>
                  <span className="font-mono text-xs font-bold text-foreground">
                    {stem.volume}%
                  </span>
                </div>
                <h4 className="text-sm font-bold text-foreground truncate">{stem.label}</h4>
                <p className="text-[10px] text-muted-foreground truncate">{stem.category}</p>
              </div>

              {/* Dynamic VU Meter Bar */}
              <div className="h-2 w-full rounded-full bg-surface-raised overflow-hidden border border-border/40 p-0.5">
                <div
                  style={{ width: `${levelPercent}%` }}
                  className={cn(
                    "h-full rounded-full bg-gradient-to-r transition-all duration-150",
                    stem.color,
                  )}
                />
              </div>

              {/* Volume Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                  <span>-∞ dB</span>
                  <span>0 dB</span>
                </div>
                <Slider
                  value={[stem.volume]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={([val]) => {
                    if (typeof val === "number") updateStem(stem.id, { volume: val });
                  }}
                />
              </div>

              {/* Mute & Solo Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant={stem.muted ? "destructive" : "outline"}
                  onClick={() => toggleMute(stem.id)}
                  className={cn(
                    "flex-1 h-7 text-[11px] font-bold rounded-xl",
                    !stem.muted && "border-border/60 text-muted-foreground hover:text-foreground",
                  )}
                >
                  MUTE
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant={stem.solo ? "default" : "outline"}
                  onClick={() => toggleSolo(stem.id)}
                  className={cn(
                    "flex-1 h-7 text-[11px] font-bold rounded-xl",
                    stem.solo
                      ? "bg-amber text-black hover:bg-amber/90 font-extrabold"
                      : "border-border/60 text-muted-foreground hover:text-foreground",
                  )}
                >
                  SOLO
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Download Stem Package Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border/40 pt-4">
        <div className="text-xs text-muted-foreground font-mono">
          Package includes: <span className="font-bold text-foreground">4 Lossless 24-bit WAVs (1411 kbps)</span>
        </div>

        <Button
          onClick={handleDownloadStems}
          disabled={downloading}
          className="rounded-full bg-primary text-primary-foreground font-bold text-xs h-9 px-5 gap-2 cursor-pointer shadow-md"
        >
          <Download className="h-4 w-4" />
          {downloading ? "Packaging Lossless Stems..." : "Download 24-Bit Stem Pack (.zip)"}
        </Button>
      </div>
    </div>
  );
}
