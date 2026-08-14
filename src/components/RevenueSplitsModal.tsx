import { useState } from "react";
import { DollarSign, PieChart, Users, Save, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { Track } from "@/domain/music/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface RevenueSplitsModalProps {
  track: Track;
  trigger?: React.ReactNode;
}

export function RevenueSplitsModal({ track, trigger }: RevenueSplitsModalProps) {
  const [open, setOpen] = useState(false);

  const [artistShare, setArtistShare] = useState(70);
  const [producerShare, setProducerShare] = useState(20);
  const [engineerShare, setEngineerShare] = useState(10);
  const [pricingModel, setPricingModel] = useState<"free" | "premium">("free");
  const [priceUsd, setPriceUsd] = useState("0.99");

  const totalShare = artistShare + producerShare + engineerShare;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalShare !== 100) {
      toast.error("Invalid Splits", {
        description: "Collaborator revenue splits must sum to exactly 100%.",
      });
      return;
    }

    toast.success("Revenue Splits Configured", {
      description: `Saved splits for "${track.title}" (${artistShare}% Artist / ${producerShare}% Producer / ${engineerShare}% Engineer)`,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs border-primary/30 text-primary hover:bg-primary/10 cursor-pointer gap-1.5"
          >
            <PieChart className="h-3.5 w-3.5" />
            <span>Revenue Splits</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-md rounded-3xl border-border/60 bg-background/95 p-6 backdrop-blur-2xl sm:max-w-lg">
        <DialogHeader className="mb-4">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
            <PieChart className="h-5 w-5 text-primary" />
            <span>Collaborator Splits & Stream Pricing</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Configure automated smart-contract royalty distribution for "{track.title}".
          </p>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Stream Pricing Model */}
          <div className="rounded-2xl border border-border/60 bg-surface-raised p-4 space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Monetization Model
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPricingModel("free")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  pricingModel === "free"
                    ? "border-primary bg-primary/10 text-primary font-bold"
                    : "border-border/60 bg-card text-muted-foreground"
                }`}
              >
                <div className="text-xs font-bold">Free Stream</div>
                <div className="text-[10px] text-muted-foreground">Ad-free streaming for all</div>
              </button>

              <button
                type="button"
                onClick={() => setPricingModel("premium")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  pricingModel === "premium"
                    ? "border-primary bg-primary/10 text-primary font-bold"
                    : "border-border/60 bg-card text-muted-foreground"
                }`}
              >
                <div className="text-xs font-bold">Premium Collectible</div>
                <div className="text-[10px] text-muted-foreground">Buy FLAC + NFT Access</div>
              </button>
            </div>

            {pricingModel === "premium" && (
              <div className="pt-2 flex items-center gap-3">
                <span className="text-xs font-medium text-foreground">Collectible Price:</span>
                <Input
                  type="number"
                  step="0.01"
                  value={priceUsd}
                  onChange={(e) => setPriceUsd(e.target.value)}
                  className="w-24 h-8 text-xs rounded-lg border-border/60 bg-card"
                />
                <span className="text-xs font-mono text-muted-foreground">USD / SOL</span>
              </div>
            )}
          </div>

          {/* Collaborator Splits */}
          <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" />
                Revenue Splits (%)
              </span>
              <Badge
                className={
                  totalShare === 100
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]"
                    : "bg-destructive/15 text-destructive border-destructive/30 text-[10px]"
                }
              >
                Total: {totalShare}%
              </Badge>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-foreground font-semibold">
                    Primary Artist ({track.artistName})
                  </span>
                  <span className="font-mono text-primary font-bold">{artistShare}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={artistShare}
                  onChange={(e) => setArtistShare(parseInt(e.target.value, 10))}
                  className="w-full accent-primary h-1.5 rounded-lg bg-surface-raised cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-foreground font-semibold">Music Producer</span>
                  <span className="font-mono text-primary font-bold">{producerShare}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={producerShare}
                  onChange={(e) => setProducerShare(parseInt(e.target.value, 10))}
                  className="w-full accent-primary h-1.5 rounded-lg bg-surface-raised cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-foreground font-semibold">Mix Engineer / Co-Writer</span>
                  <span className="font-mono text-primary font-bold">{engineerShare}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={engineerShare}
                  onChange={(e) => setEngineerShare(parseInt(e.target.value, 10))}
                  className="w-full accent-primary h-1.5 rounded-lg bg-surface-raised cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold"
            >
              <Save className="mr-1.5 h-3.5 w-3.5" />
              Save Revenue Splits
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
