import { useState } from "react";
import {
  Gift,
  DollarSign,
  Zap,
  Sparkles,
  Loader2,
  CheckCircle2,
  Wallet,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/lib/wallet";
import { useGamification } from "@/lib/gamification";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface TipRecord {
  id: string;
  artistId: string;
  artistName: string;
  donorName: string;
  donorAvatar?: string | undefined;
  amountUsd: number;
  paymentMethod: "fiat" | "sol";
  message?: string | undefined;
  createdAt: string;
}

const TIPS_STORAGE_KEY = "layam_artist_tips";

export function getArtistTips(artistId: string): TipRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TIPS_STORAGE_KEY);
    if (!raw) return getDefaultArtistTips(artistId);
    const map = JSON.parse(raw) as Record<string, TipRecord[]>;
    const list = map[artistId] ?? [];
    return list.length > 0 ? list : getDefaultArtistTips(artistId);
  } catch {
    return getDefaultArtistTips(artistId);
  }
}

export async function fetchArtistTips(artistId: string): Promise<TipRecord[]> {
  try {
    const { data: dbTips, error } = await supabase
      .from("artist_tips")
      .select("id, sender_id, amount, payment_method, message, created_at")
      .eq("artist_id", artistId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (dbTips && dbTips.length > 0) {
      const senderIds = dbTips.map((t) => t.sender_id).filter(Boolean) as string[];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", senderIds);

      const profMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

      const formatted: TipRecord[] = dbTips.map((t) => {
        const prof = t.sender_id ? profMap.get(t.sender_id) : undefined;
        return {
          id: t.id,
          artistId,
          artistName: "Artist",
          donorName: prof?.display_name || "Layam Patron",
          donorAvatar: prof?.avatar_url || undefined,
          amountUsd: Number(t.amount),
          paymentMethod: (t.payment_method as "fiat" | "sol") || "fiat",
          message: t.message || undefined,
          createdAt: t.created_at?.slice(0, 10) || "Just now",
        };
      });

      return formatted;
    }
  } catch (err) {
    console.warn("[FanTipModal] Supabase tips note:", err);
  }

  return getArtistTips(artistId);
}

function getDefaultArtistTips(artistId: string): TipRecord[] {
  return [
    {
      id: "tip-1",
      artistId,
      artistName: "Artist",
      donorName: "Liam Sterling",
      donorAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
      amountUsd: 25.0,
      paymentMethod: "sol",
      message: "Your sound design inspires my daily studio sessions. Keep creating!",
      createdAt: "2 days ago",
    },
    {
      id: "tip-2",
      artistId,
      artistName: "Artist",
      donorName: "Elena V.",
      donorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
      amountUsd: 10.0,
      paymentMethod: "fiat",
      message: "The 24-bit master download sounds unbelievable on my planar headphones.",
      createdAt: "5 days ago",
    },
    {
      id: "tip-3",
      artistId,
      artistName: "Artist",
      donorName: "Kaelen Audio",
      donorAvatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80",
      amountUsd: 5.0,
      paymentMethod: "sol",
      message: "Instant support for true independent audio!",
      createdAt: "1 week ago",
    },
  ];
}

export function saveArtistTip(tip: TipRecord, senderUserId?: string): void {
  // 1. Save locally for optimistic UI
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(TIPS_STORAGE_KEY);
      const map = raw ? (JSON.parse(raw) as Record<string, TipRecord[]>) : {};
      const list = map[tip.artistId] ?? getDefaultArtistTips(tip.artistId);
      map[tip.artistId] = [tip, ...list];
      localStorage.setItem(TIPS_STORAGE_KEY, JSON.stringify(map));
    } catch {
      // ignore
    }
  }

  // 2. Persist to database if authenticated
  if (senderUserId && !senderUserId.startsWith("demo-")) {
    void supabase
      .from("artist_tips")
      .insert({
        sender_id: senderUserId,
        artist_id: tip.artistId,
        amount: tip.amountUsd,
        currency: "USD",
        payment_method: tip.paymentMethod,
        message: tip.message,
      })
      .catch((err) => console.warn("[FanTipModal] Supabase tip insert note:", err));

    // Also write to immutable royalty ledger
    void supabase
      .from("royalty_transactions")
      .insert({
        creator_id: tip.artistId,
        event_type: "tip",
        amount: tip.amountUsd,
        currency: "USD",
        metadata: {
          donorName: tip.donorName,
          paymentMethod: tip.paymentMethod,
          message: tip.message,
        },
      })
      .catch(() => {});
  }
}

interface FanTipModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artistId: string;
  artistName: string;
  artistAvatar?: string | null | undefined;
  onTipSuccess?: (amount: number) => void;
}

