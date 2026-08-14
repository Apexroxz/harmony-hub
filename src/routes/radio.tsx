import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Radio,
  Play,
  Pause,
  Disc3,
  Flame,
  Volume2,
  Signal,
  Headphones,
  Globe2,
  Sparkles,
  Layers,
  Sliders,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { catalogQueryOptions } from "@/domain/music/queries";
import { tracks as fallbackCatalogTracks, artists as catalogArtists } from "@/domain/music/catalog";
import { formatNumber, type Track, type AudioFormat } from "@/domain/music/types";
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
      { title: "Universal Radio — Layam" },
      {
        name: "description",
        content: "Live internet radio stations, FM/web streams, and continuous genre frequencies.",
      },
      { property: "og:title", content: "Universal Radio — Layam" },
      {
        property: "og:description",
        content: "Live internet radio stations, FM/web streams, and continuous genre frequencies.",
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
  locationOrGenre: string;
  category: "live_web" | "genre" | "artist";
  streamType: "icecast_live" | "catalog_queue";
  streamUrl?: string;
  bitrateLabel: string;
  coverImage: string;
  genreFilter?: string;
  artistFilter?: string;
  color: string;
  description: string;
}

const REAL_RADIO_STATIONS: RadioStation[] = [
  // ── 1. Live FM & Web Broadcast Stations (Real Live Streams) ──
  {
    id: "live-groove-salad",
    title: "Groove Salad",
    locationOrGenre: "San Francisco, CA · Live Broadcast",
    category: "live_web",
    streamType: "icecast_live",
    streamUrl: "https://ice1.somafm.com/groovesalad-128-mp3",
    bitrateLabel: "128 kbps MP3 · Live Stream",
    coverImage: cover4,
    color: "from-emerald-500/30 to-teal-500/20",
    description:
      "A nicely chilled plate of ambient/downtempo beats and grooves. Commercial-free broadcast.",
  },
  {
    id: "live-defcon",
    title: "DEF CON Radio",
    locationOrGenre: "Las Vegas, NV · Live Broadcast",
    category: "live_web",
    streamType: "icecast_live",
    streamUrl: "https://ice1.somafm.com/defcon-128-mp3",
    bitrateLabel: "128 kbps MP3 · Live Stream",
    coverImage: cover2,
    color: "from-orange/30 to-rose-500/30",
    description:
      "Music for hacking and high-tech electronic underground. Streaming direct from DEF CON.",
  },
  {
    id: "live-drone-zone",
    title: "Drone Zone",
    locationOrGenre: "Global Spacefeed · Live Broadcast",
    category: "live_web",
    streamType: "icecast_live",
    streamUrl: "https://ice1.somafm.com/dronezone-128-mp3",
    bitrateLabel: "128 kbps MP3 · Atmospheric",
    coverImage: cover1,
    color: "from-violet/40 to-primary/30",
    description:
      "Served best chilled, safe with most medications. Atmospheric textures and space ambient.",
  },
  {
    id: "live-secret-agent",
    title: "Secret Agent Radio",
    locationOrGenre: "Lounge & Spy · Live Broadcast",
    category: "live_web",
    streamType: "icecast_live",
    streamUrl: "https://ice1.somafm.com/secretagent-128-mp3",
    bitrateLabel: "128 kbps MP3 · Trip-Hop / Spy",
    coverImage: cover3,
    color: "from-amber/30 to-primary/20",
    description:
      "The soundtrack for your stylish, mysterious life. An eclectic blend of spy, lounge, and trip-hop.",
  },

  // ── 2. Genre Radio Frequencies (Catalog Stream) ──
  {
    id: "genre-synthwave-continuous",
    title: "Synthwave Master Stream",
    locationOrGenre: "Genre Radio · Lossless Audio",
    category: "genre",
    streamType: "catalog_queue",
    bitrateLabel: "24-bit FLAC / WAV · Master Quality",
    coverImage: cover1,
    genreFilter: "Synthwave",
    color: "from-orange/30 to-amber/30",
    description:
      "Continuous retro-future analog synths, arpeggios, and driving basslines from verified indie creators.",
  },
  {
    id: "genre-cyberpunk-continuous",
    title: "Cyberpunk Frequency",
    locationOrGenre: "Genre Radio · Lossless Audio",
    category: "genre",
    streamType: "catalog_queue",
    bitrateLabel: "24-bit / 96kHz · Lossless Stream",
    coverImage: cover2,
    genreFilter: "Cyberpunk",
    color: "from-rose-500/40 to-orange/30",
    description: "High-octane modular synth distortion and dark industrial rhythms.",
  },
  {
    id: "genre-bass-continuous",
    title: "Deep Bass & Dubs",
    locationOrGenre: "Genre Radio · Lossless Audio",
    category: "genre",
    streamType: "catalog_queue",
    bitrateLabel: "1411 kbps ALAC · Lossless Stream",
    coverImage: cover5,
    genreFilter: "Bass",
    color: "from-amber/40 to-red-500/30",
    description: "Low-end experiments, club dubs, and sub-bass resonance.",
  },

  // ── 3. Artist Radio Stations ──
  {
    id: "artist-radio-neon",
    title: "Neon Drifter Radio",
    locationOrGenre: "Artist Radio · Seeded Stream",
    category: "artist",
    streamType: "catalog_queue",
    bitrateLabel: "Lossless Master Queue",
    coverImage: cover1,
    artistFilter: "neon-drifter",
    color: "from-primary/40 to-amber/30",
    description:
      "Endless queue inspired by Neon Drifter's midnight synth tracks and related underground producers.",
  },
  {
    id: "artist-radio-siren",
    title: "Solana Siren Radio",
    locationOrGenre: "Artist Radio · Seeded Stream",
    category: "artist",
    streamType: "catalog_queue",
    bitrateLabel: "Lossless Master Queue",
    coverImage: cover3,
    artistFilter: "solana-siren",
    color: "from-amber/40 to-primary/30",
    description: "Vocal-driven electropop and melodic electronic soundscapes.",
  },
  {
    id: "artist-radio-byte",
    title: "Byte Bass Radio",
    locationOrGenre: "Artist Radio · Seeded Stream",
    category: "artist",
    streamType: "catalog_queue",
    bitrateLabel: "Lossless Master Queue",
    coverImage: cover5,
    artistFilter: "byte-bass",
    color: "from-orange/40 to-red-500/30",
    description: "Warehouse dubs and heavy syncopated rhythm experiments.",
  },
];

