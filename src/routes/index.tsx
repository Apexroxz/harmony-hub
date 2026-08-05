import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Play, Radio, TrendingUp, Zap } from "lucide-react";
import { catalogQueryOptions } from "@/domain/music/queries";
import { formatNumber } from "@/domain/music/types";
import { TrackCard } from "@/components/TrackCard";
import { TrackGridSkeleton, LoadError } from "@/components/CatalogState";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

export const Route = createFileRoute("/")({
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(catalogQueryOptions());
  },
  head: () => ({
    meta: [
      { title: "SonicChain — Web3 Music Streaming" },
      { name: "description", content: "Discover, stream, and collect music NFTs on Solana." },
      { property: "og:title", content: "SonicChain — Web3 Music Streaming" },
      { property: "og:description", content: "Discover, stream, and collect music NFTs on Solana." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { data, isPending, error, refetch } = useQuery(catalogQueryOptions());
  const tracks = data?.tracks ?? [];
  const artists = data?.artists ?? [];
  const featured = tracks.slice(0, 3);
  const trending = tracks.slice(3, 6);

  return (
    <div className="pb-32">
      {/* Hero */}
      <section className="relative flex min-h-[520px] items-center justify-center overflow-hidden px-4 pt-16 sm:px-6 lg:px-8">
        <img
          src={heroBg}
          alt=""
          width={1920}
          height={1080}
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <Zap className="h-4 w-4" />
            <span>Powered by Solana</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Stream music.
            <br />
            <span className="text-gradient glow-text">Own the future.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Discover tracks stored on IPFS & Arweave, unlock token-gated exclusives, and support
            artists directly on-chain.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r from-violet to-cyan text-primary-foreground hover:opacity-90"
            >
              <Link to="/browse">
                <Play className="mr-2 h-5 w-5 fill-current" />
                Start Listening
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-border/60 bg-glass">
              <Link to="/browse">
                Explore Drops
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: "Tracks streamed", value: "2.4M", icon: Radio },
            { label: "Active collectors", value: "18.2K", icon: TrendingUp },
            { label: "Artist earnings", value: "142K SOL", icon: Zap },
          ].map((stat) => (
            <div
              key={stat.label}
              className="surface-raised flex items-center gap-4 rounded-2xl p-6"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Featured Drops</h2>
            <p className="mt-1 text-muted-foreground">Hand-picked releases from the network.</p>
          </div>
          <Link
            to="/browse"
            className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline sm:flex"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {isPending ? (
          <TrackGridSkeleton count={3} />
        ) : error ? (
          <LoadError message="We couldn't load the featured releases." onRetry={() => refetch()} />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((track) => (
              <TrackCard key={track.id} track={track} />
            ))}
          </div>
        )}
      </section>

      {/* Trending */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Trending Now</h2>
          <p className="mt-1 text-muted-foreground">What the community is collecting this week.</p>
        </div>
        {isPending ? (
          <TrackGridSkeleton count={3} />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {trending.map((track) => (
              <TrackCard key={track.id} track={track} />
            ))}
          </div>
        )}
      </section>

      {/* Artists */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="mb-8 text-2xl font-bold text-foreground sm:text-3xl">Featured Artists</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {artists.map((artist) => (
            <Link
              key={artist.id}
              to="/artist/$id"
              params={{ id: artist.id }}
              className="surface-raised flex items-center gap-4 rounded-2xl p-4 transition-colors hover:border-primary/40"
            >
              <img
                src={artist.avatar}
                alt={artist.name}
                width={64}
                height={64}
                className="h-16 w-16 rounded-full object-cover"
              />
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{artist.name}</p>
                <p className="text-sm text-muted-foreground">{formatNumber(artist.followers)} followers</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
