import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import {
  Play,
  Pause,
  Share2,
  Heart,
  ShoppingBag,
  Download,
  ShieldCheck,
  Disc3,
  WifiOff,
  Gift,
} from "lucide-react";
import { getTrackById, getArtistById, tracks } from "@/domain/music/catalog";
import { formatDuration, type Track } from "@/domain/music/types";
import { usePlayer } from "@/lib/player";
import { useAppMode } from "@/lib/mode";
import { isTrackPurchased } from "@/domain/music/purchases";
import { BuyTrackModal } from "@/components/BuyTrackModal";
import { TrackCard } from "@/components/TrackCard";
import { WaveformComments } from "@/components/WaveformComments";
import { FanTipModal } from "@/components/FanTipModal";
import { StemMixer } from "@/components/StemMixer";
import { AudioFormatExporterModal } from "@/components/AudioFormatExporterModal";
import { MasterCertificateModal } from "@/components/MasterCertificateModal";
import { VipContentLocker } from "@/components/VipContentLocker";
import { MasteringAnalyzerModal } from "@/components/MasteringAnalyzerModal";
import { Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
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
          { name: "description", content: `Stream and buy ${loaderData.track.title} on Layam.` },
          { property: "og:title", content: `${loaderData.track.title} — Layam` },
          {
            property: "og:description",
            content: `Stream and buy ${loaderData.track.title} on Layam.`,
          },
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
  const { isOnline, saveTrackOffline, removeDownloadedTrack, isTrackDownloaded } = useAppMode();
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [tipModalOpen, setTipModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [certificateModalOpen, setCertificateModalOpen] = useState(false);
  const [analyzerModalOpen, setAnalyzerModalOpen] = useState(false);

  const isCurrent = currentTrack?.id === track.id;
  const purchased = isTrackPurchased(track.id);
  const price = track.price ?? 1.49;

  const similar = tracks
    .filter(
      (t: typeof track) =>
        t.id !== track.id && (t.genre === track.genre || t.artistId === track.artistId),
    )
    .slice(0, 3);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Track link copied to clipboard!");
    }
  };

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pb-36 pt-24 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-border/40 bg-card shadow-2xl">
          <div className="grid gap-8 p-6 lg:grid-cols-[400px_1fr] lg:p-10">
            {/* Cover Art */}
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted shadow-lg">
              <img
                src={track.coverImage}
                alt={track.title}
                width={400}
                height={400}
                className="h-full w-full object-cover"
              />
              <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-md px-2.5 py-1 text-[10px] font-mono font-bold text-primary">
                {track.quality} {track.bitDepth ? `${track.bitDepth}-bit` : ""}
              </div>
            </div>

            {/* Details & Actions */}
            <div className="flex flex-col justify-center">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge
                  variant="secondary"
                  className="bg-surface-raised text-foreground font-semibold"
                >
                  {track.genre}
                </Badge>
                <Badge
                  variant="outline"
                  className="border-border/60 font-mono text-xs text-primary font-bold"
                >
                  {track.quality} {track.sampleRate ? `${track.sampleRate / 1000}kHz` : "44.1kHz"}
                </Badge>
                {purchased && (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-xs font-bold">
                    OWNED · DRM-FREE
                  </Badge>
                )}
              </div>

              <h1 className="text-3xl font-extrabold text-foreground sm:text-5xl">{track.title}</h1>
              <Link
                to="/artist/$id"
                params={{ id: track.artistId }}
                className="mt-2 text-lg text-muted-foreground hover:text-primary transition-colors font-medium"
              >
                {track.artistName}
              </Link>

              <p className="mt-5 max-w-xl text-sm text-muted-foreground leading-relaxed">
                {artist?.bio || "Direct independent master release with 85% creator payout."}
              </p>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <Button
                  size="lg"
                  onClick={() => playTrack(track)}
                  className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-6 shadow-lg shadow-primary/20 gap-2"
                >
                  {isCurrent && isPlaying ? (
                    <Pause className="h-5 w-5 fill-current" />
                  ) : (
                    <Play className="h-5 w-5 fill-current ml-0.5" />
                  )}
                  {isCurrent && isPlaying ? "Pause Playback" : "Stream Master"}
                </Button>

                {isOnline && (
                  <>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => {
                        if (isTrackDownloaded(track.id)) {
                          removeDownloadedTrack(track.id);
                        } else {
                          void saveTrackOffline(track);
                        }
                      }}
                      className={cn(
                        "rounded-full font-bold gap-2 px-5 border-border/60 transition-all cursor-pointer",
                        isTrackDownloaded(track.id)
                          ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                          : "hover:bg-surface-raised text-foreground",
                      )}
                    >
                      <Download className="h-4 w-4" />
                      {isTrackDownloaded(track.id) ? "Saved Offline" : "Save Offline"}
                    </Button>

                    <Button
                      size="lg"
                      variant={purchased ? "outline" : "default"}
                      onClick={() => setBuyModalOpen(true)}
                      className={cn(
                        "rounded-full font-bold gap-2 px-6 shadow-md transition-all",
                        purchased
                          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                          : "bg-gradient-to-r from-orange to-amber text-black hover:opacity-90 shadow-orange/20",
                      )}
                    >
                      {purchased ? (
                        <>
                          <Download className="h-4 w-4" /> Download Master
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="h-4 w-4" /> Buy Master (${price.toFixed(2)})
                        </>
                      )}
                    </Button>
                  </>
                )}

                {isOnline && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setTipModalOpen(true)}
                    className="rounded-full border-border/60 font-bold text-foreground hover:text-primary gap-1.5 px-5"
                  >
                    <Gift className="h-4 w-4 text-primary" />
                    Tip Artist
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setExportModalOpen(true)}
                  className="rounded-full border-border/60 font-bold text-foreground hover:text-primary gap-1.5 px-5"
                >
                  <Download className="h-4 w-4" />
                  Export Format
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setCertificateModalOpen(true)}
                  className="rounded-full border-primary/40 text-primary hover:bg-primary/10 font-bold gap-1.5 px-5"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Provenance Proof
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setAnalyzerModalOpen(true)}
                  className="rounded-full border-border/60 font-bold text-foreground hover:text-primary gap-1.5 px-5"
                >
                  <Gauge className="h-4 w-4 text-emerald-400" />
                  LUFS & Dynamics
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleShare}
                  className="h-11 w-11 rounded-full border-border/60 text-muted-foreground hover:text-foreground"
                  title="Share Track"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Specs Breakdown */}
              <div className="mt-8 grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-2xl border border-border/40 bg-surface-raised p-4">
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="mt-1 text-lg font-bold text-foreground font-mono">
                    {formatDuration(track.duration)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/40 bg-surface-raised p-4">
                  <p className="text-xs text-muted-foreground">Bitrate</p>
                  <p className="mt-1 text-lg font-bold text-foreground font-mono">
                    {track.bitrate ? `${track.bitrate} kbps` : "1411 kbps"}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/40 bg-surface-raised p-4">
                  <p className="text-xs text-muted-foreground">License</p>
                  <p className="mt-1 text-lg font-bold text-foreground">DRM-Free</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Multi-Track Stems & Live Remix Deck */}
        <section className="mt-12">
          <StemMixer track={track} />
        </section>

        {/* Timestamped Waveform Reactions & Live Discussion */}
        <section className="mt-12">
          <WaveformComments track={track} />
        </section>

        {/* Token-Gated VIP Backstage Vault & Stems */}
        <section className="mt-12">
          <VipContentLocker track={track} artistName={track.artistName} />
        </section>

        {/* Similar Releases */}
        {similar.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-bold text-foreground mb-6">More from this Genre</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((t: Track) => (
                <TrackCard key={t.id} track={t} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Modals */}
      <BuyTrackModal
        track={track}
        open={buyModalOpen}
        onClose={() => setBuyModalOpen(false)}
      />
      <FanTipModal
        artistId={track.artistId}
        artistName={track.artistName}
        artistAvatar={artist?.avatar}
        open={tipModalOpen}
        onOpenChange={setTipModalOpen}
      />
      <AudioFormatExporterModal
        track={track}
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
      />
      <MasterCertificateModal
        track={track}
        open={certificateModalOpen}
        onClose={() => setCertificateModalOpen(false)}
      />
      <MasteringAnalyzerModal
        track={track}
        open={analyzerModalOpen}
        onClose={() => setAnalyzerModalOpen(false)}
      />
    </>
  );
}
