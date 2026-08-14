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
import { getArtistById, getTracksByArtist } from "@/domain/music/catalog";
import { formatNumber, type CreatorTier, type Track } from "@/domain/music/types";
import { useWallet } from "@/lib/wallet";
import { useAuth } from "@/lib/auth";
import { TrackCard } from "@/components/TrackCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/artist/$id")({
  loader: ({ params }) => {
    const artist = getArtistById(params.id);
    if (!artist) throw notFound();
    return { artist };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.artist.name} — Layam` },
          { name: "description", content: `Listen to ${loaderData.artist.name} and join the fan club on Layam.` },
          { property: "og:title", content: `${loaderData.artist.name} — Layam` },
          { property: "og:description", content: `Listen to ${loaderData.artist.name} and join the fan club on Layam.` },
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

function getSubscriptions(): Record<string, string> {
  try {
    const stored = sessionStorage.getItem("layam_artist_subscriptions");
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveSubscription(artistId: string, tierId: string) {
  const current = getSubscriptions();
  current[artistId] = tierId;
  sessionStorage.setItem("layam_artist_subscriptions", JSON.stringify(current));
}

function ArtistPage() {
  const { artist } = Route.useLoaderData();
  const discography = getTracksByArtist(artist.id);
  const { user } = useAuth();
  const wallet = useWallet();

  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(artist.followers || 12400);
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [tipModalOpen, setTipModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<CreatorTier>(DEFAULT_TIERS[0]);
  const [tipAmount, setTipAmount] = useState("5.00");
  const [subscribing, setSubscribing] = useState(false);
  const [tipping, setTipping] = useState(false);
  const [activeTierId, setActiveTierId] = useState<string | null>(null);

  useEffect(() => {
    const subs = getSubscriptions();
    if (subs[artist.id]) {
      setActiveTierId(subs[artist.id]);
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
      saveSubscription(artist.id, selectedTier.id);
      setActiveTierId(selectedTier.id);
      setSubscribing(false);
      setSubModalOpen(false);
      toast.success(`Welcome to ${artist.name}'s ${selectedTier.name}!`, {
        description: `Your $${selectedTier.priceMonthly.toFixed(2)}/mo membership is active.`,
      });
    }, 900);
  };

  const handleSendTip = () => {
    const amt = parseFloat(tipAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid tip amount.");
      return;
    }
    setTipping(true);
    setTimeout(() => {
      setTipping(false);
      setTipModalOpen(false);
      toast.success(`Tip sent to ${artist.name}!`, {
        description: `Thank you for supporting independent music with $${amt.toFixed(2)}.`,
      });
    }, 800);
  };

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
                  {activeTierId && (
                    <Badge className="bg-amber text-black font-bold flex items-center gap-1">
                      <Crown className="h-3 w-3 fill-current" />
                      {activeTierId === "vip" ? "VIP MEMBER" : "SUPPORTER"}
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">{artist.handle}</p>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <Button
                  onClick={handleToggleFollow}
                  variant={following ? "outline" : "default"}
                  className={cn(
                    "font-bold transition-all",
                    following ? "border-border/60 text-muted-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90"
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
              </div>
            </div>

            {/* Real-time stats computed from artist catalog */}
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {[
                { label: "Followers", value: formatNumber(followerCount), icon: Users },
                { label: "Catalog Releases", value: discography.length.toString(), icon: Disc3 },
                { label: "Total Streams", value: formatNumber(totalPlays), icon: Disc3 },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-border/40 bg-surface-raised p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <stat.icon className="h-3.5 w-3.5 text-primary/70" />
                  </div>
                  <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {["Lossless 24-bit", "Direct Creator", "Fan Club Enabled", "Hi-Res FLAC"].map((tag) => (
                <Badge key={tag} variant="outline" className="border-border/60 text-muted-foreground text-xs">
                  {tag}
                </Badge>
              ))}
            </div>

            <p className="mt-6 max-w-3xl text-sm text-muted-foreground leading-relaxed">{artist.bio}</p>
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
                      : "border-border/60 bg-card hover:border-primary/40"
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                        {tier.name}
                        {tier.color === "amber" && <Sparkles className="h-4 w-4 text-amber" />}
                      </h3>
                      <div className="text-right">
                        <span className="text-xl font-extrabold text-foreground">${tier.priceMonthly.toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground"> / mo</span>
                      </div>
                    </div>

                    <ul className="space-y-2.5 my-4">
                      {tier.perks.map((perk, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
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
                        : "bg-primary hover:bg-primary/90 text-primary-foreground"
                    )}
                  >
                    {isCurrent ? "✓ Active Membership" : `Join for $${tier.priceMonthly.toFixed(2)}/mo`}
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
                <p className="text-xl font-bold text-primary">${selectedTier.priceMonthly.toFixed(2)}/mo</p>
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

      {/* Tip Modal */}
      <Dialog open={tipModalOpen} onOpenChange={setTipModalOpen}>
        <DialogContent className="max-w-sm rounded-3xl border-border/60 bg-background/95 p-6 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Gift className="h-5 w-5 text-primary" />
              <span>Tip {artist.name}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">
              Send an instant direct donation to show appreciation for their music.
            </p>

            <div className="grid grid-cols-4 gap-2">
              {["2.00", "5.00", "10.00", "25.00"].map((amt) => (
                <Button
                  key={amt}
                  type="button"
                  variant={tipAmount === amt ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTipAmount(amt)}
                  className={cn(
                    "text-xs font-bold",
                    tipAmount === amt ? "bg-primary text-primary-foreground" : "border-border/60"
                  )}
                >
                  ${amt}
                </Button>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 border-border/60"
                onClick={() => setTipModalOpen(false)}
                disabled={tipping}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
                onClick={handleSendTip}
                disabled={tipping}
              >
                {tipping && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {tipping ? "Sending..." : `Tip $${tipAmount}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
