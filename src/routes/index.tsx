import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Play,
  Radio,
  TrendingUp,
  Zap,
  Music2,
  HardDrive,
  Disc3,
  Sliders,
  FolderOpen,
  Plus,
  RefreshCw,
  Sparkles,
  WifiOff,
  ShoppingBag,
  Users,
} from "lucide-react";
import { catalogQueryOptions } from "@/domain/music/queries";
import { tracks as storeCatalogTracks } from "@/domain/music/catalog";
import { formatNumber, formatDuration, type Track } from "@/domain/music/types";
import { useAppMode, type LocalTrack } from "@/lib/mode";
import { usePlayer } from "@/lib/player";
import { AudioConsoleModal } from "@/components/AudioConsoleModal";
import { TrackCard } from "@/components/TrackCard";
import { TrackGridSkeleton, LoadError } from "@/components/CatalogState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import heroBg from "@/assets/hero-bg.jpg";

export const Route = createFileRoute("/")({
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(catalogQueryOptions());
  },
  head: () => ({
    meta: [
      { title: "Layam — Luxury Audiophile Player & Creator Platform" },
      {
        name: "description",
        content: "Offline audiophile FLAC/WAV player with 10-band DSP + lossless creator streaming ecosystem.",
      },
      { property: "og:title", content: "Layam — Luxury Audiophile Player & Creator Platform" },
      {
        property: "og:description",
        content: "Offline audiophile FLAC/WAV player with 10-band DSP + lossless creator streaming ecosystem.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IndexPage,
});

function IndexPage() {
  const { isOffline } = useAppMode();
  return isOffline ? <OfflineHiFiDashboard /> : <OnlineHomePage />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. DEDICATED OFFLINE HI-FI DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function OfflineHiFiDashboard() {
  const {
    localTracks,
    localAlbums,
    localFolders,
    storageUsedMb,
    formatsSummary,
    importLocalFiles,
  } = useAppMode();
  const { playTrack, expandPlayer, currentTrack } = usePlayer();
  const [consoleOpen, setConsoleOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await importLocalFiles(files);
    }
    e.target.value = "";
  };

  const recentTracks = localTracks.slice(0, 6);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-36 pt-24 sm:px-6 lg:px-8">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        multiple
        accept="audio/*,.mp3,.aac,.m4a,.ogg,.opus,.wav,.flac,.alac,.aiff,.aif"
        className="hidden"
      />
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFileSelect}
        multiple
        // @ts-ignore
        webkitdirectory=""
        className="hidden"
      />

      {/* ── Offline Hardware Console Hero ── */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-card to-card p-8 sm:p-12 mb-12 shadow-2xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-1 text-xs font-mono font-bold text-emerald-400 mb-5">
            <WifiOff className="h-3.5 w-3.5" />
            <span>OFFLINE AUDIOPHILE CONSOLE · LOCAL PLAYBACK</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Hi-Fi Local Player & <br />
            <span className="text-emerald-400">DSP Audio Console</span>
          </h1>

          <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-xl">
            Bit-perfect playback directly from your local hardware storage. Uncompressed 24-bit/96kHz FLAC, WAV, and ALAC decoding with 10-band studio parametric EQ.
          </p>

          <div className="mt-8 flex flex-wrap gap-3.5">
            <Button
              size="lg"
              onClick={() => folderInputRef.current?.click()}
              className="rounded-full bg-emerald-500 text-white hover:bg-emerald-600 font-bold shadow-lg shadow-emerald-500/20 gap-2 h-11 px-6 cursor-pointer"
            >
              <FolderOpen className="h-4 w-4" />
              Scan Music Folder
            </Button>

            <Button
              size="lg"
              onClick={() => {
                if (currentTrack) {
                  expandPlayer();
                } else if (localTracks.length > 0) {
                  playTrack(localTracks[0], localTracks);
                }
              }}
              className="rounded-full bg-surface-raised border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/15 font-bold gap-2 h-11 px-6 cursor-pointer"
            >
              <Play className="h-4 w-4 fill-current" />
              Open Hi-Fi Player
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={() => setConsoleOpen(true)}
              className="rounded-full border-border/60 text-foreground hover:bg-surface-raised font-bold gap-2 bg-surface h-11 px-6 cursor-pointer"
            >
              <Sliders className="h-4 w-4 text-primary" />
              DSP Console
            </Button>

            <Button
              asChild
              size="lg"
              variant="ghost"
              className="rounded-full text-foreground hover:bg-surface-raised font-semibold h-11 px-5"
            >
              <Link to="/library" search={{ tab: "tracks" }}>
                Browse Library
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Audiophile Hardware Stats & Metrics ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-14">
        {/* Track Count */}
        <div className="rounded-2xl border border-border/40 bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-semibold">Local Tracks</p>
            <Music2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-foreground font-mono">{localTracks.length}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Indexed in local storage</p>
        </div>

        {/* Albums */}
        <div className="rounded-2xl border border-border/40 bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-semibold">Local Albums</p>
            <Disc3 className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-foreground font-mono">{localAlbums.length}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Grouped by ID3 tags</p>
        </div>

        {/* Storage Used */}
        <div className="rounded-2xl border border-border/40 bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-semibold">Storage Footprint</p>
            <HardDrive className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-foreground font-mono">
            {storageUsedMb >= 1000 ? `${(storageUsedMb / 1024).toFixed(2)} GB` : `${storageUsedMb} MB`}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">Local & downloaded masters</p>
        </div>

        {/* Format Breakdown */}
        <div className="rounded-2xl border border-border/40 bg-card p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground font-semibold">Lossless Formats</p>
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {formatsSummary.flac > 0 && (
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[10px] font-mono">
                {formatsSummary.flac} FLAC
              </Badge>
            )}
            {formatsSummary.wav > 0 && (
              <Badge variant="outline" className="border-primary/40 text-primary text-[10px] font-mono">
                {formatsSummary.wav} WAV
              </Badge>
            )}
            {formatsSummary.alac > 0 && (
              <Badge variant="outline" className="border-amber/40 text-amber text-[10px] font-mono">
                {formatsSummary.alac} ALAC
              </Badge>
            )}
            {formatsSummary.mp3 > 0 && (
              <Badge variant="outline" className="border-border/60 text-muted-foreground text-[10px] font-mono">
                {formatsSummary.mp3} MP3
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* ── Recently Added Local Music ── */}
      <section className="mb-14">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Recently Added Music</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Scanned files and downloaded DRM-free masters.</p>
          </div>
          <Link
            to="/library"
            search={{ tab: "tracks" }}
            className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:underline"
          >
            View all {localTracks.length} tracks <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recentTracks.map((track) => (
            <div
              key={track.id}
              className="group flex items-center justify-between gap-3 rounded-2xl border border-border/40 bg-card p-3 hover:border-emerald-500/40 hover:bg-surface-raised transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-muted">
                  <img src={track.coverImage} alt={track.title} className="h-full w-full object-cover" />
                  <button
                    onClick={() => playTrack(track as Track, localTracks as Track[])}
                    className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    aria-label={`Play ${track.title}`}
                  >
                    <Play className="h-5 w-5 text-white fill-current ml-0.5" />
                  </button>
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-xs sm:text-sm text-foreground truncate group-hover:text-emerald-400 transition-colors">
                    {track.title}
                  </h4>
                  <p className="text-xs text-muted-foreground truncate">{track.artistName}</p>
                </div>
              </div>

              <div className="flex flex-col items-end shrink-0">
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[9px] font-mono font-bold">
                  {track.quality}
                </Badge>
                <span className="text-[10px] font-mono text-muted-foreground mt-0.5">
                  {formatDuration(track.duration)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Offline Album Shelves ── */}
      {localAlbums.length > 0 && (
        <section className="mb-14">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Local Albums</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Organized from your device's ID3 metadata tags.</p>
            </div>
            <Link
              to="/library"
              search={{ tab: "albums" }}
              className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:underline"
            >
              Browse all albums <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {localAlbums.slice(0, 4).map((album) => (
              <div
                key={album.name}
                className="group rounded-2xl border border-border/40 bg-card p-4 hover:border-emerald-500/40 transition-all flex flex-col"
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted mb-3">
                  <img
                    src={album.coverImage}
                    alt={album.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <button
                    onClick={() => playTrack(album.tracks[0], album.tracks)}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    aria-label={`Play album ${album.name}`}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl hover:scale-110 transition-transform">
                      <Play className="h-6 w-6 fill-current ml-0.5" />
                    </div>
                  </button>
                </div>

                <h3 className="font-bold text-sm text-foreground truncate group-hover:text-emerald-400 transition-colors">
                  {album.name}
                </h3>
                <p className="text-xs text-muted-foreground truncate">{album.artistName}</p>
                <span className="text-[10px] font-mono text-muted-foreground mt-1">
                  {album.trackCount} {album.trackCount === 1 ? "track" : "tracks"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Buy DRM-Free Masters Directly for Offline Player ── */}
      <section className="rounded-3xl border border-border/40 bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-primary text-xs font-bold mb-1">
              <ShoppingBag className="h-4 w-4" />
              <span>ONLINE MUSIC STORE · DIRECT OFFLINE DOWNLOAD</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground">Get New Masters for Offline Player</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Buy 24-bit high-resolution masters directly from independent artists. 85% goes straight to the creator and files download instantly into your local offline library.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {storeCatalogTracks.slice(0, 3).map((t) => (
            <TrackCard key={t.id} track={t} />
          ))}
        </div>
      </section>

      {/* Audio Console Modal */}
      <AudioConsoleModal open={consoleOpen} onClose={() => setConsoleOpen(false)} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. ONLINE CREATOR STREAMING PLATFORM
// ═══════════════════════════════════════════════════════════════════════════════
function OnlineHomePage() {
  const { data, isPending, error, refetch } = useQuery(catalogQueryOptions());
  const { playTrack } = usePlayer();
  const tracks = data?.tracks ?? [];
  const featured = tracks.slice(0, 3);
  const trending = tracks.slice(3, 6);

  return (
    <div className="pb-36">
      {/* ── Minimalist Luxury Hero Section ── */}
      <section className="relative flex min-h-[500px] items-center justify-center overflow-hidden px-4 pt-20 sm:px-6 lg:px-8">
        <img
          src={heroBg}
          alt=""
          width={1920}
          height={1080}
          className="absolute inset-0 h-full w-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/80 to-background" />

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-xs font-bold text-primary">
            <Radio className="h-3.5 w-3.5" />
            <span>Lossless Creator Platform · Direct DRM-Free Store</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Music,
            <br />
            <span className="text-gradient">without boundaries.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base sm:text-lg text-muted-foreground leading-relaxed">
            Hybrid local Hi-Fi player + creator-first music ecosystem. Experience bit-perfect master playback, 10-band parametric EQ, and direct creator commerce.
          </p>

          {/* Maximum 2 Primary Actions */}
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button
              size="lg"
              onClick={() => {
                if (tracks.length > 0) playTrack(tracks[0], tracks);
              }}
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-8 h-12 shadow-xl shadow-primary/20 gap-2 cursor-pointer"
            >
              <Play className="h-4 w-4 fill-current ml-0.5" />
              Start Listening
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-full border-border/80 bg-surface text-foreground hover:bg-surface-raised font-bold px-8 h-12"
            >
              <Link to="/store">
                Explore Store
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Featured Master Releases ── */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Featured Releases</h2>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Hand-curated uncompressed master recordings.</p>
          </div>
          <Link
            to="/store"
            className="hidden items-center gap-1 text-xs font-semibold text-primary hover:underline sm:flex"
          >
            Explore store <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {isPending ? (
          <TrackGridSkeleton count={3} />
        ) : error ? (
          <LoadError message="Could not load featured releases." onRetry={() => refetch()} />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((track) => (
              <TrackCard key={track.id} track={track} />
            ))}
          </div>
        )}
      </section>

      {/* ── Trending Masters ── */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Trending Masters</h2>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Top streamed and collected releases on Layam.</p>
          </div>
          <Link
            to="/stream"
            className="hidden items-center gap-1 text-xs font-semibold text-primary hover:underline sm:flex"
          >
            Discover all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {isPending ? (
          <TrackGridSkeleton count={3} />
        ) : error ? (
          <LoadError message="Could not load trending releases." onRetry={() => refetch()} />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {trending.map((track) => (
              <TrackCard key={track.id} track={track} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
