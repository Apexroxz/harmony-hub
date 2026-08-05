import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Play, Pause, Lock, LockOpen, Share2, Heart } from "lucide-react";
import { getTrackById, getArtistById, tracks } from "@/domain/music/catalog";
import { formatDuration } from "@/domain/music/types";
import { storageLabel } from "@/domain/ownership/types";
import { useOwnership } from "@/hooks/useOwnership";
import { usePlayer } from "@/lib/player";
import { TrackCard } from "@/components/TrackCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/track/$id")({
  loader: ({ params }) => {
    const track = getTrackById(params.id);
    if (!track) throw notFound();
    return { track };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.track.title} — Layam` },
          { name: "description", content: `Stream ${loaderData.track.title} on Layam.` },
          { property: "og:title", content: `${loaderData.track.title} — Layam` },
          { property: "og:description", content: `Stream ${loaderData.track.title} on Layam.` },
          { property: "og:type", content: "music.song" },
          { name: "twitter:card", content: "summary_large_image" },
        ]
      : [],
  }),
  component: TrackPage,
});

function TrackPage() {
  const { track } = Route.useLoaderData();
  const artist = getArtistById(track.artistId);
  const { currentTrack, isPlaying, playTrack } = usePlayer();
  const { ownership, tokenGated, locked } = useOwnership(track.id);

  const isCurrent = currentTrack?.id === track.id;
  const similar = tracks.filter((t: typeof track) => t.id !== track.id && (t.genre === track.genre || t.artistId === track.artistId)).slice(0, 3);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-32 pt-24 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-3xl border border-border/40 bg-card">
        <div className="grid gap-8 p-6 lg:grid-cols-[400px_1fr] lg:p-10">
          <div className="relative aspect-square overflow-hidden rounded-2xl">
            <img
              src={track.coverImage}
              alt={track.title}
              width={400}
              height={400}
              className="h-full w-full object-cover"
            />
            {locked && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-md">
                <Lock className="h-12 w-12 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">Connect wallet to play</p>
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="bg-surface-raised text-foreground">
                {track.genre}
              </Badge>
              <Badge variant="outline" className="border-border/60 font-mono text-xs uppercase text-muted-foreground">
                {ownership ? storageLabel(ownership.storageProvider) : "Streaming"}
              </Badge>
              {tokenGated && (
                <Badge className={cn("gap-1", locked ? "bg-destructive/10 text-destructive" : "bg-accent/10 text-accent")}>
                  {locked ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
                  {locked ? "Locked" : "Unlocked"}
                </Badge>
              )}
            </div>

            <h1 className="text-3xl font-bold text-foreground sm:text-5xl">{track.title}</h1>
            <Link
              to="/artist/$id"
              params={{ id: track.artistId }}
              className="mt-2 text-lg text-muted-foreground hover:text-primary"
            >
              {track.artistName}
            </Link>

            <p className="mt-6 max-w-xl text-muted-foreground">
              {artist?.bio || "A Web3-native release stored on decentralized infrastructure."}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button
                size="lg"
                disabled={locked}
                onClick={() => playTrack(track)}
                className="bg-gradient-to-r from-violet to-cyan text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {isCurrent && isPlaying ? (
                  <Pause className="mr-2 h-5 w-5 fill-current" />
                ) : (
                  <Play className="mr-2 h-5 w-5 fill-current" />
                )}
                {isCurrent && isPlaying ? "Pause" : "Play"}
              </Button>
              <Button variant="outline" size="lg" className="border-border/60 bg-glass">
                <Heart className="mr-2 h-5 w-5" />
                Collect
              </Button>
              <Button variant="ghost" size="icon" className="h-12 w-12 text-muted-foreground hover:text-foreground">
                <Share2 className="h-5 w-5" />
              </Button>
            </div>

            {ownership?.tokenGated && ownership.price != null && (
              <div className="mt-6 rounded-xl border border-border/40 bg-surface-raised p-4">
                <p className="text-sm text-muted-foreground">Token-gated access</p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {ownership.price} SOL
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    via {ownership.tokenAddress?.slice(0, 12)}...
                  </span>
                </p>
              </div>
            )}

            <div className="mt-8 grid grid-cols-3 gap-4 text-sm">
              <div className="rounded-xl border border-border/40 bg-surface-raised p-4">
                <p className="text-muted-foreground">Duration</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{formatDuration(track.duration)}</p>
              </div>
              <div className="rounded-xl border border-border/40 bg-surface-raised p-4">
                <p className="text-muted-foreground">Plays</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{track.playCount.toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-border/40 bg-surface-raised p-4">
                <p className="text-muted-foreground">Released</p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {new Date(track.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Similar tracks */}
      <section className="mt-12">
        <h2 className="mb-6 text-2xl font-bold text-foreground">More like this</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {similar.map((t) => (
            <TrackCard key={t.id} track={t} />
          ))}
        </div>
      </section>
    </div>
  );
}
