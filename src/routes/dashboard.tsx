import { createFileRoute, Link } from "@tanstack/react-router";
import {
  TrendingUp, Users, Wallet,
  Music2, Globe2, ShieldCheck, Play, UploadCloud
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { catalogQueryOptions } from "@/domain/music/queries";
import { RevenueSplitsModal } from "@/components/RevenueSplitsModal";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/domain/music/types";
import { usePlayer } from "@/lib/player";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Artist Portal & Royalty Analytics — Layam" },
      { name: "description", content: "Real-time stream metrics, collaborator revenue splits, and instant royalty cashout." },
      { property: "og:title", content: "Artist Portal & Royalty Analytics — Layam" },
      { property: "og:description", content: "Real-time stream metrics, collaborator revenue splits, and instant royalty cashout." },
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
    <div className={cn(
      "rounded-2xl border p-5 space-y-3",
      accent
        ? "border-primary/25 bg-primary/6"
        : "border-border/30 bg-card"
    )}>
      <div className="flex items-center justify-between">
        <span className="text-label text-muted-foreground">{label}</span>
        <Icon className={cn("h-3.5 w-3.5", iconColor)} />
      </div>
      <p className={cn("text-3xl font-extrabold tracking-tight font-mono", accent ? "text-primary" : "text-foreground")}>
        {value}
      </p>
      {sub && <p className={cn("text-xs font-medium flex items-center gap-1", subColor)}>{sub}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}

function ArtistDashboardPage() {
  const { data: catalog } = useQuery(catalogQueryOptions());
  const { playTrack } = usePlayer();
  const { user, isArtist } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isArtist) {
      toast.error("Artist Account Required", {
        description: "Upgrade to an Artist Creator account to access the Artist Portal.",
      });
      void navigate({ to: "/" });
    }
  }, [isArtist, navigate]);

  if (!isArtist) return null;

  const allTracks = catalog?.tracks || [];
  const artistTracks = allTracks.filter(
    (t) => t.uploaderId === user?.id || t.artistId === user?.id
  );

  const totalStreams = artistTracks.reduce((acc, t) => acc + (t.playCount || 0), 0);
  const initialRoyalty = totalStreams * 0.004;

  const [royaltyBalance, setRoyaltyBalance] = useState<number>(initialRoyalty);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  useEffect(() => {
    setRoyaltyBalance(initialRoyalty);
  }, [initialRoyalty]);

  const handleCashout = () => {
    if (royaltyBalance <= 0) {
      toast.info("No Royalty Balance", { description: "You have no unpaid royalties to cash out." });
      return;
    }
    setIsWithdrawing(true);
    setTimeout(() => {
      const amount = royaltyBalance.toFixed(2);
      setRoyaltyBalance(0);
      setIsWithdrawing(false);
      toast.success("Royalty Cashout Executed!", {
        description: `Payout of $${amount} sent to your wallet.`,
      });
    }, 1200);
  };

  // Clean 0-State UI for new creators
  if (artistTracks.length === 0) {
    return (
      <div className="mx-auto min-h-screen max-w-7xl px-4 pb-36 pt-20 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-label text-muted-foreground mb-1">Artist Portal</p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Analytics</h1>
          </div>
          <Link to="/upload">
            <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2 px-5 font-bold cursor-pointer">
              <UploadCloud className="h-3.5 w-3.5" />
              Upload Track
            </Button>
          </Link>
        </div>

        <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-card p-12 text-center max-w-xl mx-auto my-12 shadow-2xl">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
            <Music2 className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">No tracks uploaded yet</h2>
          <p className="text-xs text-muted-foreground max-w-sm mb-6 leading-relaxed">
            Upload your first FLAC/MP3 track to view real-time analytics, stream counts, and royalty splits.
          </p>
          <Link to="/upload">
            <Button className="rounded-full bg-primary text-primary-foreground font-bold hover:bg-primary/90 gap-2 px-6 h-10 shadow-lg cursor-pointer">
              <UploadCloud className="h-4 w-4" />
              Upload Track
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 pb-36 pt-20 sm:px-6 lg:px-8">

      {/* ── Page header ── */}
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-label text-muted-foreground mb-1">Artist Portal</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Analytics</h1>
        </div>
        <Link to="/upload">
          <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2 px-5 font-bold cursor-pointer">
            <UploadCloud className="h-3.5 w-3.5" />
            Upload Track
          </Button>
        </Link>
      </div>

      {/* ── Analytics stat cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          label="Total Streams"
          value={totalStreams.toLocaleString()}
          sub="Real-time live count"
          subColor="text-emerald-400"
          icon={TrendingUp}
          iconColor="text-emerald-400"
        />
        <StatCard
          label="Uploaded Tracks"
          value={artistTracks.length.toString()}
          sub="Live in catalog"
          icon={Users}
          iconColor="text-primary"
        />
        <StatCard
          label="Royalty Balance"
          value={`$${royaltyBalance.toFixed(2)}`}
          icon={Wallet}
          iconColor="text-primary"
          accent
          action={
            <Button
              size="sm"
              onClick={handleCashout}
              disabled={isWithdrawing || royaltyBalance <= 0}
              className="w-full rounded-full bg-primary text-primary-foreground text-xs font-semibold h-8 cursor-pointer"
            >
              {isWithdrawing ? "Processing…" : "Instant Cashout"}
            </Button>
          }
        />
        <StatCard
          label="Store Sales"
          value={(() => {
            try {
              const p = JSON.parse(sessionStorage.getItem("layam_purchases") ?? "[]") as string[];
              const artistSales = p.filter((id) =>
                artistTracks.some((t) => t.id === id)
              );
              return artistSales.length.toString();
            } catch {
              return "0";
            }
          })()}
          sub={(() => {
            try {
              const p = JSON.parse(sessionStorage.getItem("layam_purchases") ?? "[]") as string[];
              const rev = artistTracks
                .filter((t) => p.includes(t.id))
                .reduce((sum, t) => sum + ((t.price ?? 0) * 0.85), 0);
              return rev > 0 ? `$${rev.toFixed(2)} revenue` : "No sales yet";
            } catch {
              return "No sales yet";
            }
          })()}
          subColor={(() => {
            try {
              const p = JSON.parse(sessionStorage.getItem("layam_purchases") ?? "[]") as string[];
              return artistTracks.some((t) => p.includes(t.id)) ? "text-emerald-400" : "text-muted-foreground";
            } catch {
              return "text-muted-foreground";
            }
          })()}
          icon={Globe2}
          iconColor="text-primary/60"
        />
      </div>

      {/* ── Track catalog table ── */}
      <div className="rounded-2xl border border-border/30 bg-card p-5">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Track Catalog</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Revenue splits & availability</p>
          </div>
          <span className="text-label text-muted-foreground">{artistTracks.length} live</span>
        </div>

        <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
          {artistTracks.map((track, i) => (
            <div
              key={track.id}
              className={cn(
                "flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-raised",
                i !== artistTracks.length - 1 && "border-b border-border/20"
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
                    {track.artistName} · {formatDuration(track.duration)}
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
                  size="icon" variant="ghost"
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
    </div>
  );
}
