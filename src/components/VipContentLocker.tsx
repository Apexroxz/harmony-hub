import { useState } from "react";
import {
  Lock,
  Unlock,
  Key,
  Sparkles,
  Download,
  Play,
  Pause,
  Disc3,
  ShieldCheck,
  Crown,
  FileText,
  Radio,
  CheckCircle2,
  Mic,
  MessageSquare,
  Heart,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/lib/wallet";
import { usePlayer } from "@/lib/player";
import { type Track } from "@/domain/music/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VipContentLockerProps {
  track: Track;
  artistName: string;
}

export function VipContentLocker({ track, artistName }: VipContentLockerProps) {
  const { connected, openModal } = useWallet();
  const { playTrack } = usePlayer();
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [isPlayingCommentary, setIsPlayingCommentary] = useState<boolean>(false);

  const handleUnlockWithWallet = () => {
    if (!connected) {
      openModal();
      return;
    }
    setIsUnlocked(true);
    toast.success(`VIP Backstage Pass Verified!`, {
      description: `Unlocked unreleased stems and studio commentary for ${track.title}.`,
    });
  };

  const handleSimulateUnlock = () => {
    setIsUnlocked(true);
    toast.success("VIP Patron Access Granted!", {
      description: "You now have full access to exclusive collector stems & commentary.",
    });
  };

  const handlePlayCommentary = () => {
    setIsPlayingCommentary(!isPlayingCommentary);
    toast.info(
      isPlayingCommentary ? "Paused studio commentary" : "Playing Producer Studio Commentary",
      {
        description: `Behind-the-scenes breakdown by ${artistName}.`,
      },
    );
  };

  return (
    <div className="rounded-3xl border border-primary/40 bg-card p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      {/* Glow highlight */}
      <div className="absolute top-0 right-0 h-64 w-64 bg-gradient-to-bl from-primary/15 via-amber/10 to-transparent pointer-events-none rounded-full blur-2xl" />

      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary border border-primary/30">
            {isUnlocked ? <Unlock className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-extrabold text-foreground">
                VIP Backstage Pass & Collector Vault
              </h3>
              <Badge
                className={cn(
                  "text-[9px] font-mono font-bold px-2 py-0.5",
                  isUnlocked
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                    : "bg-primary/20 text-primary border-primary/40",
                )}
              >
                {isUnlocked ? "VAULT UNLOCKED" : "TOKEN-GATED EXCLUSIVES"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Direct master session stems, studio commentary, and digital art booklet provided by{" "}
              <strong className="text-foreground">{artistName}</strong>.
            </p>
          </div>
        </div>

        {!isUnlocked && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleUnlockWithWallet}
              className="rounded-full bg-primary text-primary-foreground font-bold text-xs h-9 px-4 gap-1.5 cursor-pointer shadow-md"
            >
              <Key className="h-3.5 w-3.5" />
              {connected ? "Verify Wallet Pass" : "Connect Phantom / Pass"}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleSimulateUnlock}
              className="rounded-full border-border/60 text-xs font-bold h-9 px-3.5 text-muted-foreground hover:text-foreground"
            >
              Instant Unlock ($5 Boost)
            </Button>
          </div>
        )}
      </div>

      {/* Vault Items Grid */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {/* Item 1: Studio Commentary */}
        <div
          className={cn(
            "rounded-2xl border p-4 transition-all flex flex-col justify-between space-y-4",
            isUnlocked
              ? "border-border/60 bg-surface-raised"
              : "border-border/30 bg-surface/40 opacity-75",
          )}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                <Disc3 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-foreground">Producer Commentary</p>
                <p className="text-[10px] text-muted-foreground font-mono">14m 22s · 24-Bit FLAC</p>
              </div>
            </div>
            {!isUnlocked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Track-by-track breakdown of analog synthesizer routing and acoustic drum layering.
          </p>

          <Button
            size="sm"
            variant={isUnlocked ? (isPlayingCommentary ? "default" : "outline") : "ghost"}
            disabled={!isUnlocked}
            onClick={handlePlayCommentary}
            className="w-full text-xs font-bold rounded-xl h-8 gap-2"
          >
            {isUnlocked ? (
              isPlayingCommentary ? (
                <>
                  <Pause className="h-3.5 w-3.5" /> Pause Commentary
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" /> Listen to Breakdown
                </>
              )
            ) : (
              "Locked for VIPs"
            )}
          </Button>
        </div>

        {/* Item 2: 24-bit Acoustic Stems */}
        <div
          className={cn(
            "rounded-2xl border p-4 transition-all flex flex-col justify-between space-y-4",
            isUnlocked
              ? "border-border/60 bg-surface-raised"
              : "border-border/30 bg-surface/40 opacity-75",
          )}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-amber/10 text-amber flex items-center justify-center border border-amber/20">
                <Crown className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-foreground">Uncompressed Dry Stems</p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  482 MB · 24/96 WAV Package
                </p>
              </div>
            </div>
            {!isUnlocked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Raw un-effected vocal takes, dry bass DI, and modular analog synth arpeggios.
          </p>

          <Button
            size="sm"
            variant={isUnlocked ? "outline" : "ghost"}
            disabled={!isUnlocked}
            onClick={() => toast.success("Downloading 24-Bit Raw Stems Archive (482 MB)...")}
            className="w-full text-xs font-bold rounded-xl h-8 gap-2"
          >
            {isUnlocked ? (
              <>
                <Download className="h-3.5 w-3.5" /> Download Stems ZIP
              </>
            ) : (
              "Locked for VIPs"
            )}
          </Button>
        </div>

        {/* Item 3: Digital Art & Booklet */}
        <div
          className={cn(
            "rounded-2xl border p-4 transition-all flex flex-col justify-between space-y-4",
            isUnlocked
              ? "border-border/60 bg-surface-raised"
              : "border-border/30 bg-surface/40 opacity-75",
          )}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-foreground">Digital Liner Booklet</p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  12 Pages · 300 DPI Vector PDF
                </p>
              </div>
            </div>
            {!isUnlocked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Original artwork drafts, lyric manuscripts, and equipment studio photos.
          </p>

          <Button
            size="sm"
            variant={isUnlocked ? "outline" : "ghost"}
            disabled={!isUnlocked}
            onClick={() => toast.success("Opening 300 DPI Digital Master Booklet (.pdf)...")}
            className="w-full text-xs font-bold rounded-xl h-8 gap-2"
          >
            {isUnlocked ? (
              <>
                <Download className="h-3.5 w-3.5" /> View Digital Booklet
              </>
            ) : (
              "Locked for VIPs"
            )}
          </Button>
        </div>
      </div>

      {/* ── Section: Exclusive VIP Patron Voice-Note & Direct Drop ── */}
      {isUnlocked && (
        <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/30">
              <Mic className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-extrabold text-foreground">
                  Artist Studio Voice-Note for VIP Patrons
                </p>
                <Badge className="bg-primary/20 text-primary border-primary/40 text-[8px] font-mono font-bold px-1.5 py-0.2">
                  EXCLUSIVE
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                "Thank you for backing this master release on Layam. Here is the unreleased acoustic backstory..."
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <Button
              size="sm"
              onClick={handlePlayCommentary}
              className="rounded-xl bg-primary text-primary-foreground font-bold text-xs h-8 px-4 gap-1.5 cursor-pointer shadow-md flex-1 sm:flex-none"
            >
              {isPlayingCommentary ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}
              <span>{isPlayingCommentary ? "Pause Note" : "Play Voice-Note (0:45)"}</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast.success(`Heart sent to ${artistName}!`)}
              className="rounded-xl border-border/60 text-xs font-bold h-8 px-3 gap-1 cursor-pointer hover:text-red-400"
            >
              <Heart className="h-3.5 w-3.5 text-red-400 fill-current" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
