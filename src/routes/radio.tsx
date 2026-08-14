import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Radio,
  Sparkles,
  Play,
  Pause,
  Disc3,
  Flame,
  Moon,
  Zap,
  Coffee,
  Headphones,
  Signal,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { catalogQueryOptions } from "@/domain/music/queries";
import { tracks as fallbackCatalogTracks, artists as catalogArtists } from "@/domain/music/catalog";
import { formatNumber, type Track } from "@/domain/music/types";
import { usePlayer } from "@/lib/player";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import cover1 from "@/assets/covers/cover-1.jpg";
import cover2 from "@/assets/covers/cover-2.jpg";
import cover3 from "@/assets/covers/cover-3.jpg";
import cover4 from "@/assets/covers/cover-4.jpg";
import cover5 from "@/assets/covers/cover-5.jpg";
import cover6 from "@/assets/covers/cover-6.jpg";

export const Route = createFileRoute("/radio")({
  head: () => ({
    meta: [
      { title: "Universal Radio V1 — Layam" },
      {
        name: "description",
        content: "Continuous AI Mood, Genre, and Artist radio stations streaming lossless audio.",
      },
      { property: "og:title", content: "Universal Radio V1 — Layam" },
      {
        property: "og:description",
        content: "Continuous AI Mood, Genre, and Artist radio stations streaming lossless audio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RadioPage,
});

interface RadioStation {
  id: string;
  title: string;
  subtitle: string;
  category: "ai" | "genre" | "artist";
  icon: typeof Sparkles;
  coverImage: string;
  listeners: number;
  genreFilter?: string;
  artistFilter?: string;
  color: string;
}

const STATIONS: RadioStation[] = [
  // ── AI & Mood Discovery ──
  {
    id: "mood-late-night",
    title: "Late Night Drive",
    subtitle: "AI Mood Stream · Retro Synths & Neon Glow",
    category: "ai",
    icon: Moon,
    coverImage: cover1,
    listeners: 4230,
    genreFilter: "Synthwave",
    color: "from-orange/40 to-amber/30",
  },
  {
    id: "mood-focus-flow",
    title: "Deep Focus & Study",
    subtitle: "AI Mood Stream · Ambient Textures & Minimal Beats",
    category: "ai",
    icon: Coffee,
    coverImage: cover4,
    listeners: 8120,
    genreFilter: "Alt-Pop",
    color: "from-emerald-500/30 to-teal-500/20",
  },
  {
    id: "mood-cyber-rush",
    title: "Cyberpunk Energy",
    subtitle: "AI Mood Stream · Heavy Distortion & Fast BPM",
    category: "ai",
    icon: Zap,
    coverImage: cover2,
    listeners: 3190,
    genreFilter: "Cyberpunk",
    color: "from-rose-500/40 to-orange/30",
  },
  {
    id: "mood-euphoria",
    title: "Ethereal Euphoria",
    subtitle: "AI Mood Stream · Vocal Pop & Dreamy Melodies",
    category: "ai",
    icon: Sparkles,
    coverImage: cover3,
    listeners: 6420,
    genreFilter: "Electropop",
    color: "from-violet/40 to-primary/30",
  },

  // ── 24/7 Genre Stations ──
  {
    id: "genre-synthwave",
    title: "Synthwave 24/7",
    subtitle: "Continuous Vintage Synthesizers & Analog Warmth",
    category: "genre",
    icon: Flame,
    coverImage: cover1,
    listeners: 11400,
    genreFilter: "Synthwave",
    color: "from-orange/30 to-rose-500/30",
  },
  {
    id: "genre-bass",
    title: "Deep Bass & Club",
    subtitle: "Sub-bass frequencies and warehouse dubs",
    category: "genre",
    icon: Headphones,
    coverImage: cover5,
    listeners: 5310,
    genreFilter: "Bass",
    color: "from-amber/30 to-primary/20",
  },
  {
    id: "genre-dubstep",
    title: "Heavy Dubstep Radio",
    subtitle: "Aggressive drops and rhythmic modular synths",
    category: "genre",
    icon: Zap,
    coverImage: cover6,
    listeners: 2980,
    genreFilter: "Dubstep",
    color: "from-red-500/30 to-amber/30",
  },

  // ── Artist Stations ──
  {
    id: "artist-neon-drifter",
    title: "Neon Drifter Radio",
    subtitle: "Seeded by @neondrifter discography & similar artists",
    category: "artist",
    icon: Disc3,
    coverImage: cover1,
    listeners: 7890,
    artistFilter: "neon-drifter",
    color: "from-primary/40 to-amber/30",
  },
  {
    id: "artist-solana-siren",
    title: "Solana Siren Radio",
    subtitle: "Seeded by @solanasiren & melodic electronica",
    category: "artist",
    icon: Disc3,
    coverImage: cover3,
    listeners: 9240,
    artistFilter: "solana-siren",
    color: "from-amber/40 to-primary/30",
  },
  {
    id: "artist-byte-bass",
    title: "Byte Bass Radio",
    subtitle: "Seeded by @bytebass & underground low-end",
    category: "artist",
    icon: Disc3,
    coverImage: cover5,
    listeners: 3410,
    artistFilter: "byte-bass",
    color: "from-orange/40 to-red-500/30",
  },
];

function RadioPage() {
  const { data } = useQuery(catalogQueryOptions());
  const allTracks: Track[] = data?.tracks && data.tracks.length > 0 ? data.tracks : fallbackCatalogTracks;
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();

  const [activeStationId, setActiveStationId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<"all" | "ai" | "genre" | "artist">("all");

  const handleTuneIn = (station: RadioStation) => {
    // Filter queue matching station parameters or seed with full catalog shuffled
    let stationQueue = allTracks.filter((t) => {
      if (station.genreFilter) {
        return t.genre.toLowerCase() === station.genreFilter.toLowerCase();
      }
      if (station.artistFilter) {
        return t.artistId === station.artistFilter || t.artistName.toLowerCase().includes(station.artistFilter);
      }
      return true;
    });

    if (stationQueue.length === 0) {
      stationQueue = [...allTracks].sort(() => 0.5 - Math.random());
    }

    const firstTrack = stationQueue[0];
    setActiveStationId(station.id);
    playTrack(firstTrack, stationQueue);

    toast.success(`Tuned in to ${station.title}`, {
      description: `Streaming continuous lossless queue (${stationQueue.length} station tracks).`,
    });
  };

  const filteredStations = STATIONS.filter(
    (s) => selectedCategory === "all" || s.category === selectedCategory
  );

  return (
    <div className="mx-auto max-w-7xl px-4 pb-36 pt-24 sm:px-6 lg:px-8">
      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-card p-8 sm:p-12 mb-10">
        <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-primary/10 via-amber/5 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary mb-4">
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            <span>UNIVERSAL RADIO V1</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Continuous Music, <br />
            <span className="text-gradient glow-text">Zero Interruptions.</span>
          </h1>

          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            Tune into AI mood-driven discovery streams, continuous 24/7 genre frequencies, or infinite artist-seeded radio sessions in bit-perfect lossless audio.
          </p>

          <div className="mt-6 flex flex-wrap gap-2.5">
            {[
              { id: "all", label: "All Stations" },
              { id: "ai", label: "🤖 AI Mood Radio" },
              { id: "genre", label: "⚡ Genre 24/7" },
              { id: "artist", label: "🎨 Artist Radios" },
            ].map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat.id as any)}
                className={cn(
                  "rounded-full text-xs font-bold transition-all",
                  selectedCategory === cat.id
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "border-border/60 bg-glass text-muted-foreground hover:text-foreground"
                )}
              >
                {cat.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Stations Grid ── */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredStations.map((station) => {
          const isTunedIn = activeStationId === station.id;
          return (
            <div
              key={station.id}
              className={cn(
                "group relative overflow-hidden rounded-2xl border p-5 transition-all flex flex-col justify-between",
                isTunedIn
                  ? "border-primary bg-primary/5 shadow-xl shadow-primary/5"
                  : "border-border/40 bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
              )}
            >
              <div>
                {/* Station Cover & Live Badge */}
                <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted mb-4">
                  <img
                    src={station.coverImage}
                    alt={station.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className={cn("absolute inset-0 bg-gradient-to-t opacity-70", station.color)} />

                  <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-white">
                    <Signal className="h-3 w-3 text-primary animate-pulse" />
                    <span>LIVE · {formatNumber(station.listeners)} tuning in</span>
                  </div>

                  <button
                    onClick={() => handleTuneIn(station)}
                    className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Tune in to ${station.title}`}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition-transform hover:scale-110">
                      <Play className="h-6 w-6 fill-current ml-0.5" />
                    </div>
                  </button>
                </div>

                {/* Station Info */}
                <div className="flex items-center gap-2 text-primary text-xs font-bold mb-1">
                  <station.icon className="h-3.5 w-3.5" />
                  <span className="uppercase tracking-wider">
                    {station.category === "ai"
                      ? "AI Adaptive Station"
                      : station.category === "genre"
                      ? "Genre Continuous"
                      : "Artist Discography"}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                  {station.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {station.subtitle}
                </p>
              </div>

              {/* Tune In Action */}
              <div className="mt-5 pt-3 border-t border-border/30 flex items-center justify-between">
                <Badge variant="outline" className="border-border/60 text-[10px] text-muted-foreground">
                  24-bit FLAC Stream
                </Badge>

                <Button
                  size="sm"
                  onClick={() => handleTuneIn(station)}
                  className={cn(
                    "h-8 text-xs font-bold gap-1.5 rounded-full",
                    isTunedIn
                      ? "bg-emerald-500 text-white hover:bg-emerald-600"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  {isTunedIn ? (
                    <>
                      <Radio className="h-3.5 w-3.5 animate-pulse" />
                      <span>On Air</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 fill-current" />
                      <span>Tune In</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