function RadioPage() {
  const { data } = useQuery(catalogQueryOptions());
  const allTracks: Track[] =
    data?.tracks && data.tracks.length > 0 ? data.tracks : fallbackCatalogTracks;
  const { playTrack, currentTrack, isPlaying } = usePlayer();

  const [activeStationId, setActiveStationId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<"all" | "live_web" | "genre" | "artist">(
    "all",
  );

  const handleTuneIn = (station: RadioStation) => {
    setActiveStationId(station.id);

    if (station.streamType === "icecast_live" && station.streamUrl) {
      // Direct live web radio broadcast stream
      const liveTrack: Track = {
        id: station.id,
        title: station.title,
        artistId: "web-radio",
        artistName: station.locationOrGenre,
        coverImage: station.coverImage,
        audioUrl: station.streamUrl,
        duration: 0,
        genre: "Live Radio",
        quality: "MP3" as AudioFormat,
        bitrate: 128,
        sampleRate: 44100,
        playCount: 0,
        likes: 0,
        comments: 0,
        createdAt: new Date().toISOString().split("T")[0],
      };

      playTrack(liveTrack, [liveTrack]);
      toast.success(`Tuned in to ${station.title}`, {
        description: `Streaming live web broadcast (${station.bitrateLabel}).`,
      });
      return;
    }

    // Catalog-backed genre or artist queue
    let stationQueue = allTracks.filter((t) => {
      if (station.genreFilter) {
        return t.genre.toLowerCase() === station.genreFilter.toLowerCase();
      }
      if (station.artistFilter) {
        return (
          t.artistId === station.artistFilter ||
          t.artistName.toLowerCase().includes(station.artistFilter)
        );
      }
      return true;
    });

    if (stationQueue.length === 0) {
      stationQueue = [...allTracks];
    }

    const firstTrack = stationQueue[0];
    playTrack(firstTrack, stationQueue);

    toast.success(`Tuned in to ${station.title}`, {
      description: `Continuous stream (${stationQueue.length} station tracks in queue).`,
    });
  };

  const filteredStations = REAL_RADIO_STATIONS.filter(
    (s) => selectedCategory === "all" || s.category === selectedCategory,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 pb-36 pt-24 sm:px-6 lg:px-8">
      {/* ── Header Banner ── */}
      <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-card p-8 sm:p-12 mb-10">
        <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-primary/10 via-amber/5 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary mb-4">
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            <span>UNIVERSAL RADIO HUB</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Live Web & Genre Radio, <br />
            <span className="text-gradient glow-text">Zero Interruption.</span>
          </h1>

          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            Tune into live internet FM/web radio stations, continuous genre frequencies, or
            artist-seeded queues in bit-perfect lossless quality.
          </p>

          <div className="mt-6 flex flex-wrap gap-2.5">
            {[
              { id: "all" as const, label: "All Stations" },
              { id: "live_web" as const, label: "🌐 Live FM & Web Radio" },
              { id: "genre" as const, label: "⚡ Genre Radio" },
              { id: "artist" as const, label: "🎨 Artist Radios" },
            ].map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "rounded-full text-xs font-bold transition-all",
                  selectedCategory === cat.id
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "border-border/60 bg-glass text-muted-foreground hover:text-foreground",
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
                  : "border-border/40 bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5",
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
                  <div
                    className={cn("absolute inset-0 bg-gradient-to-t opacity-70", station.color)}
                  />

                  <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-white">
                    <Signal className="h-3 w-3 text-primary animate-pulse" />
                    <span>
                      {station.category === "live_web" ? "LIVE BROADCAST" : "CONTINUOUS STREAM"}
                    </span>
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
                  {station.category === "live_web" ? (
                    <Globe2 className="h-3.5 w-3.5" />
                  ) : station.category === "genre" ? (
                    <Flame className="h-3.5 w-3.5" />
                  ) : (
                    <Disc3 className="h-3.5 w-3.5" />
                  )}
                  <span className="uppercase tracking-wider">
                    {station.category === "live_web"
                      ? "Internet Web Broadcast"
                      : station.category === "genre"
                        ? "Genre Frequency"
                        : "Artist Discography"}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                  {station.title}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                  {station.locationOrGenre}
                </p>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {station.description}
                </p>
              </div>

              {/* Action Bar */}
              <div className="mt-5 pt-3 border-t border-border/30 flex items-center justify-between">
                <Badge
                  variant="outline"
                  className="border-border/60 text-[10px] text-muted-foreground font-mono"
                >
                  {station.bitrateLabel}
                </Badge>

                <Button
                  size="sm"
                  onClick={() => handleTuneIn(station)}
                  className={cn(
                    "h-8 text-xs font-bold gap-1.5 rounded-full",
                    isTunedIn
                      ? "bg-emerald-500 text-white hover:bg-emerald-600"
                      : "bg-primary text-primary-foreground hover:bg-primary/90",
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
