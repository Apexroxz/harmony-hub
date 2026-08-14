import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Users,
  CheckCircle2,
  Sparkles,
  Music2,
  Disc3,
  Search,
  ArrowRight,
  Heart,
  Radio,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { catalogQueryOptions } from "@/domain/music/queries";
import { artists as fallbackArtists, tracks as fallbackTracks } from "@/domain/music/catalog";
import { formatNumber, type Artist } from "@/domain/music/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/artists")({
  head: () => ({
    meta: [
      { title: "Artists & Creators — Layam" },
      { name: "description", content: "Discover independent music creators and artists on Layam." },
      { property: "og:title", content: "Artists & Creators — Layam" },
      {
        property: "og:description",
        content: "Discover independent music creators and artists on Layam.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ArtistsDirectoryPage,
});

function ArtistsDirectoryPage() {
  const { data } = useQuery(catalogQueryOptions());
  const allArtists: Artist[] =
    data?.artists && data.artists.length > 0 ? data.artists : fallbackArtists;
  const allTracks = data?.tracks && data.tracks.length > 0 ? data.tracks : fallbackTracks;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string>("All");

  const genres = ["All", "Synthwave", "Cyberpunk", "Electropop", "Bass", "Dubstep"];

  const filteredArtists = allArtists.filter((artist) => {
    const matchesSearch =
      artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      artist.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (artist.bio && artist.bio.toLowerCase().includes(searchQuery.toLowerCase()));

    const artistTracks = allTracks.filter((t) => t.artistId === artist.id);
    const matchesGenre =
      selectedGenre === "All" ||
      artistTracks.some((t) => t.genre.toLowerCase() === selectedGenre.toLowerCase());

    return matchesSearch && matchesGenre;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 pb-36 pt-24 sm:px-6 lg:px-8">
      {/* ── Banner Header ── */}
      <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-card p-8 sm:p-12 mb-10">
        <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-primary/10 via-amber/5 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary mb-4">
            <Users className="h-3.5 w-3.5" />
            <span>INDEPENDENT CREATOR ROSTER</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Meet the Artists <br />
            <span className="text-gradient glow-text">Building Soundscapes.</span>
          </h1>

          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            Discover verified independent music producers. Follow their releases, subscribe to fan
            clubs, and collect master editions.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search artists or handles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-full text-xs h-9"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {genres.map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGenre(g)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold transition-all",
                    selectedGenre === g
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "border border-border/60 bg-surface-raised text-muted-foreground hover:text-foreground",
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Artists Grid ── */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredArtists.map((artist) => {
          const artistTracks = allTracks.filter((t) => t.artistId === artist.id);
          return (
            <div
              key={artist.id}
              className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card p-6 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src={artist.avatar}
                    alt={artist.name}
                    className="h-16 w-16 rounded-2xl border-2 border-border/50 object-cover shadow-md group-hover:scale-105 transition-transform"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-base text-foreground truncate group-hover:text-primary transition-colors">
                        {artist.name}
                      </h3>
                      {artist.verified && (
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{artist.handle}</p>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {formatNumber(artist.followers)}
                      </span>{" "}
                      followers
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-4">
                  {artist.bio || "Independent artist crafting electronic soundscapes on Layam."}
                </p>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {Array.from(new Set(artistTracks.map((t) => t.genre))).map((genre) => (
                    <Badge
                      key={genre}
                      variant="outline"
                      className="border-border/60 text-[10px] text-muted-foreground"
                    >
                      {genre}
                    </Badge>
                  ))}
                  <Badge
                    variant="outline"
                    className="border-primary/30 text-[10px] text-primary font-mono font-bold"
                  >
                    {artistTracks.length} Releases
                  </Badge>
                </div>
              </div>

              <div className="pt-4 border-t border-border/30 flex items-center justify-between">
                <Link to="/artist/$id" params={{ id: artist.id }} className="w-full">
                  <Button
                    size="sm"
                    className="w-full rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground text-xs font-bold gap-1.5 transition-colors"
                  >
                    <span>View Profile & Discography</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
