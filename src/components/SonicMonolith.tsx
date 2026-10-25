import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  Disc3,
  Sparkles,
  Volume2,
  Activity,
  Zap,
  Sliders,
  Cpu,
  Radio,
  ShieldCheck,
  Headphones,
} from "lucide-react";
import { usePlayer } from "@/lib/player";
import { type Track } from "@/domain/music/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SonicMonolithProps {
  tracks: Track[];
}

export function SonicMonolith({ tracks }: SonicMonolithProps) {
  const { currentTrack, isPlaying, togglePlay, playTrack, getAnalyserNode } = usePlayer();
  const activeTrack = currentTrack || tracks[0];
  const [activeFrequency, setActiveFrequency] = useState<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const updateVUMeter = () => {
      const analyser = getAnalyserNode();
      if (analyser && isPlaying) {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setActiveFrequency(avg);
      } else {
        setActiveFrequency(0);
      }
      animationFrameRef.current = requestAnimationFrame(updateVUMeter);
    };

    updateVUMeter();
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, getAnalyserNode]);

  const handleMasterPlay = () => {
    if (activeTrack) {
      if (!currentTrack || currentTrack.id !== activeTrack.id) {
        playTrack(activeTrack, tracks);
      } else {
        togglePlay();
      }
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-[2.5rem] border border-white/[0.09] bg-gradient-to-b from-[#141517] via-[#0d0e10] to-[#070708] p-6 sm:p-10 shadow-[0_25px_80px_-15px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl">
      {/* Radiant Background Photon Bloom */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-96 w-96 rounded-full bg-gradient-to-br from-primary/20 via-primary/5 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-gradient-to-tl from-amber/15 via-emerald-500/5 to-transparent blur-3xl" />

      {/* Top Precision Machinery Status Header */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.08] text-primary shadow-inner">
            <Disc3 className={cn("h-5 w-5", isPlaying && "animate-spin-slow text-primary")} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary font-bold">
                Acoustic Master Reference Monolith
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              24-BIT / 96kHz DIRECT DSD-PCM HYBRID DECODER
            </p>
          </div>
        </div>

        {/* Live Vacuum Tube Dynamics Meter */}
        <div className="flex items-center gap-3 bg-black/40 rounded-2xl border border-white/[0.06] px-4 py-2">
          <Activity className={cn("h-4 w-4", isPlaying ? "text-primary animate-pulse" : "text-muted-foreground")} />
          <div className="flex flex-col">
            <span className="text-[9px] font-mono text-muted-foreground tracking-wider uppercase">
              Dynamic Headroom
            </span>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-24 bg-white/[0.06] rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${Math.min(100, Math.max(10, (activeFrequency / 255) * 100))}%` }}
                  className={cn(
                    "h-full rounded-full transition-all duration-75",
                    isPlaying ? "bg-gradient-to-r from-primary to-amber" : "bg-muted-foreground/30",
                  )}
                />
              </div>
              <span className="font-mono text-[10px] font-bold text-foreground">
                {isPlaying ? `${(144 - (activeFrequency / 255) * 12).toFixed(1)} dB` : "144.0 dB"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Sonic Stage: Kinetic Vinyl Turntable + Master Tape Artwork */}
      <div className="relative z-10 my-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left: Interactive Vinyl Record & Album Artwork Hologram (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col sm:flex-row items-center justify-center gap-6 relative">
          {/* Vinyl Record Sleeve & Disc Assembly */}
          <div className="relative flex items-center justify-center">
            {/* The Outer Matte Sleeve */}
            <div className="relative z-20 h-56 w-56 sm:h-64 sm:w-64 overflow-hidden rounded-3xl border border-white/[0.12] bg-[#1a1b1e] shadow-[0_20px_50px_rgba(0,0,0,0.9)] transition-transform duration-500 hover:scale-[1.02]">
              <img
                src={activeTrack?.coverImage || "/logo.png"}
                alt={activeTrack?.title || "Vinyl Master"}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

              {/* Gold Leaf Master Seal */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-md px-2.5 py-1 border border-primary/40">
                <Sparkles className="h-3 w-3 text-primary" />
                <span className="text-[9px] font-mono font-bold text-primary tracking-widest uppercase">
                  MASTER 24/96
                </span>
              </div>

              {/* Interactive Center Play Overlay */}
              <button
                onClick={handleMasterPlay}
                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-all duration-300 cursor-pointer backdrop-blur-[2px]"
                aria-label="Play Master Record"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl transition-transform duration-300 hover:scale-110">
                  {isPlaying ? (
                    <Pause className="h-7 w-7 fill-current" />
                  ) : (
                    <Play className="h-7 w-7 fill-current ml-1" />
                  )}
                </div>
              </button>
            </div>

            {/* The Vinyl Master Disc (Slides IN and spins when playing; slides OUT when idle) */}
            <div
              onClick={handleMasterPlay}
              className={cn(
                "absolute top-2 left-4 h-52 w-52 sm:h-60 sm:w-60 rounded-full bg-gradient-to-tr from-[#050505] via-[#141414] to-[#080808] border border-white/[0.1] shadow-2xl transition-all duration-700 ease-out flex items-center justify-center cursor-pointer",
                isPlaying
                  ? "translate-x-0 z-10 opacity-95 scale-100 animate-[spin_4s_linear_infinite]"
                  : "translate-x-16 sm:translate-x-24 z-10 opacity-90 scale-95 hover:translate-x-20 sm:hover:translate-x-28",
              )}
              title={isPlaying ? "Vinyl Playing (Click to Pause)" : "Vinyl Out (Click to Slide In & Play)"}
            >
              {/* Vinyl Grooves Texture */}
              <div className="absolute inset-2 rounded-full border border-white/[0.04]" />
              <div className="absolute inset-6 rounded-full border border-white/[0.04]" />
              <div className="absolute inset-10 rounded-full border border-white/[0.04]" />
              <div className="absolute inset-14 rounded-full border border-white/[0.04]" />
              <div className="absolute inset-18 rounded-full border border-white/[0.04]" />

              {/* Optical Light Reflection on Vinyl Grooves */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/[0.04] to-transparent pointer-events-none" />

              {/* Vinyl Center Label */}
              <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-full overflow-hidden border border-primary/50 bg-[#121212] flex items-center justify-center text-center p-2 shadow-inner">
                <img
                  src={activeTrack?.coverImage || "/logo.png"}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-60"
                />
                <div className="relative z-10">
                  <span className="text-[7px] font-mono font-black text-white uppercase tracking-wider block">
                    LAYAM
                  </span>
                  <span className="text-[6px] font-mono text-primary font-bold block">
                    96kHz PCM
                  </span>
                </div>
                {/* Center Spindle Hole */}
                <div className="absolute h-3 w-3 rounded-full bg-[#050505] border border-white/30 shadow-inner" />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Master Information & Symbolic Sound Philosophy (5 Cols) */}
        <div className="lg:col-span-5 space-y-5 text-left">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/15 text-primary border-primary/30 text-[9px] font-mono font-bold px-2 py-0.5 tracking-wider">
                ORIGINAL MASTER TAPE
              </Badge>
              <span className="text-xs font-mono text-muted-foreground">· 0% COMPRESSION</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground line-clamp-1">
              {activeTrack?.title || "Master Audio Spectrum"}
            </h3>
            <p className="text-sm font-semibold text-primary/90">
              {activeTrack?.artistName || "Independent Creator"}
            </p>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Engineered with zero dynamic squashing. Every transient, breath, and micro-harmonic is
            delivered directly to your DAC exactly as recorded in the studio control room.
          </p>

          {/* Master Acoustic Specification Matrix */}
          <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
              <span className="text-[9px] text-muted-foreground block uppercase tracking-wider">
                Sampling Rate
              </span>
              <span className="text-sm font-bold text-foreground">96.0 kHz</span>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
              <span className="text-[9px] text-muted-foreground block uppercase tracking-wider">
                Bit Resolution
              </span>
              <span className="text-sm font-bold text-foreground">24-Bit Linear PCM</span>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
              <span className="text-[9px] text-muted-foreground block uppercase tracking-wider">
                Bitrate
              </span>
              <span className="text-sm font-bold text-primary">4,608 kbps</span>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
              <span className="text-[9px] text-muted-foreground block uppercase tracking-wider">
                Frequency Bandwidth
              </span>
              <span className="text-sm font-bold text-emerald-400">20Hz – 48kHz</span>
            </div>
          </div>

          {/* Master Play Button & Direct Action */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              size="lg"
              onClick={handleMasterPlay}
              className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs h-11 px-7 gap-2 cursor-pointer shadow-xl shadow-primary/25 tap-active"
            >
              {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
              <span>{isPlaying ? "Pause Master" : "Listen to Studio Master"}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
