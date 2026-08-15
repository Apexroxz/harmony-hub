import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  CheckCircle2,
  Users,
  Disc3,
  Sparkles,
  Heart,
  DollarSign,
  Crown,
  Check,
  ShieldCheck,
  Loader2,
  Gift,
} from "lucide-react";
import { toast } from "sonner";
import { CatalogService } from "@/domain/music/catalog.service";
import { formatNumber, type CreatorTier, type Track } from "@/domain/music/types";
import { useWallet } from "@/lib/wallet";
import { useAuth } from "@/lib/auth";
import { TrackCard } from "@/components/TrackCard";
import { FanTipModal, getArtistTips, type TipRecord } from "@/components/FanTipModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/artist/$id")({
  loader: async ({ params }) => {
    const artist = await CatalogService.getArtistById(params.id);
    if (!artist) throw notFound();
    const discography = await CatalogService.getTracksByArtist(artist.id);
    return { artist, discography };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.artist.name} — Layam` },
          {
            name: "description",
            content: `Listen to ${loaderData.artist.name} and join the fan club on Layam.`,
          },
          { property: "og:title", content: `${loaderData.artist.name} — Layam` },
          {
            property: "og:description",
            content: `Listen to ${loaderData.artist.name} and join the fan club on Layam.`,
          },
          { property: "og:type", content: "profile" },
          { name: "twitter:card", content: "summary" },
        ]
      : [],
  }),
  component: ArtistPage,
});

const DEFAULT_TIERS: CreatorTier[] = [
  {
    id: "supporter",
    name: "Fan Supporter",
    priceMonthly: 3.0,
    perks: [
      "Supporter badge on profile & comments",
      "Early 48-hour access to all new releases",
      "Exclusive community activity updates",
    ],
  },
  {
    id: "vip",
    name: "Backstage VIP",
    priceMonthly: 9.99,
    perks: [
      "Everything in Fan Supporter",
      "Free 24-bit bit-perfect FLAC master downloads",
      "Access to unreleased demos & stems",
      "15% discount on all Direct Store purchases",
    ],
    color: "amber",
  },
];

import { supabase } from "@/integrations/supabase/client";

function getSubscriptions(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const stored = sessionStorage.getItem("layam_artist_subscriptions");
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveSubscription(artistId: string, tierId: string, userId?: string, priceMonthly = 9.99) {
  if (typeof window !== "undefined") {
    const current = getSubscriptions();
    current[artistId] = tierId;
    sessionStorage.setItem("layam_artist_subscriptions", JSON.stringify(current));
  }

  // Persist to database if authenticated
  if (userId && !userId.startsWith("demo-")) {
    void supabase
      .from("artist_subscriptions")
      .upsert(
        {
          user_id: userId,
          artist_id: artistId,
          tier: tierId,
          status: "active",
        },
        { onConflict: "user_id,artist_id" },
      )
      .catch((err) => console.warn("[ArtistSubscription] Supabase note:", err));

    // Write to royalty ledger for creator
    void supabase
      .from("royalty_transactions")
      .insert({
        creator_id: artistId,
        event_type: "subscription",
        amount: priceMonthly,
        currency: "USD",
        metadata: {
          tier: tierId,
          subscriberId: userId,
        },
      })
      .catch(() => {});
  }
}

function ArtistPage() {
  const { artist, discography } = Route.useLoaderData();
  const { user } = useAuth();
  const wallet = useWallet();

  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(artist.followers || 12400);
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [tipModalOpen, setTipModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<CreatorTier>(DEFAULT_TIERS[0] as CreatorTier);
  const [subscribing, setSubscribing] = useState(false);
  const [activeTierId, setActiveTierId] = useState<string | null>(null);
  const [artistTips, setArtistTips] = useState<TipRecord[]>(() => getArtistTips(artist.id));

  useEffect(() => {
    setArtistTips(getArtistTips(artist.id));
  }, [artist.id]);

  const totalTipsUsd = artistTips.reduce((acc, t) => acc + t.amountUsd, 0);

  useEffect(() => {
    const subs = getSubscriptions();
    if (subs[artist.id]) {
      setActiveTierId(subs[artist.id] ?? null);
    }
  }, [artist.id]);

  const totalPlays = discography.reduce((acc, t) => acc + (t.playCount || 0), 0);

  const handleToggleFollow = () => {
    if (following) {
      setFollowing(false);
      setFollowerCount((c) => Math.max(0, c - 1));
      toast.info(`Unfollowed ${artist.name}`);
    } else {
      setFollowing(true);
      setFollowerCount((c) => c + 1);
      toast.success(`Following ${artist.name}!`, {
        description: "You will receive real-time release notifications in your feed.",
      });
    }
  };

  const handleSubscribe = () => {
    setSubscribing(true);
    setTimeout(() => {
      saveSubscription(artist.id, selectedTier.id, user?.id, selectedTier.priceMonthly);
      setActiveTierId(selectedTier.id);
      setSubscribing(false);
      setSubModalOpen(false);
      toast.success(`Welcome to ${artist.name}'s ${selectedTier.name}!`, {
        description: `Your $${selectedTier.priceMonthly.toFixed(2)}/mo membership is active.`,
      });
    }, 900);
  };

  const isOwner = Boolean(user && (user.id === artist.id || (artist as any).owner_id === user.id));

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pb-32 pt-24 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-border/40 bg-card">
          <div className="h-32 bg-gradient-to-r from-orange/30 via-amber/20 to-primary/30 sm:h-48" />
          <div className="px-6 pb-8 lg:px-10">
            <div className="-mt-16 flex flex-col items-start gap-6 sm:flex-row sm:items-end">
              <img
                src={artist.avatar}
                alt={artist.name}
                width={160}
                height={160}
                className="h-32 w-32 rounded-2xl border-4 border-card object-cover shadow-2xl sm:h-40 sm:w-40"
              />
              <div className="mb-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{artist.name}</h1>
                  {artist.verified && <CheckCircle2 className="h-6 w-6 text-primary" />}
                  {isOwner && (
                    <Badge className="bg-primary/20 text-primary border-primary/40 text-xs font-bold">
                      MY ARTIST PROFILE
                    </Badge>
                  )}
                  {activeTierId && !isOwner && (
                    <Badge className="bg-amber text-black font-bold flex items-center gap-1">
                      <Crown className="h-3 w-3 fill-current" />
                      {activeTierId === "vip" ? "VIP MEMBER" : "SUPPORTER"}
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">{artist.handle}</p>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {isOwner ? (
                  <>
                    <Button
                      asChild
                      className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2 shadow-lg shadow-primary/25"
                    >
                      <a href="/dashboard">
                        <span>🎨 Open Studio Dashboard</span>
                      </a>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="border-border/60 bg-surface-raised font-bold text-foreground hover:text-primary gap-1.5"
                    >
                      <a href="/upload">
                        <span>Upload New Master</span>
                      </a>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={handleToggleFollow}
                      variant={following ? "outline" : "default"}
                      className={cn(
                        "font-bold transition-all",
                        following
                          ? "border-border/60 text-muted-foreground"
                          : "bg-primary text-primary-foreground hover:bg-primary/90",
                      )}
                    >
                      {following ? "Following" : "Follow"}
                    </Button>

                    <Button
                      onClick={() => setSubModalOpen(true)}
                      className="bg-gradient-to-r from-amber to-orange text-black font-bold hover:opacity-90 gap-1.5 shadow-md"
                    >
                      <Crown className="h-4 w-4 fill-current" />
                      {activeTierId ? "Manage Club" : "Join Fan Club"}
                    </Button>

                    <Button
                      onClick={() => setTipModalOpen(true)}
                      variant="outline"
                      className="border-border/60 bg-glass text-foreground hover:text-primary gap-1"
                    >
                      <Gift className="h-4 w-4" />
                      Tip
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Real-time stats computed from artist catalog */}
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {[
                { label: "Followers", value: formatNumber(followerCount), icon: Users },
                { label: "Catalog Releases", value: discography.length.toString(), icon: Disc3 },
                { label: "Total Streams", value: formatNumber(totalPlays), icon: Disc3 },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-border/40 bg-surface-raised p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <stat.icon className="h-3.5 w-3.5 text-primary/70" />
                  </div>
                  <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {["Lossless 24-bit", "Direct Creator", "Fan Club Enabled", "Hi-Res FLAC"].map(
                (tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="border-border/60 text-muted-foreground text-xs"
                  >
                    {tag}
                  </Badge>
                ),
              )}
            </div>

            <p className="mt-6 max-w-3xl text-sm text-muted-foreground leading-relaxed">
              {artist.bio}
            </p>
          </div>
        </div>

        {/* Memberships & Perks section */}
        <section className="mt-12">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Fan Club Memberships</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Support {artist.name} directly each month and unlock exclusive perks.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {DEFAULT_TIERS.map((tier) => {
              const isCurrent = activeTierId === tier.id;
              return (
                <div
                  key={tier.id}
                  className={cn(
                    "rounded-2xl border p-6 flex flex-col justify-between transition-all",
                    isCurrent
                      ? "border-amber bg-amber/5 shadow-lg shadow-amber/5"
                      : "border-border/60 bg-card hover:border-primary/40",
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                        {tier.name}
                        {tier.color === "amber" && <Sparkles className="h-4 w-4 text-amber" />}
                      </h3>
                      <div className="text-right">
                        <span className="text-xl font-extrabold text-foreground">
                          ${tier.priceMonthly.toFixed(2)}
                        </span>
                        <span className="text-xs text-muted-foreground"> / mo</span>
                      </div>
                    </div>

                    <ul className="space-y-2.5 my-4">
                      {tier.perks.map((perk, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-xs text-muted-foreground"
                        >
                          <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                          <span>{perk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button
                    onClick={() => {
                      setSelectedTier(tier);
                      setSubModalOpen(true);
                    }}
                    className={cn(
                      "w-full mt-4 font-bold text-xs",
                      isCurrent
                        ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                        : tier.color === "amber"
                          ? "bg-amber hover:bg-amber/90 text-black"
                          : "bg-primary hover:bg-primary/90 text-primary-foreground",
                    )}
                  >
                    {isCurrent
                      ? "✓ Active Membership"
                      : `Join for $${tier.priceMonthly.toFixed(2)}/mo`}
                  </Button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Discography */}
        <section className="mt-12">
          <h2 className="mb-6 text-2xl font-bold text-foreground">Releases & Singles</h2>
          {discography.length === 0 ? (
            <p className="text-muted-foreground">No releases yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {discography.map((track) => (
                <TrackCard key={track.id} track={track} />
              ))}
            </div>
          )}
        </section>

        {/* ── Top Supporters & Patronage Leaderboard ── */}
        <section className="mt-16 rounded-3xl border border-border/50 bg-card p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-6 mb-6">
            <div>
              <div className="flex items-center gap-2 text-primary text-xs font-bold mb-1">
                <Sparkles className="h-4 w-4" />
                <span>DIRECT FAN PATRONAGE & LEADERBOARD</span>
              </div>
              <h3 className="text-xl font-bold text-foreground">Top Backers & Supporters</h3>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                Fans directly funding independent studio releases. 100% of micro-tips flow
                straight to {artist.name}'s verified treasury.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                  Total Fan Support
                </span>
                <span className="font-mono text-xl font-extrabold text-emerald-400">
                  ${totalTipsUsd.toFixed(2)}
                </span>
              </div>

              <Button
                onClick={() => setTipModalOpen(true)}
                className="bg-primary text-primary-foreground font-bold text-xs rounded-full gap-1.5 h-10 px-5 shadow-lg shadow-primary/20"
              >
                <Gift className="h-4 w-4" /> Send Tip / Boost
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {artistTips.map((tip, idx) => (
              <div
                key={tip.id}
                className="rounded-2xl border border-border/40 bg-surface-raised/60 p-4 space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={tip.donorAvatar}
                        alt={tip.donorName}
                        className="h-8 w-8 rounded-full object-cover border border-border/60"
                      />
                      <div>
                        <span className="text-xs font-bold text-foreground block truncate max-w-[130px]">
                          {tip.donorName}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{tip.createdAt}</span>
                      </div>
                    </div>

                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs font-mono font-bold">
                      +${tip.amountUsd.toFixed(2)}
                    </Badge>
                  </div>

                  {tip.message && (
                    <p className="mt-3 text-xs text-foreground/90 italic bg-card/60 p-2.5 rounded-xl border border-border/30">
                      "{tip.message}"
                    </p>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-between text-[10px] font-mono text-muted-foreground border-t border-border/20">
                  <span>Method: {tip.paymentMethod === "sol" ? "Solana Web3" : "Direct Card"}</span>
                  <span className="text-primary font-bold">
                    {idx === 0 ? "★ Top Backer" : `Backer #${idx + 1}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Subscription Modal */}
      <Dialog open={subModalOpen} onOpenChange={setSubModalOpen}>
        <DialogContent className="max-w-md rounded-3xl border-border/60 bg-background/95 p-6 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
              <Crown className="h-5 w-5 text-amber" />
              <span>Join {artist.name}'s Fan Club</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="rounded-2xl border border-border/40 bg-surface-raised p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-foreground text-sm">{selectedTier.name}</p>
                  <p className="text-xs text-muted-foreground">Monthly subscription</p>
                </div>
                <p className="text-xl font-bold text-primary">
                  ${selectedTier.priceMonthly.toFixed(2)}/mo
                </p>
              </div>

              <div className="mt-3 border-t border-border/30 pt-3 space-y-1.5">
                {selectedTier.perks.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="h-3 w-3 text-emerald-400" />
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-xl bg-primary/10 p-3 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>85% of your subscription goes directly to {artist.name}. Cancel anytime.</span>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 border-border/60"
                onClick={() => setSubModalOpen(false)}
                disabled={subscribing}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-amber text-black hover:bg-amber/90 font-bold"
                onClick={handleSubscribe}
                disabled={subscribing}
              >
                {subscribing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {subscribing ? "Pledging..." : `Pledge $${selectedTier.priceMonthly.toFixed(2)}/mo`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fan Tip Modal */}
      <FanTipModal
        open={tipModalOpen}
        onOpenChange={setTipModalOpen}
        artistId={artist.id}
        artistName={artist.name}
        artistAvatar={artist.avatar}
        onTipSuccess={() => setArtistTips(getArtistTips(artist.id))}
      />
    </>
  );
}
