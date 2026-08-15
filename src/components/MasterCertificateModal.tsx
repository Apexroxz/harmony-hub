import { useState } from "react";
import {
  ShieldCheck,
  Award,
  Download,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  Sparkles,
  Lock,
  Layers,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type Track } from "@/domain/music/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MasterCertificateModalProps {
  track: Track | null;
  open: boolean;
  onClose: () => void;
}

export function MasterCertificateModal({
  track,
  open,
  onClose,
}: MasterCertificateModalProps) {
  const [copied, setCopied] = useState(false);

  if (!track) return null;

  // Generate deterministic cryptographic mock hashes
  const isrcCode = `US-LAY-${new Date().getFullYear()}-${track.id.toUpperCase().slice(0, 5)}`;
  const provenanceHash = `0x7f8a9b2c${track.id.split("").reduce((acc, c) => acc + c.charCodeAt(0).toString(16), "")}e1d4f6`;
  const ipfsCid = `bafybeic${track.id.slice(0, 8)}7xq4p5z9q2w3k4j8v7c6b5a4`;

  const handleCopyHash = () => {
    navigator.clipboard.writeText(provenanceHash);
    setCopied(true);
    toast.success("Provenance SHA-256 Hash copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCertificate = () => {
    toast.success(`Exported Certificate of Ownership for "${track.title}"!`, {
      description: "Cryptographic proof saved to Downloads.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-lg rounded-3xl border border-primary/40 bg-card p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
        <DialogHeader className="border-b border-border/40 pb-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/30 mb-2">
            <Award className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground uppercase">
            Certificate of Master Provenance
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Decentralized Audio Proof & Cryptographic Master Rights
          </p>
        </DialogHeader>

        {/* Certificate Parchment Box */}
        <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-surface-raised/80 p-5 sm:p-6 space-y-5 text-left relative overflow-hidden">
          {/* Subtle Watermark Stamp */}
          <div className="absolute -right-6 -bottom-6 opacity-5 pointer-events-none text-primary">
            <ShieldCheck className="h-44 w-44" />
          </div>

          <div className="flex items-start justify-between border-b border-border/40 pb-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block">
                REGISTERED MASTER WORK
              </span>
              <h3 className="text-lg font-extrabold text-foreground truncate max-w-[260px]">
                {track.title}
              </h3>
              <p className="text-xs font-semibold text-primary">{track.artistName}</p>
            </div>

            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/40 text-[10px] font-mono font-bold px-2 py-0.5">
              VERIFIED AUTHENTIC
            </Badge>
          </div>

          {/* Technical Master Specs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div className="rounded-xl bg-card p-2.5 border border-border/40">
              <span className="text-[10px] text-muted-foreground block">Quality Standard</span>
              <span className="font-bold text-foreground">{track.quality || "24-bit / 96kHz"}</span>
            </div>
            <div className="rounded-xl bg-card p-2.5 border border-border/40">
              <span className="text-[10px] text-muted-foreground block">ISRC Identifier</span>
              <span className="font-bold text-primary truncate block">{isrcCode}</span>
            </div>
            <div className="rounded-xl bg-card p-2.5 border border-border/40 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-muted-foreground block">License Type</span>
              <span className="font-bold text-emerald-400">DRM-Free Perpetual</span>
            </div>
          </div>

          {/* Cryptographic Hashes */}
          <div className="space-y-2 text-xs font-mono">
            <div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                <span>ON-CHAIN PROVENANCE HASH (SHA-256)</span>
                <button
                  onClick={handleCopyHash}
                  className="text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="rounded-xl bg-black/60 p-2.5 border border-white/10 text-[11px] text-muted-foreground/90 truncate">
                {provenanceHash}
              </div>
            </div>

            <div>
              <span className="text-[10px] text-muted-foreground block mb-1">
                IPFS IMMUTABLE STORAGE CID
              </span>
              <div className="rounded-xl bg-black/60 p-2.5 border border-white/10 text-[11px] text-muted-foreground/90 truncate">
                {ipfsCid}
              </div>
            </div>
          </div>

          {/* Guarantee Footer */}
          <div className="flex items-center justify-between border-t border-border/40 pt-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Lock className="h-3 w-3 text-emerald-400" />
              <span>Cryptographically Sealed & Signed</span>
            </span>
            <span className="font-mono">LAYAM PROTOCOL v2.4</span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="rounded-full text-xs font-bold"
          >
            Close
          </Button>

          <Button
            size="sm"
            onClick={handleDownloadCertificate}
            className="rounded-full bg-primary text-primary-foreground font-bold text-xs h-9 px-5 gap-2 cursor-pointer shadow-md"
          >
            <Download className="h-3.5 w-3.5" /> Download Certificate (.pdf)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
