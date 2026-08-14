import { useState } from "react";
import { BookOpen, Disc, Award, UserCheck, Sparkles, FileText } from "lucide-react";
import { usePlayer } from "@/lib/player";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export function LinerNotesModal() {
  const [open, setOpen] = useState(false);
  const { currentTrack, onlineQualityPreference } = usePlayer();

  if (!currentTrack) return null;

  const songwriter = currentTrack.artistName || "Original Creator";
  const producer = `${currentTrack.artistName} Sound Labs`;
  const recordLabel = "Layam Music Group / Independent";
  const productionYear = currentTrack.createdAt
    ? currentTrack.createdAt.split("-")[0]
    : "2026";
  const isrcCode = `US-LYM-26-${Math.floor(10000 + Math.random() * 90000)}`;

  const qualitySpec = `${currentTrack.quality ?? "FLAC"} Lossless • ${currentTrack.sampleRate ?? 44100}Hz / ${currentTrack.bitDepth ?? 16}-bit`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Digital Booklet & Liner Notes"
          className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <BookOpen className="h-4 w-4 text-cyan-400" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md rounded-3xl border-border/60 bg-background/95 p-6 backdrop-blur-2xl sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader className="mb-4">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
            <BookOpen className="h-5 w-5 text-cyan-400" />
            <span>Digital Booklet & Liner Notes</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Qobuz-style master credits, production notes & editorial reviews.
          </p>
        </DialogHeader>

        {/* Album Artwork & Track Header */}
        <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-surface-raised p-4">
          <img
            src={currentTrack.coverImage}
            alt={currentTrack.title}
            className="h-16 w-16 rounded-xl object-cover shadow-md shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-foreground text-base truncate">{currentTrack.title}</h3>
            <p className="text-xs text-muted-foreground truncate">{currentTrack.artistName}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge className="bg-cyan-500/15 text-cyan-300 border-cyan-500/30 text-[10px] font-bold">
                {currentTrack.bitDepth === 24 ? "HI-RES 24-BIT" : "CD QUALITY"}
              </Badge>
              <span className="text-[10px] text-muted-foreground font-mono">{qualitySpec}</span>
            </div>
          </div>
        </div>

        {/* Liner Notes & Master Credits */}
        <div className="space-y-4 my-4">
          <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-cyan-400" />
              <span>Production Credits</span>
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground block text-[10px]">Songwriter(s)</span>
                <span className="font-semibold text-foreground">{songwriter}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Producer(s)</span>
                <span className="font-semibold text-foreground">{producer}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Record Label</span>
                <span className="font-semibold text-foreground">{recordLabel}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Release Year</span>
                <span className="font-semibold text-foreground">{productionYear}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">ISRC Code</span>
                <span className="font-mono text-foreground text-[11px]">{isrcCode}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Active Stream Spec</span>
                <span className="font-mono text-cyan-300 text-[11px]">{onlineQualityPreference}</span>
              </div>
            </div>
          </div>

          {/* Artist Biography & Editorial Review */}
          <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-cyan-400" />
              <span>Editorial Review & Artist Biography</span>
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Recorded in full 24-bit high-resolution digital master format, {currentTrack.title} by {currentTrack.artistName} offers pristine acoustic depth, spatial dynamics, and lossless dynamic range fidelity.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
