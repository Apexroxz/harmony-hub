import { useState, useMemo } from "react";
import {
  Users,
  Plus,
  Trash2,
  PieChart,
  DollarSign,
  ShieldCheck,
  Percent,
  Sparkles,
  Sliders,
  Scale,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export interface CollaboratorSplit {
  id: string;
  name: string;
  role: string;
  walletOrEmail: string;
  percentage: number;
}

export type LicenseType =
  | "all-rights-reserved"
  | "sync-ready"
  | "creative-commons"
  | "token-exclusive";

export interface LicenseOption {
  id: LicenseType;
  title: string;
  badge: string;
  description: string;
  payoutTerm: string;
}

export const LICENSE_OPTIONS: LicenseOption[] = [
  {
    id: "all-rights-reserved",
    title: "All Rights Reserved (Commercial Master)",
    badge: "STANDARD DRM-FREE",
    description:
      "Full creator copyright. Master purchases grant private listening rights; commercial sync requires separate clearance.",
    payoutTerm: "85% direct creator pool",
  },
  {
    id: "sync-ready",
    title: "Sync-Ready Content License",
    badge: "CREATOR-FRIENDLY",
    description:
      "Pre-cleared for streamers, podcast producers, and video creators with automatic royalty attribution.",
    payoutTerm: "85% master pool + sync fee",
  },
  {
    id: "creative-commons",
    title: "Creative Commons (CC BY-NC 4.0)",
    badge: "OPEN CULTURE",
    description:
      "Allows remixing, sampling, and non-commercial distribution with mandatory artist attribution.",
    payoutTerm: "Tips & streaming pool only",
  },
  {
    id: "token-exclusive",
    title: "Token-Gated Master Exclusivity",
    badge: "WEB3 COLLECTIBLE",
    description:
      "1-of-1 exclusive master ownership bound to a verified Solana digital token with perpetual 10% secondary royalties.",
    payoutTerm: "95% direct sale + 10% royalties",
  },
];

interface SplitSheetManagerProps {
  splits: CollaboratorSplit[];
  onSplitsChange: (splits: CollaboratorSplit[]) => void;
  selectedLicense: LicenseType;
  onLicenseChange: (license: LicenseType) => void;
  trackPrice: number;
}

export function SplitSheetManager({
  splits,
  onSplitsChange,
  selectedLicense,
  onLicenseChange,
  trackPrice,
}: SplitSheetManagerProps) {
  const totalPercentage = useMemo(() => {
    return splits.reduce((sum, s) => sum + s.percentage, 0);
  }, [splits]);

  const isValidSplit = totalPercentage === 100;
  const creatorPayoutPool = trackPrice * 0.85;

  const handleAddCollaborator = () => {
    const newId = `collab-${Date.now()}`;
    const remaining = Math.max(0, 100 - totalPercentage);
    const newCollab: CollaboratorSplit = {
      id: newId,
      name: "",
      role: "Producer",
      walletOrEmail: "",
      percentage: remaining > 0 ? remaining : 10,
    };
    onSplitsChange([...splits, newCollab]);
  };

  const handleRemoveCollaborator = (id: string) => {
    if (splits.length <= 1) return;
    onSplitsChange(splits.filter((s) => s.id !== id));
  };

  const handleUpdateCollaborator = (id: string, updates: Partial<CollaboratorSplit>) => {
    onSplitsChange(splits.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const applyPreset = (type: "solo" | "equal" | "producer-split") => {
    if (type === "solo") {
      onSplitsChange([
        {
          id: "collab-1",
          name: splits[0]?.name || "Primary Artist",
          role: "Main Artist / Master Owner",
          walletOrEmail: splits[0]?.walletOrEmail || "",
          percentage: 100,
        },
      ]);
    } else if (type === "equal") {
      const share = Math.floor(100 / splits.length);
      const remainder = 100 - share * splits.length;
      onSplitsChange(
        splits.map((s, idx) => ({
          ...s,
          percentage: idx === 0 ? share + remainder : share,
        })),
      );
    } else if (type === "producer-split") {
      if (splits.length < 2) {
        onSplitsChange([
          {
            id: splits[0]?.id || "collab-1",
            name: splits[0]?.name || "Primary Artist",
            role: "Main Artist",
            walletOrEmail: splits[0]?.walletOrEmail || "",
            percentage: 70,
          },
          {
            id: "collab-2",
            name: "Producer / Beatmaker",
            role: "Producer",
            walletOrEmail: "",
            percentage: 30,
          },
        ]);
      } else {
        onSplitsChange(
          splits.map((s, idx) => ({
            ...s,
            percentage: idx === 0 ? 70 : Math.floor(30 / (splits.length - 1)),
          })),
        );
      }
    }
  };

  const roleSuggestions = [
    "Primary Artist",
    "Producer",
    "Vocalist",
    "Mixing Engineer",
    "Mastering Engineer",
    "Songwriter / Lyricist",
    "Label / Management",
  ];

  return (
    <div className="space-y-8 rounded-3xl border border-border/50 bg-card p-6 sm:p-8 shadow-lg">
      {/* ── 1. Split Sheet Section ── */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-primary text-xs font-bold mb-1">
              <Scale className="h-4 w-4" />
              <span>TRANSPARENT REVENUE SPLIT CONTRACT</span>
            </div>
            <h3 className="text-lg font-bold text-foreground">
              Automated Royalty & Revenue Split Sheet
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
              Distribute sale proceeds automatically across co-creators, producers, and session
              musicians. Payouts execute automatically upon each track purchase.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-muted-foreground uppercase mr-1">
              Presets:
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => applyPreset("solo")}
              className="h-7 text-[11px] rounded-full px-2.5 font-bold"
            >
              100% Solo
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => applyPreset("producer-split")}
              className="h-7 text-[11px] rounded-full px-2.5 font-bold"
            >
              70 / 30 Producer
            </Button>
            {splits.length > 1 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => applyPreset("equal")}
                className="h-7 text-[11px] rounded-full px-2.5 font-bold"
              >
                Equal Split
              </Button>
            )}
          </div>
        </div>

        {/* Visual Proportional Split Bar */}
        <div className="mb-6 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-foreground">Split Allocation</span>
            <span
              className={cn(
                "font-mono tabular-nums text-xs px-2 py-0.5 rounded-full border",
                isValidSplit
                  ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                  : "border-destructive/40 text-destructive bg-destructive/10 animate-pulse",
              )}
            >
              Total: {totalPercentage}% {isValidSplit ? "✓ Complete" : `(Must equal 100%)`}
            </span>
          </div>

          <div className="h-4 w-full rounded-full bg-surface-raised overflow-hidden flex border border-border/40 p-0.5 gap-0.5">
            {splits.map((s, idx) => {
              const colors = [
                "bg-primary",
                "bg-emerald-400",
                "bg-cyan-400",
                "bg-amber-400",
                "bg-rose-400",
                "bg-purple-400",
              ];
              const color = colors[idx % colors.length];
              return (
                <div
                  key={s.id}
                  style={{ width: `${s.percentage}%` }}
                  title={`${s.name || "Collaborator"}: ${s.percentage}%`}
                  className={cn(color, "h-full transition-all duration-300 rounded-sm")}
                />
              );
            })}
          </div>
        </div>

        {/* Collaborators List */}
        <div className="space-y-4">
          {splits.map((collab, idx) => {
            const calculatedEarnings = (creatorPayoutPool * (collab.percentage / 100)).toFixed(2);

            return (
              <div
                key={collab.id}
                className="rounded-2xl border border-border/50 bg-surface/50 p-4 space-y-3 transition-all hover:border-primary/30"
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 items-center">
                  {/* Name Input */}
                  <div className="sm:col-span-4">
                    <label className="text-[10px] font-bold text-muted-foreground block mb-1">
                      Collaborator / Stage Name
                    </label>
                    <Input
                      value={collab.name}
                      onChange={(e) =>
                        handleUpdateCollaborator(collab.id, { name: e.target.value })
                      }
                      placeholder={`e.g. ${idx === 0 ? "Your Name (Main Artist)" : "Producer"}`}
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>

                  {/* Role Selector / Input */}
                  <div className="sm:col-span-3">
                    <label className="text-[10px] font-bold text-muted-foreground block mb-1">
                      Creative Role
                    </label>
                    <select
                      value={collab.role}
                      onChange={(e) =>
                        handleUpdateCollaborator(collab.id, { role: e.target.value })
                      }
                      className="h-9 w-full rounded-xl border border-border/60 bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {roleSuggestions.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Wallet / Payout Address */}
                  <div className="sm:col-span-3">
                    <label className="text-[10px] font-bold text-muted-foreground block mb-1">
                      Solana Wallet or Email
                    </label>
                    <Input
                      value={collab.walletOrEmail}
                      onChange={(e) =>
                        handleUpdateCollaborator(collab.id, { walletOrEmail: e.target.value })
                      }
                      placeholder="Solana address / Email"
                      className="h-9 text-xs font-mono rounded-xl"
                    />
                  </div>

                  {/* Percentage & Actions */}
                  <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2 pt-4 sm:pt-0">
                    <div className="text-right">
                      <span className="font-mono text-base font-bold text-foreground">
                        {collab.percentage}%
                      </span>
                      <span className="block text-[10px] font-mono text-emerald-400">
                        +${calculatedEarnings}/sale
                      </span>
                    </div>

                    {splits.length > 1 && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveCollaborator(collab.id)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-full"
                        title="Remove Collaborator"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Percentage Slider */}
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-[10px] text-muted-foreground font-mono">0%</span>
                  <Slider
                    value={[collab.percentage]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={([val]) => {
                      if (typeof val === "number") {
                        handleUpdateCollaborator(collab.id, { percentage: val });
                      }
                    }}
                    className="flex-1"
                  />
                  <span className="text-[10px] text-muted-foreground font-mono">100%</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Collaborator Button */}
        <div className="mt-4 flex items-center justify-between">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleAddCollaborator}
            className="rounded-full text-xs font-bold gap-1.5 h-8 border-border/60"
          >
            <Plus className="h-3.5 w-3.5" /> Add Co-Creator / Producer
          </Button>

          <div className="text-xs text-muted-foreground font-mono">
            Platform Cut: <span className="font-bold text-foreground">15%</span> · Creator Pool:{" "}
            <span className="font-bold text-emerald-400">85% (${creatorPayoutPool.toFixed(2)})</span>
          </div>
        </div>
      </div>

      {/* ── 2. Rights & Master License Selector ── */}
      <div className="border-t border-border/40 pt-6">
        <div className="flex items-center gap-2 text-primary text-xs font-bold mb-1">
          <ShieldCheck className="h-4 w-4" />
          <span>MASTER DISTRIBUTION LICENSE</span>
        </div>
        <h3 className="text-lg font-bold text-foreground">Select Master Release License</h3>
        <p className="text-xs text-muted-foreground mt-0.5 mb-4">
          Choose the legal rights and licensing model attached to this audio release.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {LICENSE_OPTIONS.map((opt) => {
            const isSelected = selectedLicense === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => onLicenseChange(opt.id)}
                className={cn(
                  "relative cursor-pointer rounded-2xl border p-4 transition-all flex flex-col justify-between",
                  isSelected
                    ? "border-primary bg-primary/10 shadow-md ring-1 ring-primary/40"
                    : "border-border/60 bg-surface/60 hover:border-primary/40 hover:bg-surface",
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px] font-mono font-bold px-2 py-0.5",
                        isSelected
                          ? "border-primary/50 text-primary bg-primary/20"
                          : "border-border/60 text-muted-foreground",
                      )}
                    >
                      {opt.badge}
                    </Badge>
                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                  </div>
                  <h4 className="text-sm font-bold text-foreground">{opt.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {opt.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-border/30 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <span>Payout terms:</span>
                  <span className="font-bold text-emerald-400">{opt.payoutTerm}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
