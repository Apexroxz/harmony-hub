import { useState } from "react";
import {
  ShoppingBag,
  Download,
  CheckCircle2,
  ShieldCheck,
  Loader2,
  Sparkles,
  Zap,
  Music2,
  CreditCard,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import type { Track } from "@/domain/music/types";
import { recordTrackPurchase } from "@/domain/music/purchases";
import { QualityBadge } from "@/components/QualityBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface BuyTrackModalProps {
  track: Track | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: (track: Track) => void;
}

export function BuyTrackModal({ track, open, onClose, onSuccess }: BuyTrackModalProps) {
  const [processing, setProcessing] = useState(false);
  const [purchased, setPurchased] = useState(false);

  if (!track) return null;

  const price = track.price ?? 1.49;
  const artistCut = (price * 0.85).toFixed(2);
  const platformCut = (price * 0.15).toFixed(2);

  const handlePurchase = () => {
    setProcessing(true);
    setTimeout(() => {
      recordTrackPurchase(track);
      setProcessing(false);
      setPurchased(true);
      toast.success(`Purchased "${track.title}"!`, {
        description: "DRM-free master unlocked & synced to your Offline Hi-Fi Library.",
      });
      if (onSuccess) onSuccess(track);
    }, 1000);
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = track.audioUrl;
    a.download = `${track.artistName} - ${track.title}.${track.quality.toLowerCase()}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Download started", {
      description: `Saving ${track.quality} master file.`,
    });
  };

  const handleModalClose = () => {
    setPurchased(false);
    setProcessing(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleModalClose()}>
      <DialogContent className="border-border/60 bg-card p-6 sm:p-8 max-w-md rounded-3xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
            <ShoppingBag className="h-5 w-5 text-primary" />
            {purchased ? "Purchase Complete!" : "Buy Master Track"}
          </DialogTitle>
        </DialogHeader>

        {purchased ? (
          <div className="text-center py-4">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <h3 className="text-lg font-bold text-foreground mb-1">You own "{track.title}"</h3>
            <p className="text-xs text-muted-foreground mb-6">
              Full DRM-free rights. 85% of payment transferred directly to{" "}
              <span className="font-semibold text-foreground">{track.artistName}</span>.
            </p>

            {/* Offline sync note */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 mb-6 text-left flex items-center gap-3">
              <WifiOff className="h-5 w-5 text-emerald-400 shrink-0" />
              <div className="text-[11px] text-muted-foreground">
                <span className="font-bold text-emerald-400 block">
                  Available in Offline Hi-Fi Mode
                </span>
                This master is automatically synced into your Offline Library under{" "}
                <code className="text-foreground font-mono">Downloads/Purchased</code>.
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <Button
                onClick={handleDownload}
                className="w-full rounded-full bg-primary text-primary-foreground font-bold gap-2 h-11 shadow-lg shadow-primary/20"
              >
                <Download className="h-4 w-4" /> Download {track.quality} Master File
              </Button>
              <Button
                variant="outline"
                onClick={handleModalClose}
                className="w-full rounded-full border-border/60 text-xs font-semibold"
              >
                Continue Browsing
              </Button>
            </div>
          </div>
        ) : (
          <div className="pt-2">
            {/* Track Info Card */}
            <div className="flex items-center gap-3.5 rounded-2xl border border-border/40 bg-surface-raised p-3.5 mb-5">
              <img
                src={track.coverImage}
                alt={track.title}
                className="h-16 w-16 rounded-xl object-cover shadow-sm"
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-sm text-foreground truncate">{track.title}</h4>
                <p className="text-xs text-muted-foreground truncate">{track.artistName}</p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className="border-primary/40 text-primary text-[10px] font-mono font-bold"
                  >
                    {track.quality}
                  </Badge>
                  {track.sampleRate && (
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {track.sampleRate >= 96000 ? "24-bit / 96kHz" : "16-bit / 44.1kHz"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Pricing & Split Breakdown */}
            <div className="rounded-2xl border border-border/40 bg-surface-raised p-4 space-y-2.5 mb-6">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Master Audio License</span>
                <span className="font-mono font-bold text-foreground">${price.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-emerald-400">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Artist Direct Payout (85%)
                </span>
                <span className="font-mono font-semibold">+${artistCut}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Decentralized Storage & Processing (15%)</span>
                <span className="font-mono">${platformCut}</span>
              </div>
              <div className="pt-2 border-t border-border/30 flex items-center justify-between font-bold text-sm text-foreground">
                <span>Total Due</span>
                <span className="font-mono text-primary text-base">${price.toFixed(2)}</span>
              </div>
            </div>

            <Button
              onClick={handlePurchase}
              disabled={processing}
              className="w-full rounded-full bg-primary text-primary-foreground font-bold gap-2 h-11 text-sm shadow-lg shadow-primary/20 cursor-pointer"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing Payment...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  Buy & Unlock Master (${price.toFixed(2)})
                </>
              )}
            </Button>

            <p className="text-center text-[11px] text-muted-foreground mt-3 flex items-center justify-center gap-1">
              <ShieldCheck className="h-3 w-3 text-primary" />
              DRM-Free · High-Resolution Master File · Permanent Ownership
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
