import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { tracks } from "@/domain/music/catalog";
import { TrackCard } from "@/components/TrackCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/browse")({
  head: () => ({
    meta: [
      { title: "Browse — Layam" },
      { name: "description", content: "Browse token-gated and open music on Layam." },
      { property: "og:title", content: "Browse — Layam" },
      { property: "og:description", content: "Browse token-gated and open music on Layam." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BrowsePage,
});

const genres = ["All", "Synthwave", "Cyberpunk", "Electropop", "Alt-Pop", "Bass", "Dubstep"];

function BrowsePage() {
  const [query, setQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");

  const filtered = tracks.filter((track) => {
    const matchesQuery =
      track.title.toLowerCase().includes(query.toLowerCase()) ||
      track.artistId.toLowerCase().includes(query.toLowerCase());
    const matchesGenre = selectedGenre === "All" || track.genre === selectedGenre;
    return matchesQuery && matchesGenre;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 pb-32 pt-24 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Browse</h1>
        <p className="mt-2 text-muted-foreground">Explore the catalog across storage layers and access tiers.</p>
      </div>

      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tracks, artists..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-border/60 bg-surface-raised pl-10 text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
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

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 py-24 text-center">
          <p className="text-lg font-medium text-foreground">No tracks found</p>
          <p className="text-sm text-muted-foreground">Try a different search or genre filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((track) => (
            <TrackCard key={track.id} track={track} />
          ))}
        </div>
      )}
    </div>
  );
}
