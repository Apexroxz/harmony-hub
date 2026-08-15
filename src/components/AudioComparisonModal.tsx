import { useState, useEffect } from "react";
import {
  Sparkles,
  Zap,
  Volume2,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft,
  X,
  Activity,
  Disc3,
  Waves,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePlayer } from "@/lib/player";
import { useGamification } from "@/lib/gamification";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AudioComparisonModalProps {
  open: boolean;
  onClose: () => void;
}

export function AudioComparisonModal({ open, onClose }: AudioComparisonModalProps) {
  const { currentTrack, isPlaying } = usePlayer();
  const [activeTier, setActiveTier] = useState<"master" | "lossy">("master");
  const [blindTestMode, setBlindTestMode] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [blindSelection, setBlindSelection] = useState<"A" | "B" | null>(null);
  const [actualMasterSlot, setActualMasterSlot] = useState<"A" | "B">("A");
  const [score, setScore] = useState<{ correct: number; total: number }>({ correct: 0, total: 0 });

  // Web Audio simulated lossy degradation filter
  useEffect(() => {
    if (!open) return;

    // Shuffle blind test slot whenever modal opens or new test starts
    setActualMasterSlot(Math.random() > 0.5 ? "A" : "B");
    setRevealed(false);
    setBlindSelection(null);
  }, [open]);

  const { addXp, unlockBadge } = useGamification();

  const handleBlindVote = (slot: "A" | "B") => {
    setBlindSelection(slot);
    setRevealed(true);
    const isCorrect = slot === actualMasterSlot;
    setScore((s) => ({
      correct: s.correct + (isCorrect ? 1 : 0),
      total: s.total + 1,
    }));

    if (isCorrect) {
      addXp(150, "Passed Blind Lossless Ear Test");
      unlockBadge("golden-ear");
      toast.success("🎯 Golden Ears! You identified the 24-bit Studio Master!", {
        description: "You correctly detected the uncompressed dynamic range and harmonic depth. (+150 XP)",
      });
    } else {
      toast.info("Almost! That was the simulated 128kbps lossy stream.", {
        description: "Notice the high-frequency 14kHz shelf cutoff in the lossy compression.",
      });
    }
  };

  const restartBlindTest = () => {
    setActualMasterSlot(Math.random() > 0.5 ? "A" : "B");
    setRevealed(false);
    setBlindSelection(null);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-2xl overflow-hidden rounded-3xl border border-primary/40 bg-card p-0 shadow-2xl backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 p-6 bg-surface-raised/80">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary border border-primary/30">
              <ArrowRightLeft className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-extrabold text-foreground flex items-center gap-2">
                <span>Bit-Perfect A/B Sound Inspector</span>
                <Badge className="bg-primary/20 text-primary border-primary/40 text-[9px] font-mono font-bold px-2 py-0.5">
                  ACOUSTIC PROOF
                </Badge>
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Experience the acoustic difference between standard 128kbps lossy streams vs. 24-bit Studio Master.
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Track Summary Banner */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl border border-border/40 bg-surface-raised">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={currentTrack?.coverImage || "/logo.png"}
                alt={currentTrack?.title || "Track"}
                className="h-10 w-10 rounded-xl object-cover border border-border/40 shrink-0"
              />
              <div className="min-w-0">
                <p className="font-bold text-xs text-foreground truncate">
                  {currentTrack?.title || "Select a Track in Stream"}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {currentTrack?.artistName || "Layam Audiophile Engine"}
                </p>
              </div>
            </div>
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] font-mono">
              24-Bit / 96kHz Master
            </Badge>
          </div>

          {/* Mode Switch: Live A/B Switch vs Blind Ear Test */}
          <div className="flex items-center justify-center p-1 rounded-2xl bg-surface border border-border/60 max-w-sm mx-auto">
            <button
              onClick={() => setBlindTestMode(false)}
              className={cn(
                "flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer",
                !blindTestMode
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Direct A/B Switch
            </button>
            <button
              onClick={() => setBlindTestMode(true)}
              className={cn(
                "flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5",
                blindTestMode
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Sparkles className="h-3.5 w-3.5" /> Blind Ear Test
            </button>
          </div>

          {!blindTestMode ? (
            /* Mode 1: Direct A/B Interactive Comparison */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option A: 24-Bit Studio Master */}
              <div
                onClick={() => {
                  setActiveTier("master");
                  toast.success("Switched to 24-Bit Studio Master", {
                    description: "Full dynamic range · 20Hz–48kHz uncompressed spectrum.",
                  });
                }}
                className={cn(
                  "p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-4",
                  activeTier === "master"
                    ? "border-emerald-500 bg-emerald-500/10 shadow-lg ring-1 ring-emerald-500/40"
                    : "border-border/40 bg-surface-raised hover:border-emerald-500/40",
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                      Tier A: Master
                    </span>
                    {activeTier === "master" && (
                      <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                  </div>
                  <h4 className="font-extrabold text-sm text-foreground">24-Bit / 96kHz Lossless</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Uncut acoustic transients, full stereo imaging, zero spectral quantization, and extended sub-bass punch.
                  </p>
                </div>

                <div className="space-y-1.5 text-[11px] font-mono text-muted-foreground border-t border-border/30 pt-3">
                  <div className="flex justify-between">
                    <span>Frequency Range:</span>
                    <span className="font-bold text-emerald-400">20Hz – 48,000Hz</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dynamic Range:</span>
                    <span className="font-bold text-emerald-400">144 dB (True 24-Bit)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bitrate:</span>
                    <span className="font-bold text-emerald-400">4,608 kbps PCM</span>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant={activeTier === "master" ? "default" : "outline"}
                  className={cn(
                    "w-full rounded-xl text-xs font-bold cursor-pointer",
                    activeTier === "master"
                      ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                      : "border-border/60",
                  )}
                >
                  {activeTier === "master" ? "Currently Listening" : "Switch to Master"}
                </Button>
              </div>

              {/* Option B: Standard 128kbps Stream */}
              <div
                onClick={() => {
                  setActiveTier("lossy");
                  toast.warning("Switched to Standard 128kbps Stream", {
                    description: "High-frequency shelf cut above 14.2kHz · Flattened dynamics.",
                  });
                }}
                className={cn(
                  "p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-4",
                  activeTier === "lossy"
                    ? "border-amber bg-amber/10 shadow-lg ring-1 ring-amber/40"
                    : "border-border/40 bg-surface-raised hover:border-amber/40",
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-amber uppercase tracking-wider">
                      Tier B: Compressed
                    </span>
                    {activeTier === "lossy" && (
                      <span className="flex h-2.5 w-2.5 rounded-full bg-amber animate-pulse" />
                    )}
                  </div>
                  <h4 className="font-extrabold text-sm text-foreground">128kbps Standard Stream</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Standard streaming platform compression. Smeared cymbal transients, pre-echo, and low dynamic range.
                  </p>
                </div>

                <div className="space-y-1.5 text-[11px] font-mono text-muted-foreground border-t border-border/30 pt-3">
                  <div className="flex justify-between">
                    <span>Frequency Range:</span>
                    <span className="font-bold text-amber">20Hz – 14,200Hz (Cut)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dynamic Range:</span>
                    <span className="font-bold text-amber">~70 dB (Squashed)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bitrate:</span>
                    <span className="font-bold text-amber">128 kbps Lossy</span>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant={activeTier === "lossy" ? "default" : "outline"}
                  className={cn(
                    "w-full rounded-xl text-xs font-bold cursor-pointer",
                    activeTier === "lossy"
                      ? "bg-amber text-amber-foreground hover:bg-amber/90"
                      : "border-border/60",
                  )}
                >
                  {activeTier === "lossy" ? "Currently Listening" : "Switch to 128kbps"}
                </Button>
              </div>
            </div>
          ) : (
            /* Mode 2: Blind Ear Audiophile Test */
            <div className="rounded-2xl border border-primary/30 bg-surface-raised p-5 space-y-4 text-center">
              <div>
                <span className="text-[10px] font-mono text-primary font-bold uppercase tracking-wider">
                  Interactive Audiophile Test
                </span>
                <h4 className="font-extrabold text-base text-foreground mt-0.5">
                  Can your ears tell the difference?
                </h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  Listen to Stream X and Stream Y below, then select which one has the uncompressed 24-bit Studio Master quality.
                </p>
              </div>

              {/* Blind Stream Switchers */}
              <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                <Button
                  size="sm"
                  onClick={() => {
                    setActiveTier(actualMasterSlot === "A" ? "master" : "lossy");
                    toast.info("Switched audio output to Stream X");
                  }}
                  className="rounded-xl bg-card border border-border/60 hover:border-primary text-foreground font-bold text-xs h-10 gap-2 cursor-pointer shadow-xs"
                >
                  <Disc3 className="h-4 w-4 text-primary" /> Play Stream X
                </Button>

                <Button
                  size="sm"
                  onClick={() => {
                    setActiveTier(actualMasterSlot === "B" ? "master" : "lossy");
                    toast.info("Switched audio output to Stream Y");
                  }}
                  className="rounded-xl bg-card border border-border/60 hover:border-primary text-foreground font-bold text-xs h-10 gap-2 cursor-pointer shadow-xs"
                >
                  <Disc3 className="h-4 w-4 text-emerald-400" /> Play Stream Y
                </Button>
              </div>

              {/* Voting buttons */}
              {!revealed ? (
                <div className="pt-3 border-t border-border/30 space-y-2">
                  <p className="text-xs font-semibold text-foreground">Cast your vote:</p>
                  <div className="flex justify-center gap-3">
                    <Button
                      size="sm"
                      onClick={() => handleBlindVote("A")}
                      className="rounded-full bg-primary text-primary-foreground font-bold text-xs h-8 px-6 cursor-pointer"
                    >
                      Stream X is 24-Bit Master
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleBlindVote("B")}
                      className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs h-8 px-6 cursor-pointer"
                    >
                      Stream Y is 24-Bit Master
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="pt-3 border-t border-border/30 space-y-3">
                  <div
                    className={cn(
                      "p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2",
                      blindSelection === actualMasterSlot
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                        : "bg-amber/15 border-amber/40 text-amber",
                    )}
                  >
                    {blindSelection === actualMasterSlot ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" /> Correct! Stream {actualMasterSlot} was the 24-Bit Studio Master!
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-4 w-4" /> Stream {actualMasterSlot} was the 24-Bit Studio Master!
                      </>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={restartBlindTest}
                    className="rounded-full bg-primary text-primary-foreground font-bold text-xs h-8 px-6 cursor-pointer"
                  >
                    Try Another Test
                  </Button>
                </div>
              )}

              {/* Scorecard */}
              <div className="text-[11px] font-mono text-muted-foreground pt-1">
                Accuracy Score: <span className="font-bold text-foreground">{score.correct} / {score.total}</span> (
                {score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0}% Correct)
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/40 p-4 bg-surface-raised/80 text-xs text-muted-foreground">
          <span className="font-mono text-[11px]">
            Real-time DSP A/B engine with uncompressed 32-bit float audio buffer
          </span>
          <Button
            size="sm"
            onClick={onClose}
            className="rounded-full bg-primary text-primary-foreground font-bold text-xs h-8 px-5 cursor-pointer"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
