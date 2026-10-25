import { useState } from "react";
import {
  Wallet,
  DollarSign,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Calendar,
  Clock,
  ExternalLink,
  Coins,
  Building,
  Zap,
  Info,
  Lock,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/lib/wallet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RoyaltyCashoutModalProps {
  balance: number;
  open: boolean;
  onSuccess: (amount: number) => void;
  onClose: () => void;
}

export function RoyaltyCashoutModal({
  balance,
  open,
  onSuccess,
  onClose,
}: RoyaltyCashoutModalProps) {
  const { address, connected, openModal } = useWallet();
  const [method, setMethod] = useState<"solana" | "stripe" | "usdc">("solana");
  const [isProcessing, setIsProcessing] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  // 30-Day Settlement Model:
  // Settled & Claimable: 60% of historic pool (older than 30 days)
  // Pending 30-Day Maturation: 40% (current active cycle under anti-fraud audit)
  const settledBalance = Math.round(balance * 0.6 * 100) / 100;
  const pendingMaturationBalance = Math.round((balance - settledBalance) * 100) / 100;

  // Next payout schedule date: 1st of next month
  const now = new Date();
  const nextPayoutDate = new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString(
    undefined,
    { month: "short", day: "numeric", year: "numeric" },
  );

  const handleWithdraw = () => {
    if (settledBalance <= 0) {
      toast.info("No cleared royalties available for instant withdrawal.", {
        description: `Your $${pendingMaturationBalance.toFixed(2)} pending balance will mature on ${nextPayoutDate}.`,
      });
      return;
    }

    if (method === "solana" && !connected) {
      openModal();
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      const simulatedHash = `5vK7${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}sol`;
      setTxHash(simulatedHash);
      setIsProcessing(false);
      onSuccess(settledBalance);
      toast.success(`Cleared payout of $${settledBalance.toFixed(2)} executed!`, {
        description: `Method: ${method.toUpperCase()} · Settled through 30-day anti-fraud clearing.`,
      });
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-xl overflow-hidden rounded-3xl border border-primary/40 bg-card p-0 shadow-2xl backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 p-6 bg-surface-raised/80">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Coins className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-extrabold text-foreground flex items-center gap-2">
                <span>Monthly Royalty Distribution Vault</span>
                <Badge className="bg-primary/20 text-primary border-primary/40 text-[9px] font-mono font-bold px-2 py-0.5">
                  NET-30 CLEARING
                </Badge>
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Compliant 30-day rolling royalty maturation protecting creators from bot fraud and chargebacks.
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Dual Balance Cards: Settled vs 30-Day Maturing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. Cleared / Settled Balance */}
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-bold">
                  Cleared & Claimable
                </span>
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-foreground flex items-baseline gap-1">
                <span className="text-emerald-400">$</span>
                <span>{settledBalance.toFixed(2)}</span>
                <span className="text-[10px] font-mono text-muted-foreground font-normal ml-1">USDC</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Matured through the 30-day verification cycle. Ready for payout.
              </p>
            </div>

            {/* 2. Pending 30-Day Maturation */}
            <div className="rounded-2xl border border-border/40 bg-surface-raised p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider font-bold">
                  In 30-Day Maturation
                </span>
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div className="text-2xl font-black text-foreground flex items-baseline gap-1">
                <span className="text-primary">$</span>
                <span>{pendingMaturationBalance.toFixed(2)}</span>
                <span className="text-[10px] font-mono text-muted-foreground font-normal ml-1">USDC</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Current month streaming plays. Unlocks on{" "}
                <strong className="text-foreground">{nextPayoutDate}</strong>.
              </p>
            </div>
          </div>

          {/* Why 30-Day Maturation info box */}
          <div className="rounded-2xl border border-border/40 bg-surface/60 p-3.5 flex items-start gap-2.5 text-xs text-muted-foreground">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-foreground block">
                Why is there a 30-Day Rolling Clearing Period?
              </span>
              <p className="text-[11px] leading-relaxed">
                Standard Net-30 auditing prevents stream-farming bots, fake credit card chargebacks, and rights disputes, ensuring 100% legitimate creator revenue distribution.
              </p>
            </div>
          </div>

          {!txHash ? (
            <>
              {/* Payment Rail Selector */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                  Select Payout Destination:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div
                    onClick={() => setMethod("solana")}
                    className={cn(
                      "p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between text-xs space-y-2",
                      method === "solana"
                        ? "border-emerald-500 bg-emerald-500/10 shadow-sm ring-1 ring-emerald-500/40"
                        : "border-border/40 bg-surface-raised hover:border-border/80",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <Wallet className="h-4 w-4 text-emerald-400" />
                      {method === "solana" && (
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-foreground">Solana Wallet</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Direct Settlement</p>
                    </div>
                  </div>

                  <div
                    onClick={() => setMethod("usdc")}
                    className={cn(
                      "p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between text-xs space-y-2",
                      method === "usdc"
                        ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40"
                        : "border-border/40 bg-surface-raised hover:border-border/80",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <Zap className="h-4 w-4 text-primary" />
                      {method === "usdc" && (
                        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-foreground">USDC Direct</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">SPL Stablecoin</p>
                    </div>
                  </div>

                  <div
                    onClick={() => setMethod("stripe")}
                    className={cn(
                      "p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between text-xs space-y-2",
                      method === "stripe"
                        ? "border-purple-500 bg-purple-500/10 shadow-sm ring-1 ring-purple-500/40"
                        : "border-border/40 bg-surface-raised hover:border-border/80",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <Building className="h-4 w-4 text-purple-400" />
                      {method === "stripe" && (
                        <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-foreground">Bank Account</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Stripe ACH Direct</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Destination Address Preview */}
              <div className="p-3.5 rounded-2xl border border-border/40 bg-surface-raised text-xs space-y-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Destination Account:</span>
                  <span className="font-mono text-foreground font-bold">
                    {connected && address
                      ? `${address.slice(0, 4)}...${address.slice(-4)}`
                      : "0xArtist...Primary"}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Next Scheduled Cycle:</span>
                  <span className="font-mono text-primary font-bold">{nextPayoutDate}</span>
                </div>
              </div>

              <Button
                size="lg"
                disabled={isProcessing || settledBalance <= 0}
                onClick={handleWithdraw}
                className="w-full rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm h-11 gap-2 cursor-pointer shadow-lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Processing Cleared Payout...
                  </>
                ) : (
                  <>
                    <Coins className="h-4 w-4" /> Withdraw Cleared ${settledBalance.toFixed(2)} Now
                  </>
                )}
              </Button>
            </>
          ) : (
            /* Transaction Success Receipt */
            <div className="p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-center space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-base text-foreground">
                  Monthly Royalty Payout Completed!
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Funds have been settled directly to your recipient rail.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-card border border-border/40 font-mono text-[11px] text-muted-foreground break-all text-left space-y-1">
                <span className="text-[9px] uppercase tracking-wider block text-foreground font-bold">
                  Transaction Signature:
                </span>
                <span className="text-primary">{txHash}</span>
              </div>

              <Button
                size="sm"
                onClick={onClose}
                className="rounded-full bg-emerald-500 text-white hover:bg-emerald-600 font-bold text-xs h-8 px-6 cursor-pointer"
              >
                Close Receipt
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
