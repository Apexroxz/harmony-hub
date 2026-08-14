import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  ShoppingBag,
  Search,
  Download,
  Play,
  Music2,
  SlidersHorizontal,
  Loader2,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { catalogQueryOptions } from "@/domain/music/queries";
import { formatDuration, qualityLabel, isLossless, formatNumber, type Track } from "@/domain/music/types";
import { usePlayer } from "@/lib/player";
import { useAuth } from "@/lib/auth";
import { useWallet } from "@/lib/wallet";
import { QualityBadge } from "@/components/QualityBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/store")({
  head: () => ({
    meta: [
      { title: "Store — Layam" },
      {
        name: "description",
        content:
          "Buy and download high-fidelity tracks directly from independent artists.",
      },
      { property: "og:title", content: "Store — Layam" },
      {
        property: "og:description",
        content:
          "Buy and download high-fidelity tracks directly from independent artists.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StorePage,
});

const genres = [
  "All",
  "Electronic",
  "Ambient",
  "Hip-Hop",
  "Rock",
  "Pop",
  "Jazz",
  "Classical",
  "Indie",
  "Folk",
  "Acoustic",
];

// ── Purchase state (persisted in sessionStorage for V0) ───────────────────────
const PURCHASES_KEY = "layam_purchases";

function getPurchases(): string[] {
  try {
    const stored = sessionStorage.getItem(PURCHASES_KEY);
    return stored ? (JSON.parse(stored) as string[]) : [];
  } catch {
    return [];
  }
}

function savePurchase(trackId: string) {
  const current = getPurchases();
  if (!current.includes(trackId)) {
    current.push(trackId);
    sessionStorage.setItem(PURCHASES_KEY, JSON.stringify(current));
  }
}

// ── Store page ────────────────────────────────────────────────────────────────
function StorePage() {
  const { data, isPending } = useQuery(catalogQueryOptions());
  const { playTrack } = usePlayer();
  const { user } = useAuth();
  const wallet = useWallet();

  const [query, setQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [buyingTrack, setBuyingTrack] = useState<Track | null>(null);
  const [purchased, setPurchased] = useState<string[]>(getPurchases);
  const [processing, setProcessing] = useState(false);

  const tracks = data?.tracks ?? [];

  const filtered = useMemo(() => {
    return tracks.filter((track) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        track.title.toLowerCase().includes(q) ||
        track.artistName.toLowerCase().includes(q) ||
        track.genre.toLowerCase().includes(q);
      const matchesGenre =
        selectedGenre === "All" ||
        track.genre.toLowerCase() === selectedGenre.toLowerCase();
      return matchesQuery && matchesGenre;
    });
  }, [tracks, query, selectedGenre]);

  const handleBuy = (track: Track) => {
    if (purchased.includes(track.id)) {
      toast.info("Already purchased", {
        description: `You already own "${track.title}".`,
      });
      return;
    }
    setBuyingTrack(track);
  };

  const confirmPurchase = () => {
    if (!buyingTrack) return;
    const price = buyingTrack.price ?? 0;

    if (price > 0 && !wallet.connected) {
      toast.error("Connect your wallet", {
        description: "You need a connected wallet to purchase tracks.",
      });
      return;
    }

    if (price > 0 && wallet.balance < price) {
      toast.error("Insufficient balance", {
        description: `You need $${price.toFixed(2)} but only have $${wallet.balance.toFixed(2)}.`,
      });
      return;
    }

    setProcessing(true);
    setTimeout(() => {
      savePurchase(buyingTrack.id);
      setPurchased((prev) => [...prev, buyingTrack.id]);
      setProcessing(false);
      setBuyingTrack(null);
      toast.success("Purchase complete!", {
        description: `"${buyingTrack.title}" is now in your Library. Artist has been credited $${(price || 0).toFixed(2)}.`,
      });
    }, 800);
  };

  const handleDownload = (track: Track) => {
    if (track.monetized && !purchased.includes(track.id)) {
      toast.error("Purchase required", {
        description: "Buy this track to unlock the download.",
      });
      return;
    }
    // Trigger download
    const a = document.createElement("a");
    a.href = track.audioUrl;
    a.download = `${track.title} - ${track.artistName}.${track.quality.toLowerCase()}`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Download started", {
      description: `${track.title} is downloading.`,
    });
  };

  const isFree = (track: Track) => !track.monetized || !track.price || track.price === 0;
  const isOwned = (trackId: string) => purchased.includes(trackId);

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pb-32 pt-20 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Store
              </h1>
            </div>
          </div>
          <p className="text-muted-foreground">
            Buy and download hi-fi tracks directly from independent artists.
          </p>
        </div>

        {/* Search & Filters */}
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tracks, artists, genres…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-border/60 bg-surface-raised pl-10 text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0">
            <SlidersHorizontal className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            {genres.map((genre) => (
              <Button
                key={genre}
                variant={selectedGenre === genre ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedGenre(genre)}
                className={
                  selectedGenre === genre
                    ? "bg-primary text-primary-foreground"
                    : "border-border/60 bg-glass text-muted-foreground hover:text-foreground"
                }
              >
                {genre}
              </Button>
            ))}
          </div>
        </div>

        {/* Track Grid */}
        {isPending ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[340px] animate-pulse rounded-2xl border border-border/40 bg-surface-raised"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 py-24 text-center">
            <Music2 className="mb-4 h-10 w-10 text-muted-foreground" />
            <p className="text-lg font-semibold text-foreground">
              {tracks.length === 0
                ? "No tracks in the store yet"
                : "No tracks match your search"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {tracks.length === 0
                ? "Artists — upload your first release to start selling."
                : "Try a different search term or genre filter."}
            </p>
            {tracks.length === 0 && (
              <Button
                asChild
                className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Link to="/upload">Upload a Track</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((track) => (
              <StoreCard
                key={track.id}
                track={track}
                owned={isOwned(track.id)}
                free={isFree(track)}
                onPlay={() => playTrack(track, filtered)}
                onBuy={() => handleBuy(track)}
                onDownload={() => handleDownload(track)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Purchase confirmation modal */}
      <Dialog
        open={buyingTrack !== null}
        onOpenChange={(open) => !open && setBuyingTrack(null)}
      >
        <DialogContent className="max-w-sm rounded-3xl border-border/60 bg-background/95 p-6 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              Confirm Purchase
            </DialogTitle>
          </DialogHeader>
          {buyingTrack && (
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <img
                  src={buyingTrack.coverImage}
                  alt={buyingTrack.title}
                  className="h-16 w-16 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">
                    {buyingTrack.title}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {buyingTrack.artistName}
                  </p>
                  <QualityBadge spec={buyingTrack} className="mt-1" />
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-border/40 bg-surface-raised p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Track price</span>
                  <span className="font-bold text-foreground">
                    ${(buyingTrack.price ?? 0).toFixed(2)}
                  </span>
                </div>
                {wallet.connected && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Wallet balance
                    </span>
                    <span className="text-foreground">
                      ${wallet.balance.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-border/40 pt-2 text-sm">
                  <span className="text-muted-foreground">Artist receives</span>
                  <span className="font-medium text-primary">
                    ${((buyingTrack.price ?? 0) * 0.85).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                <span>
                  You'll receive a lossless download and the artist is credited
                  instantly.
                </span>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-border/60"
                  onClick={() => setBuyingTrack(null)}
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
                  onClick={confirmPurchase}
                  disabled={processing}
                >
                  {processing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {processing ? "Processing…" : `Buy for $${(buyingTrack.price ?? 0).toFixed(2)}`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Store card ─────────────────────────────────────────────────────────────────
function StoreCard({
  track,
  owned,
  free,
  onPlay,
  onBuy,
  onDownload,
}: {
  track: Track;
  owned: boolean;
  free: boolean;
  onPlay: () => void;
  onBuy: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
      {/* Cover image */}
      <div className="relative aspect-square overflow-hidden">
        <img
          src={track.coverImage}
          alt={track.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

        {/* Play button overlay */}
        <button
          onClick={onPlay}
          className="absolute bottom-3 left-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg opacity-0 transition-all group-hover:opacity-100 hover:scale-105 hover:bg-primary/90"
          aria-label={`Play ${track.title}`}
        >
          <Play className="h-5 w-5 fill-current" />
        </button>

        {/* Price badge */}
        <div className="absolute right-3 top-3">
          {owned ? (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/90 px-2.5 py-1 text-[11px] font-bold text-white shadow-md">
              <CheckCircle2 className="h-3 w-3" />
              Owned
            </span>
          ) : free ? (
            <span className="rounded-full bg-foreground/80 px-2.5 py-1 text-[11px] font-bold text-background shadow-md">
              Free
            </span>
          ) : (
            <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground shadow-md">
              ${(track.price ?? 0).toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <Link
          to="/track/$id"
          params={{ id: track.id }}
          className="block truncate text-sm font-semibold text-foreground hover:text-primary transition-colors"
        >
          {track.title}
        </Link>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {track.artistName}
        </p>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QualityBadge spec={track} />
            <span className="text-[10px] text-muted-foreground">
              {formatDuration(track.duration)}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {formatNumber(track.playCount)} plays
          </span>
        </div>

        {/* Action buttons */}
        <div className="mt-3 flex gap-2">
          {owned || free ? (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1.5 border-border/60 text-xs"
              onClick={onDownload}
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
          ) : (
            <Button
              size="sm"
              className="flex-1 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold"
              onClick={onBuy}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Buy ${(track.price ?? 0).toFixed(2)}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
