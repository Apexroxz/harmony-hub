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
      { title: "Layam — Music, without boundaries." },
      { name: "description", content: "Discover music, upload your own tracks, and enjoy one seamless library across streaming and local playback." },
      { property: "og:title", content: "Layam — Music, without boundaries." },
      { property: "og:description", content: "Discover music, upload your own tracks, and enjoy one seamless library across streaming and local playback." },
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
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary">
            <Radio className="h-3.5 w-3.5" />
            <span>Hybrid Local + Lossless Streaming Player</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Music,
            <br />
            <span className="text-gradient glow-text">without boundaries.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Experience bit-perfect lossless playback, 10-band DSP equalization, DRM-free creator commerce, and offline-first listening.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-lg shadow-primary/20"
            >
              <Link to="/store">
                <Play className="mr-2 h-5 w-5 fill-current" />
                Explore Store
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-border/60 bg-glass text-foreground hover:text-primary">
              <Link to="/upload">
                Upload Master
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
            { label: "Catalog Masters", value: formatNumber(tracks.length), icon: Radio },
            { label: "Verified Artists", value: formatNumber(artists.length), icon: TrendingUp },
            {
              label: "Accumulated Plays",
              value: formatNumber(tracks.reduce((sum, t) => sum + (t.playCount ?? 0), 0)),
              icon: Zap,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="surface-raised flex items-center gap-4 rounded-2xl p-6 border border-border/40"
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
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Featured Music</h2>
            <p className="mt-1 text-muted-foreground">Hand-picked tracks and releases to discover.</p>
          </div>
          <Link
            to="/store"
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
          <p className="mt-1 text-muted-foreground">What listeners are discovering and playing this week.</p>
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
