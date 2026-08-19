import { createFileRoute, Link } from "@tanstack/react-router";
import {
  TrendingUp,
  Users,
  Wallet,
  Music2,
  Globe2,
  ShieldCheck,
  Play,
  UploadCloud,
  Trophy,
  Flame,
  Zap,
  Sparkles,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { catalogQueryOptions } from "@/domain/music/queries";
import { RevenueSplitsModal } from "@/components/RevenueSplitsModal";
import { RoyaltyCashoutModal } from "@/components/RoyaltyCashoutModal";
import { OctalysisGamificationModal } from "@/components/OctalysisGamificationModal";
import { WalletButton } from "@/components/WalletButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getPurchasedTrackIds } from "@/domain/music/purchases";
import { formatDuration } from "@/domain/music/types";
import { usePlayer } from "@/lib/player";
import { useGamification } from "@/lib/gamification";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { CreatorAnalyticsService } from "@/domain/creator/creator-analytics.service";
import type { CreatorEarningsSummary } from "@/domain/creator/creator-economy.types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Artist Portal & Royalty Analytics — Layam" },
      {
        name: "description",
        content:
          "Real-time stream metrics, collaborator revenue splits, and instant royalty cashout.",
      },
      { property: "og:title", content: "Artist Portal & Royalty Analytics — Layam" },
      {
        property: "og:description",
        content:
          "Real-time stream metrics, collaborator revenue splits, and instant royalty cashout.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ArtistDashboardPage,
});

function StatCard({
  label,
  value,
  sub,
  subColor = "text-muted-foreground",
  icon: Icon,
  iconColor = "text-muted-foreground",
  accent = false,
  action,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  subColor?: string;
  icon: React.ElementType;
  iconColor?: string;
  accent?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[2rem] border p-6 space-y-3.5 backdrop-blur-xl transition-all duration-500 hover:shadow-2xl",
        accent
          ? "border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 to-[#0e1210] shadow-[0_15px_40px_rgba(16,185,129,0.08)]"
          : "border-white/[0.08] bg-gradient-to-b from-[#141518] to-[#0c0d0f] shadow-[0_15px_40px_rgba(0,0,0,0.8)]",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground uppercase">
          {label}
        </span>
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.06]">
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
      </div>
      <p
        className={cn(
          "text-3xl sm:text-4xl font-black tracking-tight font-mono",
          accent ? "text-emerald-400" : "text-foreground",
        )}
      >
        {value}
      </p>
      {sub && <p className={cn("text-xs font-semibold flex items-center gap-1", subColor)}>{sub}</p>}
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}

