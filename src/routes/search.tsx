import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Search as SearchIcon, Music2, Users, Disc3, Globe, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { catalogQueryOptions, searchQueryOptions } from "@/domain/music/queries";
import { TrackCard } from "@/components/TrackCard";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Track } from "@/domain/music/types";

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): { q?: string | undefined } => {
    const raw = search["q"];
    const query = typeof raw === "string" ? raw : undefined;
    return { q: query };
  },
  head: () => ({
    meta: [
      { title: "Search — Layam" },
      { name: "description", content: "Search songs and artists across Audius, Jamendo, and your Layam catalog in real-time." },
      { property: "og:title", content: "Search — Layam" },
      { property: "og:description", content: "Search songs and artists across the Layam catalog." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SearchPage,
});

// Debounce helper
function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

type SearchTab = "all" | "audius" | "jamendo";

function SourceBadge({ source }: { source: "audius" | "jamendo" | "local" }) {
  if (source === "audius") {
    return (
      <span className="flex-shrink-0 rounded-full border border-primary/20 bg-primary/6 px-1.5 py-0.5 text-[9px] font-bold text-primary">
        AUDIUS
      </span>
    );
  }
  if (source === "jamendo") {
    return (
      <span className="flex-shrink-0 rounded-full border border-emerald-500/20 bg-emerald-500/6 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
        JAMENDO
      </span>
    );
  }
  return null;
}

function getTrackSource(track: Track): "audius" | "jamendo" | "local" {
  if (track.id.startsWith("audius-"))  return "audius";
  if (track.id.startsWith("jamendo-")) return "jamendo";
  return "local";
}

function SearchPage() {
  const navigate  = useNavigate();
  const { q }     = Route.useSearch();
  const [query,   setQuery]   = useState(q ?? "");
  const [tab,     setTab]     = useState<SearchTab>("all");

  const debounced = useDebounced(query, 400);

  useEffect(() => { setQuery(q ?? ""); }, [q]);

  // In-memory catalog search (already loaded)
  const { data: catalog } = useQuery(catalogQueryOptions());

  // External live search (Audius + Jamendo)
  const { data: external, isFetching: isSearching } = useQuery(
    searchQueryOptions(debounced)
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void navigate({ to: "/search", search: { q: query.trim() } });
  };

  const normalizedQuery = debounced.trim().toLowerCase();

  // Merge + deduplicate results
  const allTracks = useMemo<Track[]>(() => {
    if (!normalizedQuery) return [];

    // From cached catalog
    const catalogHits = (catalog?.tracks ?? []).filter((t) => {
      const title  = t.title.toLowerCase();
      const artist = t.artistName.toLowerCase();
      const genre  = t.genre.toLowerCase();
      return (
        title.includes(normalizedQuery) ||
        artist.includes(normalizedQuery) ||
        genre.includes(normalizedQuery)
      );
    });

    // From live search
    const externalHits = external?.tracks ?? [];

    // Merge, external-first (Audius + Jamendo), then catalog
    const seen = new Set<string>();
    const merged: Track[] = [];
    for (const t of [...externalHits, ...catalogHits]) {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        merged.push(t);
      }
    }
    return merged;
  }, [normalizedQuery, catalog, external]);

  const allArtists = useMemo(() => {
    if (!normalizedQuery) return [];
    const sources = [
      ...(catalog?.artists ?? []),
      ...(external?.artists ?? []),
    ];
    const seen = new Set<string>();
    return sources.filter((a) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return (
        a.name.toLowerCase().includes(normalizedQuery) ||
        a.handle.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [normalizedQuery, catalog, external]);

  const tabTracks = useMemo<Track[]>(() => {
    if (tab === "audius")  return allTracks.filter((t) => t.id.startsWith("audius-"));
    if (tab === "jamendo") return allTracks.filter((t) => t.id.startsWith("jamendo-"));
    return allTracks;
  }, [allTracks, tab]);

  const hasResults = allTracks.length > 0 || allArtists.length > 0;
  const audiusCount  = allTracks.filter((t) => t.id.startsWith("audius-")).length;
  const jamendoCount = allTracks.filter((t) => t.id.startsWith("jamendo-")).length;
  const otherCount   = allTracks.length - audiusCount - jamendoCount;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-32 pt-20 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Search</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Searches Audius Web3, Jamendo Creative Commons, and your catalog live.
        </p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSubmit} className="relative mb-8 max-w-xl">
        <SearchIcon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search songs, artists, genres…"
          className="h-12 rounded-full border-border/40 bg-surface-raised pl-11 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary/50"
          autoFocus
        />
        {isSearching && (
          <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />
        )}
      </form>

      {/* Source tabs — visible only when there are results */}
      {hasResults && (
        <div className="mb-6 flex items-center gap-1 border-b border-border/30 pb-px">
          {(
            [
              { key: "all",     label: `All (${allTracks.length})` },
              { key: "audius",  label: `Audius (${audiusCount})`,  icon: Globe   },
              { key: "jamendo", label: `Jamendo (${jamendoCount})`,icon: Disc3   },
            ] as Array<{ key: SearchTab; label: string; icon?: React.ElementType }>
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "flex items-center gap-1.5 rounded-t-md border-b-2 px-4 py-2 text-xs font-semibold transition-colors",
                tab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {Icon && <Icon className="h-3 w-3" />}
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Empty / loading state */}
      {!normalizedQuery && (
        <div className="rounded-2xl border border-dashed border-border/30 p-12 text-center text-sm text-muted-foreground">
          Type to search across Audius, Jamendo, and your uploaded tracks.
        </div>
      )}

      {normalizedQuery && !hasResults && !isSearching && (
        <div className="rounded-2xl border border-dashed border-border/30 py-16 text-center">
          <p className="text-base font-semibold text-foreground">No results for &ldquo;{debounced}&rdquo;</p>
          <p className="mt-1 text-sm text-muted-foreground">Try a different search term.</p>
        </div>
      )}

      {normalizedQuery && isSearching && !hasResults && (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Searching Audius &amp; Jamendo…
        </div>
      )}

      {/* Results */}
      {hasResults && (
        <div className="space-y-10">
          {/* Tracks */}
          {tabTracks.length > 0 && (
            <section>
              <div className="mb-5 flex items-center gap-2">
                <Music2 className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Songs</h2>
                <span className="text-xs text-muted-foreground">({tabTracks.length})</span>
                {otherCount > 0 && tab === "all" && (
                  <span className="text-[10px] text-muted-foreground">· {otherCount} from your library</span>
                )}
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {tabTracks.map((track) => (
                  <div key={track.id} className="relative">
                    <TrackCard track={track} />
                    {/* Source badge overlay */}
                    <div className="absolute left-2.5 top-2.5 z-10">
                      <SourceBadge source={getTrackSource(track)} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Artists — only in "all" tab */}
          {tab === "all" && allArtists.length > 0 && (
            <section>
              <div className="mb-5 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Artists</h2>
                <span className="text-xs text-muted-foreground">({allArtists.length})</span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {allArtists.map((artist) => (
                  <Link
                    key={artist.id}
                    to="/artist/$id"
                    params={{ id: artist.id }}
                    className="flex items-center gap-4 rounded-2xl border border-border/30 bg-card p-4 transition-colors hover:border-primary/30 hover:bg-surface-raised"
                  >
                    <img
                      src={artist.avatar}
                      alt={artist.name}
                      className="h-14 w-14 rounded-full object-cover ring-1 ring-border/30"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-foreground">{artist.name}</p>
                      <p className="truncate text-sm text-muted-foreground">{artist.handle}</p>
                    </div>
                    {artist.id.startsWith("audius-")  && <SourceBadge source="audius"  />}
                    {artist.id.startsWith("jamendo-") && <SourceBadge source="jamendo" />}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
