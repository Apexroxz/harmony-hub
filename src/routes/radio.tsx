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
  Users,
  Crown,
  MessageSquare,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { catalogQueryOptions } from "@/domain/music/queries";
import { tracks as fallbackCatalogTracks, artists as catalogArtists } from "@/domain/music/catalog";
import { formatNumber, type Track, type AudioFormat } from "@/domain/music/types";
import { usePlayer } from "@/lib/player";
import { ListeningRoomModal, type ListeningRoomData } from "@/components/ListeningRoomModal";
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

const INITIAL_ROOMS: ListeningRoomData[] = [
  {
    id: "room-cyberpunk",
    title: "⚡ Cyberpunk & Dark Synth Underground",
    djName: "Neon Drifter",
    djAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
    genre: "Synthwave / Cyberpunk",
    listenersCount: 54,
    currentTrack: fallbackCatalogTracks[0]!,
    qualityBadge: "24-bit / 96kHz Lossless",
  },
  {
    id: "room-siren-lounge",
    title: "🌙 Solana Siren Late Night Chill Lounge",
    djName: "Solana Siren",
    djAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    genre: "Ambient / Electropop",
    listenersCount: 78,
    currentTrack: fallbackCatalogTracks[2] || fallbackCatalogTracks[0]!,
    qualityBadge: "24-bit / 96kHz Lossless",
  },
  {
    id: "room-bass-bunker",
    title: "🔥 Warehouse Sub-Bass & Heavy Dubs",
    djName: "Byte Bass",
    djAvatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80",
    genre: "Bass & Underground",
    listenersCount: 42,
    currentTrack: fallbackCatalogTracks[1] || fallbackCatalogTracks[0]!,
    qualityBadge: "FLAC 1411 kbps",
  },
];