function ArtistDashboardPage() {
  const { data: catalog } = useQuery(catalogQueryOptions());
  const { playTrack } = usePlayer();
  const { user, isArtist, upgradeToArtist, demoLogin } = useAuth();
  const { state: gamificationState, levelInfo } = useGamification();
  const navigate = useNavigate();

  const allTracks = catalog?.tracks || [];
  const artistTracks = allTracks.filter(
    (t) => t.uploaderId === user?.id || t.artistId === user?.id,
  );

  const totalStreams = artistTracks.reduce((acc, t) => acc + (t.playCount || 0), 0);
  const initialRoyalty = totalStreams * 0.004;

  const [royaltyBalance, setRoyaltyBalance] = useState<number>(initialRoyalty);
  const [earningsSummary, setEarningsSummary] = useState<CreatorEarningsSummary | null>(null);
  const [cashoutModalOpen, setCashoutModalOpen] = useState(false);
  const [gamificationOpen, setGamificationOpen] = useState(false);

  useEffect(() => {
    let active = true;
    if (user?.id) {
      void CreatorAnalyticsService.getEarningsSummary(user.id).then((summary) => {
        if (active && summary) {
          setEarningsSummary(summary);
          setRoyaltyBalance(summary.availableBalanceUsd);
        }
      });
    } else {
      setRoyaltyBalance(initialRoyalty);
    }
    return () => {
      active = false;
    };
  }, [user?.id, initialRoyalty]);

  // Listener Gate: If not an artist, show exclusive Creator Portal Gateway
  if (!isArtist) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-primary/30 bg-gradient-to-b from-[#141518] to-[#0c0d0f] p-8 sm:p-12 text-center shadow-2xl">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/15 text-primary border border-primary/30 mb-6">
            <Music2 className="h-10 w-10" />
          </div>

          <Badge className="bg-primary/20 text-primary border-primary/40 text-xs font-mono mb-3">
            ARTIST CREATOR STUDIO
          </Badge>

          <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
            Creator Studio & Payout Vault
          </h1>

          <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
            The Artist Studio is an exclusive space for verified musicians, producers, and audio engineers to distribute lossless masters, manage collaborator split sheets, and claim Net-30 royalties.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Button
              size="lg"
              onClick={() => upgradeToArtist()}
              className="w-full sm:w-auto rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-8 shadow-lg shadow-primary/25 cursor-pointer gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Activate Artist Creator Account
            </Button>

            <Link to="/stream" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full rounded-full border-border/60 bg-surface-raised font-bold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                🎧 Return to Listener View
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Clean 0-State UI for new creators
  if (artistTracks.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-6 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                Artist Creator Studio
              </h1>
              <Badge className="bg-primary/20 text-primary border-primary/40 text-[10px] font-mono">
                PRIVATE SPACE
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Logged in as <span className="font-bold text-foreground">{user?.name || "Artist"}</span> · Lossless Distribution & Royalty Settlement
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/stream">
              <Button variant="outline" className="rounded-full text-xs font-semibold h-9 px-4 border-border/60">
                🎧 Listener View
              </Button>
            </Link>
            <WalletButton />
            <Link to="/upload">
              <Button className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-xs font-semibold h-9 px-4 cursor-pointer">
                <UploadCloud className="h-4 w-4" />
                Upload 24-Bit Master
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/60 bg-surface/40 p-12 text-center my-12">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
            <Music2 className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Welcome to Your Artist Studio</h2>
          <p className="text-sm text-muted-foreground max-w-md mt-2 mb-6">
            You have not published any master tracks yet. Upload your first FLAC or WAV master to begin earning direct stream royalties and store sales.
          </p>
          <Link to="/upload">
            <Button className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-bold px-6">
              <UploadCloud className="h-4 w-4" />
              Upload First Master Track
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* ── Studio Header & Primary Action ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-6 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Artist Creator Studio
            </h1>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-mono font-bold text-emerald-400 border border-emerald-500/30">
              DIRECT SETTLEMENTS
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time lossless telemetry, collaborator revenue splits, and net-30 treasury pool.
          </p>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <Link to="/stream">
            <Button variant="outline" className="rounded-full text-xs font-semibold h-9 px-3.5 border-border/60 hover:bg-surface-raised">
              🎧 Listener View
            </Button>
          </Link>
          <button
            onClick={() => setGamificationOpen(true)}
            className="hidden sm:flex items-center gap-2 rounded-full border border-white/[0.08] bg-black/40 px-3 py-1.5 text-xs font-mono hover:border-primary/40 hover:bg-white/[0.05] transition-all cursor-pointer"
          >
            <Trophy className="h-4 w-4 text-primary" />
            <span className="font-bold text-foreground">Lvl {levelInfo.level}</span>
            <span className="text-muted-foreground">({gamificationState.xp} XP)</span>
          </button>
          <WalletButton />
          <Link to="/upload">
            <Button className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-xs font-semibold h-9 px-4 cursor-pointer shadow-md">
              <UploadCloud className="h-4 w-4" />
              Upload 24-Bit Master
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Metric Highlights Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Stream Volume"
          value={totalStreams.toLocaleString()}
          sub="Bit-perfect master plays"
          subColor="text-primary/80"
          icon={TrendingUp}
          iconColor="text-primary"
        />
        <StatCard
          label="Active Listeners"
          value={Math.round(totalStreams * 0.42).toLocaleString()}
          sub="Unique audiophile listeners"
          subColor="text-muted-foreground"
          icon={Users}
          iconColor="text-primary"
        />
        <StatCard
          label="Settled Royalties"
          value={`$${(royaltyBalance * 0.6).toFixed(2)}`}
          sub="Net-30 Monthly Distribution"
          subColor="text-emerald-400"
          icon={Wallet}
          iconColor="text-emerald-400"
          accent
          action={
            <Button
              size="sm"
              onClick={() => setCashoutModalOpen(true)}
              disabled={royaltyBalance <= 0}
              className="w-full rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold h-8 cursor-pointer shadow-md"
            >
              Monthly Payout Vault
            </Button>
          }
        />
        <StatCard
          label="Store Sales"
          value={(() => {
            try {
              const p = getPurchasedTrackIds();
              const artistSales = p.filter((id) => artistTracks.some((t) => t.id === id));
              return artistSales.length.toString();
            } catch {
              return "0";
            }
          })()}
          sub={(() => {
            try {
              const p = getPurchasedTrackIds();
              const rev = artistTracks
                .filter((t) => p.includes(t.id))
                .reduce((sum, t) => sum + (t.price ?? 0) * 0.85, 0);
              return rev > 0 ? `$${rev.toFixed(2)} revenue` : "No sales yet";
            } catch {
              return "No sales yet";
            }
          })()}
          subColor={(() => {
            try {
              const p = getPurchasedTrackIds();
              return artistTracks.some((t) => p.includes(t.id))
                ? "text-emerald-400"
                : "text-muted-foreground";
            } catch {
              return "text-muted-foreground";
            }
          })()}
          icon={Globe2}
          iconColor="text-primary/60"
        />
      </div>

      {/* ── Octalysis Creator Mastery Progress Card (Core Drives 1, 2, 4, 5) ── */}
      <div className="rounded-3xl border border-white/[0.08] bg-[#121316] p-6 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary border border-primary/30">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-foreground">
                Octalysis Creator Rank: Level {levelInfo.level} ({levelInfo.title})
              </h3>
              <Badge variant="outline" className="text-[9px] font-mono border-primary/30 text-primary">
                8-CORE DRIVES
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 max-w-xl">
              Unlock Creator Badges, boost your Fan Influence score, and earn acoustic reputation by publishing stems, hosting live broadcast rooms, and engaging with listeners.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button
            onClick={() => setGamificationOpen(true)}
            variant="outline"
            className="rounded-full border-white/[0.1] bg-black/40 hover:bg-white/[0.06] text-xs font-bold px-4 h-9 cursor-pointer gap-2"
          >
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            View 8-Core Profile & Badges
          </Button>
        </div>
      </div>

      {/* ── Revenue Stream Breakdown & Audience Insights ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Revenue Allocation Sources (7 Cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-border/30 bg-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border/30 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Revenue Stream Breakdown</h2>
              <p className="text-xs text-muted-foreground">Multi-channel earnings & creator shares</p>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
              85% - 100% DIRECT
            </span>
          </div>

          <div className="space-y-3">
            {[
              {
                source: "DRM-Free Master Downloads",
                rate: "85% Creator Pool",
                earned: `$${(artistTracks.length * 4.47).toFixed(2)}`,
                percent: 54,
                color: "bg-primary",
              },
              {
                source: "Direct Fan Tips & Boosts",
                rate: "100% Direct Payout",
                earned: `$${(artistTracks.length * 2.5).toFixed(2)}`,
                percent: 28,
                color: "bg-emerald-400",
              },
              {
                source: "Multi-Track 24-Bit Stems",
                rate: "85% Creator Pool",
                earned: `$${(artistTracks.length * 1.25).toFixed(2)}`,
                percent: 12,
                color: "bg-cyan-400",
              },
              {
                source: "Sync & Content Licensing",
                rate: "85% Creator Pool",
                earned: `$${(artistTracks.length * 0.8).toFixed(2)}`,
                percent: 6,
                color: "bg-purple-400",
              },
            ].map((item, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{item.source}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">({item.rate})</span>
                  </div>
                  <span className="font-mono font-bold text-foreground">{item.earned}</span>
                </div>
                <div className="h-1.5 w-full bg-surface-raised rounded-full overflow-hidden">
                  <div style={{ width: `${item.percent}%` }} className={cn("h-full rounded-full", item.color)} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audience & Quality Distribution (5 Cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-border/30 bg-card p-5 space-y-4">
          <div className="border-b border-border/30 pb-3">
            <h2 className="text-sm font-semibold text-foreground">Audiophile Streaming Fidelity</h2>
            <p className="text-xs text-muted-foreground">Listener format & sound quality breakdown</p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1 text-xs font-mono">
            <div className="rounded-xl bg-surface-raised p-3 border border-border/40">
              <span className="text-[10px] text-muted-foreground block">24-Bit / 96kHz Lossless</span>
              <span className="font-extrabold text-primary text-lg">71.4%</span>
              <span className="text-[10px] text-emerald-400 block mt-0.5">Bit-Perfect Stream</span>
            </div>

            <div className="rounded-xl bg-surface-raised p-3 border border-border/40">
              <span className="text-[10px] text-muted-foreground block">16-Bit / 44.1kHz CD</span>
              <span className="font-extrabold text-foreground text-lg">28.6%</span>
              <span className="text-[10px] text-muted-foreground block mt-0.5">Standard Stream</span>
            </div>
          </div>

          <div className="rounded-xl border border-border/30 bg-surface/60 p-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Top Region</span>
              <span className="font-bold text-foreground">North America (44%)</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Primary Audio Output</span>
              <span className="font-bold text-foreground">External DAC / Planar (62%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Track catalog table ── */}
      <div className="rounded-2xl border border-border/30 bg-card p-5">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Track Catalog & Master Ownership</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">ISRC tags, revenue splits & streaming metrics</p>
          </div>
          <span className="text-label text-muted-foreground">{artistTracks.length} live</span>
        </div>

        <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
          {artistTracks.map((track, i) => (
            <div
              key={track.id}
              className={cn(
                "flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-raised",
                i !== artistTracks.length - 1 && "border-b border-border/20",
              )}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <img
                  src={track.coverImage}
                  alt=""
                  className="h-9 w-9 rounded-lg object-cover flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-foreground truncate">{track.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {track.artistName} · {formatDuration(track.duration)} · {track.format || track.quality || "LOSSLESS"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-right hidden sm:block">
                  <p className="font-mono text-[11px] font-bold text-primary">
                    {track.playCount?.toLocaleString() ?? "0"}
                  </p>
                  <p className="text-[10px] text-emerald-400/80">streams</p>
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => playTrack(track, artistTracks)}
                  className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/8 cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                </Button>

                <RevenueSplitsModal track={track} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Programmatic Instant Royalty Cashout Modal */}
      <RoyaltyCashoutModal
        balance={royaltyBalance}
        open={cashoutModalOpen}
        onSuccess={() => setRoyaltyBalance(0)}
        onClose={() => setCashoutModalOpen(false)}
      />

      {/* Octalysis Gamification Hub Modal */}
      <OctalysisGamificationModal
        open={gamificationOpen}
        onClose={() => setGamificationOpen(false)}
      />
    </div>
  );
}
