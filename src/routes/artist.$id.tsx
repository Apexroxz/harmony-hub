import { createFileRoute, notFound } from "@tanstack/react-router";
import { CheckCircle2, Users, Disc3 } from "lucide-react";
import { getArtistById, getTracksByArtist } from "@/domain/music/catalog";
import { formatNumber } from "@/domain/music/types";
import { TrackCard } from "@/components/TrackCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
          { name: "description", content: `Listen to ${loaderData.artist.name} on Layam.` },
          { property: "og:title", content: `${loaderData.artist.name} — Layam` },
          { property: "og:description", content: `Listen to ${loaderData.artist.name} on Layam.` },
          { property: "og:type", content: "profile" },
          { name: "twitter:card", content: "summary" },
        ]
      : [],
  }),
  component: ArtistPage,
});

function ArtistPage() {
  const { artist } = Route.useLoaderData();
  const discography = getTracksByArtist(artist.id);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-32 pt-24 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-3xl border border-border/40 bg-card">
        <div className="h-32 bg-gradient-to-r from-violet/30 to-cyan/30 sm:h-48" />
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
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{artist.name}</h1>
                {artist.verified && <CheckCircle2 className="h-6 w-6 text-cyan" />}
              </div>
              <p className="text-muted-foreground">{artist.handle}</p>
            </div>
            <div className="flex gap-3">
              <Button className="bg-gradient-to-r from-violet to-cyan text-primary-foreground hover:opacity-90">
                Follow
              </Button>
              <Button variant="outline" className="border-border/60 bg-glass">
                Tip Artist
              </Button>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Followers", value: formatNumber(artist.followers), icon: Users },
              { label: "Tracks", value: discography.length.toString(), icon: Disc3 },
              { label: "Total plays", value: "1.2M", icon: Disc3 },
              { label: "Collectors", value: "3.4K", icon: Users },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border/40 bg-surface-raised p-4">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {["Synthwave", "Electronic", "Web3", "NFT"].map((tag) => (
              <Badge key={tag} variant="outline" className="border-border/60 text-muted-foreground">
                {tag}
              </Badge>
            ))}
          </div>

          <p className="mt-6 max-w-3xl text-muted-foreground">{artist.bio}</p>
        </div>
      </div>

      <section className="mt-12">
        <h2 className="mb-6 text-2xl font-bold text-foreground">Discography</h2>
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
  );
}