function RadioPage() {
  const { data } = useQuery(catalogQueryOptions());
  const allTracks: Track[] =
    data?.tracks && data.tracks.length > 0 ? data.tracks : fallbackCatalogTracks;
  const { playTrack, currentTrack, isPlaying } = usePlayer();

  const [activeStationId, setActiveStationId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<
    "rooms" | "all" | "live_web" | "genre" | "artist"
  >("rooms");
  const [activeRoom, setActiveRoom] = useState<ListeningRoomData | null>(null);
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [rooms, setRooms] = useState<ListeningRoomData[]>(INITIAL_ROOMS);

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
        createdAt: new Date().toISOString().split("T")[0] ?? "2026-08-01",
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
    if (firstTrack) {
      playTrack(firstTrack, stationQueue);
    }

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
      <div className="relative overflow-hidden rounded-[2.5rem] border border-white/[0.09] bg-gradient-to-b from-[#151619] via-[#0e0f11] to-[#080809] p-8 sm:p-12 mb-10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
        <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-primary/15 via-amber/5 to-transparent blur-3xl" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-mono font-bold text-primary tracking-wider uppercase mb-4">
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            <span>UNIVERSAL HIGH-FIDELITY RADIO HUB</span>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-5xl">
            Live Web & Genre Radio, <br />
            <span className="text-gradient glow-text">Zero Interruption.</span>
          </h1>

          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            Tune into live internet FM/web radio stations, continuous genre frequencies, or
            artist-seeded queues in bit-perfect lossless quality.
          </p>

          <div className="mt-6 flex flex-wrap gap-2.5">
            {[
              { id: "rooms" as const, label: "📻 Live Listening Rooms (Active)" },
              { id: "all" as const, label: "All Frequencies" },
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
                  "rounded-full text-xs font-bold transition-all h-9 px-4 cursor-pointer tap-active",
                  selectedCategory === cat.id
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "border-white/[0.08] bg-[#121316] text-muted-foreground hover:text-foreground hover:bg-white/[0.05]",
                )}
              >
                {cat.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Synchronized Live Listening Rooms Section ── */}
      {(selectedCategory === "rooms" || selectedCategory === "all") && (
        <div className="mb-12 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
            <div>
              <div className="flex items-center gap-2 text-primary text-xs font-bold mb-1">
                <Users className="h-4 w-4" />
                <span>SYNCHRONIZED LIVE DJ ROOMS</span>
              </div>
              <h2 className="text-2xl font-extrabold text-foreground">
                Live Community Listening Rooms
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tune in to the exact same bit-perfect audio stream, vote on the DJ queue, and chat in
                real time.
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => {
                const newRoom: ListeningRoomData = {
                  id: `room-${Date.now()}`,
                  title: "🎧 My Live Audiophile Session",
                  djName: "You (Host DJ)",
                  djAvatar:
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
                  genre: "Universal Hi-Fi",
                  listenersCount: 1,
                  currentTrack: allTracks[0]!,
                  qualityBadge: "24-bit / 96kHz Master",
                };
                setRooms((prev) => [newRoom, ...prev]);
                setActiveRoom(newRoom);
                setRoomModalOpen(true);
                toast.success("Created your live listening room! You are now Host DJ.");
              }}
              className="rounded-full bg-primary text-primary-foreground font-bold text-xs h-9 px-5 gap-2 cursor-pointer shadow-md"
            >
              <Plus className="h-4 w-4" /> Host a Listening Room
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <div
                key={room.id}
                onClick={() => {
                  setActiveRoom(room);
                  setRoomModalOpen(true);
                }}
                className="group relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#121316]/90 p-6 shadow-2xl transition-all duration-500 hover:border-primary/50 hover:bg-[#16181d] hover:shadow-primary/10 cursor-pointer flex flex-col justify-between space-y-5 backdrop-blur-xl"
              >
                {/* Room Top Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={room.djAvatar}
                        alt={room.djName}
                        className="h-12 w-12 rounded-2xl object-cover border border-white/10 shadow-sm"
                      />
                      <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                        <Crown className="h-2.5 w-2.5" />
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono text-muted-foreground uppercase">
                        Host DJ
                      </span>
                      <h4 className="text-sm font-extrabold text-foreground truncate max-w-[140px]">
                        {room.djName}
                      </h4>
                    </div>
                  </div>

                  <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] font-mono font-bold px-2 py-0.5 gap-1.5 animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    LIVE SYNC
                  </Badge>
                </div>

                {/* Room Title & Currently Playing */}
                <div>
                  <h3 className="text-base font-extrabold text-foreground group-hover:text-primary transition-colors leading-snug tracking-tight">
                    {room.title}
                  </h3>
                  <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white/[0.03] p-3 border border-white/[0.06]">
                    <img
                      src={room.currentTrack.coverImage}
                      alt={room.currentTrack.title}
                      className="h-9 w-9 rounded-xl object-cover border border-white/10"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] text-muted-foreground font-mono">NOW PLAYING</p>
                      <p className="text-xs font-bold text-foreground truncate">
                        {room.currentTrack.title}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Room Footer Status & Enter Trigger */}
                <div className="flex items-center justify-between border-t border-white/[0.06] pt-3 text-xs">
                  <span className="font-mono text-muted-foreground flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <strong className="text-foreground">{room.listenersCount}</strong> listening
                  </span>

                  <Button
                    size="sm"
                    className="rounded-full h-8 px-4 text-xs font-bold bg-primary text-primary-foreground group-hover:scale-105 transition-transform cursor-pointer tap-active"
                  >
                    Enter Room
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Stations Grid ── */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredStations.map((station) => {
          const isTunedIn = activeStationId === station.id;
          return (
            <div
              key={station.id}
              className={cn(
                "group relative overflow-hidden rounded-[2rem] border p-6 transition-all duration-500 flex flex-col justify-between backdrop-blur-xl",
                isTunedIn
                  ? "border-primary bg-primary/10 shadow-2xl shadow-primary/10 ring-1 ring-primary/30"
                  : "border-white/[0.08] bg-[#121316]/90 hover:border-primary/50 hover:bg-[#16181d] hover:shadow-[0_15px_40px_rgba(0,0,0,0.8)]",
              )}
            >
              <div>
                {/* Station Cover & Live Badge */}
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black/50 border border-white/[0.08] mb-4 shadow-inner">
                  <img
                    src={station.coverImage}
                    alt={station.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div
                    className={cn("absolute inset-0 bg-gradient-to-t opacity-70", station.color)}
                  />

                  <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-mono font-bold text-white border border-white/10 shadow-md">
                    <Signal className="h-3 w-3 text-primary animate-pulse" />
                    <span>
                      {station.category === "live_web" ? "LIVE BROADCAST" : "CONTINUOUS STREAM"}
                    </span>
                  </div>

                  <button
                    onClick={() => handleTuneIn(station)}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-all cursor-pointer backdrop-blur-[2px]"
                    aria-label={`Tune in to ${station.title}`}
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl transition-transform hover:scale-110">
                      <Play className="h-6 w-6 fill-current ml-0.5" />
                    </div>
                  </button>
                </div>

                {/* Station Info */}
                <div className="flex items-center gap-2 text-primary text-xs font-mono font-bold mb-1.5">
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

                <h3 className="text-lg font-black text-foreground group-hover:text-primary transition-colors tracking-tight">
                  {station.title}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                  {station.locationOrGenre}
                </p>
                <p className="text-xs text-muted-foreground mt-2.5 leading-relaxed">
                  {station.description}
                </p>
              </div>

              {/* Action Bar */}
              <div className="mt-5 pt-3.5 border-t border-white/[0.06] flex items-center justify-between">
                <Badge
                  variant="outline"
                  className="border-white/10 bg-black/40 text-[10px] text-muted-foreground font-mono"
                >
                  {station.bitrateLabel}
                </Badge>

                <Button
                  size="sm"
                  onClick={() => handleTuneIn(station)}
                  className={cn(
                    "h-8 text-xs font-bold gap-1.5 rounded-full px-4 cursor-pointer tap-active",
                    isTunedIn
                      ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-500/20"
                      : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20",
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

      {/* Synchronized Listening Room Modal */}
      <ListeningRoomModal
        room={activeRoom}
        open={roomModalOpen}
        onClose={() => setRoomModalOpen(false)}
      />
    </div>
  );
}