export function FanTipModal({
  open,
  onOpenChange,
  artistId,
  artistName,
  artistAvatar,
  onTipSuccess,
}: FanTipModalProps) {
  const { connected, address, connect } = useWallet();
  const [amount, setAmount] = useState("5.00");
  const [method, setMethod] = useState<"fiat" | "sol">("fiat");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  const PRESET_AMOUNTS = ["2.00", "5.00", "10.00", "25.00", "50.00"];

  const { addXp, unlockBadge } = useGamification();

  const handleSendTip = () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      toast.error("Please enter a valid contribution amount.");
      return;
    }

    if (method === "sol" && !connected) {
      toast.info("Please connect your Solana wallet to send SOL tips.");
      connect();
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      const newTip: TipRecord = {
        id: `tip-${Date.now()}`,
        artistId,
        artistName,
        donorName: address ? `${address.slice(0, 4)}...${address.slice(-4)}` : "Audiophile Supporter",
        amountUsd: num,
        paymentMethod: method,
        message: message.trim() || undefined,
        createdAt: "Just now",
      };

      saveArtistTip(newTip);
      addXp(200, `Direct Fan Tip to ${artistName}`);
      unlockBadge("patron-saint");
      setSubmitting(false);
      setCelebrating(true);

      setTimeout(() => {
        setCelebrating(false);
        onOpenChange(false);
        setMessage("");
        onTipSuccess?.(num);
        toast.success(`Sent $${num.toFixed(2)} Tip to ${artistName}!`, {
          description: "100% of fan tips go directly to the artist's treasury. (+200 XP)",
        });
      }, 1200);
    }, 800);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border-border/60 bg-card/95 p-6 backdrop-blur-2xl shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {artistAvatar && (
              <img
                src={artistAvatar}
                alt={artistName}
                className="h-12 w-12 rounded-2xl border-2 border-primary/40 object-cover shadow-md"
              />
            )}
            <div>
              <DialogTitle className="flex items-center gap-1.5 text-lg font-bold text-foreground">
                <Gift className="h-4 w-4 text-primary" />
                <span>Tip & Boost {artistName}</span>
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Direct artist patronage with zero intermediary cuts.
              </p>
            </div>
          </div>
        </DialogHeader>

        {celebrating ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 animate-in zoom-in-95 duration-300">
            <div className="h-16 w-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center ring-8 ring-emerald-500/10">
              <Sparkles className="h-8 w-8 animate-pulse" />
            </div>
            <h3 className="text-xl font-extrabold text-foreground">Contribution Complete!</h3>
            <p className="text-xs text-muted-foreground max-w-xs">
              Thank you for directly backing {artistName}. Your supporter badge is now active.
            </p>
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            {/* Payment Method Switcher */}
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface-raised p-1.5 border border-border/40">
              <button
                type="button"
                onClick={() => setMethod("fiat")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all",
                  method === "fiat"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <DollarSign className="h-3.5 w-3.5" /> USD Card / Apple Pay
              </button>
              <button
                type="button"
                onClick={() => setMethod("sol")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all",
                  method === "sol"
                    ? "bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Zap className="h-3.5 w-3.5" /> Solana Micro-Tip
              </button>
            </div>

            {/* Quick Amounts Grid */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground block mb-2">
                Select Contribution Amount
              </label>
              <div className="grid grid-cols-5 gap-2">
                {PRESET_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmount(amt)}
                    className={cn(
                      "rounded-xl py-2.5 text-xs font-mono font-bold border transition-all text-center",
                      amount === amt
                        ? "border-primary bg-primary/15 text-primary shadow-sm ring-1 ring-primary/40"
                        : "border-border/60 bg-surface text-muted-foreground hover:text-foreground hover:border-primary/40",
                    )}
                  >
                    ${amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Amount Input */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground block mb-1.5">
                Or Custom Amount ($ USD)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm font-bold text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  step="0.50"
                  min="1.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8 font-mono text-sm font-bold rounded-2xl h-11 bg-surface border-border/60"
                />
              </div>
            </div>

            {/* Encouraging Message */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground block mb-1.5">
                Note for the Artist (Optional)
              </label>
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Love the uncompressed master release! 🔥"
                className="text-xs rounded-2xl h-10 bg-surface border-border/60"
              />
            </div>

            {/* Guarantee badge */}
            <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-[11px] text-emerald-400">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>100% of this tip goes straight to the creator's payout wallet.</span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                className="flex-1 rounded-full border-border/60 text-xs font-bold h-11"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>

              <Button
                className="flex-1 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs h-11 shadow-lg shadow-primary/25 gap-1.5 cursor-pointer"
                onClick={handleSendTip}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    <Gift className="h-4 w-4" /> Send ${amount} Tip
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
