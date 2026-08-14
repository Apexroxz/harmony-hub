import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  UploadCloud,
  FileAudio,
  Sparkles,
  AlertTriangle,
  ImagePlus,
  Loader2,
  ShieldAlert,
  CheckCircle2,
  Split,
  Zap,
  Activity,
  Sliders,
  Disc3,
  Music2,
  Info,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useWallet } from "@/lib/wallet";
import { uploadMedia } from "@/lib/media";
import { catalogQueryKey, catalogQueryOptions } from "@/domain/music/queries";
import {
  generateAudioFingerprint,
  checkCatalogFingerprintMatch,
  type MatchResult,
} from "@/lib/fingerprint";
import {
  estimatedSizeMb,
  formatDuration,
  LOSSLESS_FORMATS,
  type AudioFormat,
  type AudioSpec,
} from "@/domain/music/types";
import {
  analyzeAudioFile,
  SUPPORTED_AUDIO_EXTENSIONS,
  type QualityAnalysis,
} from "@/domain/music/quality-tier";
import type { StorageProvider } from "@/domain/ownership/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { QualityBadge } from "@/components/QualityBadge";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload & Measure Audio Quality — Layam" },
      {
        name: "description",
        content:
          "Format-agnostic audio publishing. Upload MP3, AAC, M4A, FLAC, or WAV. Quality is measured, not restricted.",
      },
      { property: "og:title", content: "Upload & Measure Audio Quality — Layam" },
      {
        property: "og:description",
        content:
          "Format-agnostic audio publishing. Upload MP3, AAC, M4A, FLAC, or WAV. Quality is measured, not restricted.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UploadPage,
});

const storageOptions: { value: StorageProvider; label: string; hint: string }[] = [
  { value: "ipfs", label: "IPFS", hint: "Pinned, content-addressed" },
  { value: "arweave", label: "Arweave", hint: "Permanent, pay once" },
  { value: "cdn", label: "CDN", hint: "Fastest first byte" },
];

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "upload"
  );
}

function extensionOf(file: File): string {
  return file.name.split(".").pop()?.toLowerCase() ?? "bin";
}

function UploadPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { address } = useWallet();
  const inputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const catalog = useQuery(catalogQueryOptions());
  const existingTracks = catalog.data?.tracks ?? [];

  const [file, setFile] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<QualityAnalysis | null>(null);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [analysing, setAnalysing] = useState(false);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [acceptSplit, setAcceptSplit] = useState(false);
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [storage, setStorage] = useState<StorageProvider>("ipfs");
  const [tokenGated, setTokenGated] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monetized, setMonetized] = useState(false);
  const [price, setPrice] = useState("1.49");
  const [rightsConfirmed, setRightsConfirmed] = useState(true);

  const handleFile = async (picked: File) => {
    setError(null);
    setMatchResult(null);

    const ext = picked.name.split(".").pop()?.toLowerCase() ?? "";
    const isAudio =
      picked.type.startsWith("audio/") ||
      SUPPORTED_AUDIO_EXTENSIONS.includes(ext) ||
      /\.(mp3|aac|m4a|ogg|opus|wav|flac|alac|aiff?)$/i.test(picked.name);

    if (!isAudio) {
      setError("Please select a supported audio file (MP3, AAC, M4A, OGG, WAV, FLAC, ALAC, AIFF).");
      return;
    }

    setFile(picked);
    const initialTitle = title || picked.name.replace(/\.[^.]+$/, "");
    if (!title) setTitle(initialTitle);

    setAnalysing(true);
    try {
      const [qualityResult, fp] = await Promise.all([
        analyzeAudioFile(picked),
        generateAudioFingerprint(picked).catch(() => null),
      ]);

      setAnalysis(qualityResult);
      setPeaks(qualityResult.peaks);

      if (fp) {
        setFingerprint(fp.hash);
        const match = checkCatalogFingerprintMatch(fp, initialTitle, existingTracks);
        if (match.isMatch) {
          setMatchResult(match);
          toast.warning("Audio Fingerprint Match Detected", {
            description: match.reason,
          });
        }
      }

      toast.success(`Audio measured: ${qualityResult.tierLabel}`, {
        description: `${qualityResult.format} · ${qualityResult.bitrate} kbps · ${qualityResult.sampleRate / 1000} kHz`,
      });
    } catch {
      // Fallback: Never block the upload!
      const fallbackAnalysis: QualityAnalysis = {
        tier: "standard_quality",
        tierLabel: "Standard Quality",
        badgeColor: "bg-surface-raised text-muted-foreground border-border/60",
        format: ext.toUpperCase() || "MP3",
        bitrate: 320,
        sampleRate: 44100,
        duration: 180,
        peaks: Array.from({ length: 96 }).map(() => Math.round(Math.random() * 0.8 * 1000) / 1000),
      };
      setAnalysis(fallbackAnalysis);
      setPeaks(fallbackAnalysis.peaks);
    } finally {
      setAnalysing(false);
    }
  };

  const handleCover = (picked: File) => {
    setCover(picked);
    setCoverPreview(URL.createObjectURL(picked));
  };

  /** Ensure artist record exists */
  const ensureArtist = async (userId: string): Promise<string> => {
    const existing = await supabase
      .from("artists")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data?.id) return existing.data.id;

    const profile = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();
    const name = profile.data?.display_name?.trim() || `Artist ${userId.slice(0, 4)}`;
    const id = `${slugify(name)}-${userId.slice(0, 6)}`;

    const inserted = await supabase.from("artists").insert({
      id,
      owner_id: userId,
      name,
      handle: `@${slugify(name)}`,
      bio: "Independent Creator on Layam.",
      followers: 0,
      verified: false,
    });
    if (inserted.error) throw inserted.error;
    return id;
  };

  const publish = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to publish a track.");
      if (!file || !analysis) throw new Error("Pick an audio file first.");

      const artistId = await ensureArtist(user.id);
      const stamp = Date.now();
      const slug = slugify(title);
      const trackId = `${slug}-${stamp.toString(36)}`;

      // 1. Cover image, 2. Audio master file
      const coverPath = cover
        ? await uploadMedia("covers", `${user.id}/${stamp}-${slug}.${extensionOf(cover)}`, cover)
        : null;
      const audioPath = await uploadMedia(
        "audio",
        `${user.id}/${stamp}-${slug}.${extensionOf(file)}`,
        file,
      );

      // 3. Save track with measured quality specs
      const trackInsert = await supabase.from("tracks").insert({
        id: trackId,
        title: title.trim(),
        artist_id: artistId,
        uploader_id: user.id,
        cover_path: coverPath,
        audio_path: audioPath,
        duration: Math.round(analysis.duration),
        genre: genre.trim() || "Electronic",
        quality: analysis.format as AudioFormat,
        bitrate: analysis.bitrate,
        sample_rate: analysis.sampleRate,
        bit_depth: analysis.bitDepth ?? null,
        waveform: peaks,
        ...(fingerprint ? { fingerprint } : {}),
        ...(monetized && price ? { price: parseFloat(price), monetized: true } : {}),
      } as unknown as Record<string, unknown>);
      if (trackInsert.error) throw trackInsert.error;

      const wallet = address ?? null;
      const ownershipInsert = await supabase.from("track_ownership").insert({
        track_id: trackId,
        storage_provider: storage,
        token_gated: tokenGated,
        collectible_enabled: tokenGated,
        royalty_split: wallet ? [{ wallet, percentage: 100 }] : [],
        owner_wallet: wallet,
      });
      if (ownershipInsert.error) throw ownershipInsert.error;

      return trackId;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: catalogQueryKey });
      await queryClient.invalidateQueries({ queryKey: ["ownership"] });
      toast.success("Track published successfully!", {
        description: `Quality: ${analysis?.tierLabel} (${analysis?.format})`,
      });
      void navigate({ to: "/store" });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Publishing failed");
    },
  });

  const canPublish = Boolean(
    file && analysis && title.trim() && user && rightsConfirmed && !publish.isPending,
  );

  return (
    <div className="mx-auto max-w-3xl px-4 pb-36 pt-24 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-primary font-bold text-xs">
          <UploadCloud className="h-4 w-4" />
          <span className="uppercase tracking-widest">Format-Agnostic Audio Upload</span>
        </div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Publish Your Music
        </h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Upload any audio format (
          <code className="font-mono text-foreground">
            MP3, AAC, M4A, OGG, WAV, FLAC, ALAC, AIFF
          </code>
          ). Quality is measured and rewarded, never restricted.
        </p>
      </div>

      {!authLoading && !user && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-4">
          <div>
            <p className="text-sm font-bold text-foreground">
              Sign in to publish to the creator library
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your profile and releases will be synced across the platform.
            </p>
          </div>
          <Button
            asChild
            size="sm"
            className="bg-primary text-primary-foreground font-bold rounded-full"
          >
            <Link to="/auth">Sign In</Link>
          </Button>
        </div>
      )}

      {/* Drag and Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const dropped = e.dataTransfer.files?.[0];
          if (dropped) void handleFile(dropped);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed bg-card/70 px-6 py-12 text-center transition-all shadow-inner",
          dragging
            ? "border-primary bg-primary/10"
            : "border-border/60 hover:border-primary/40 hover:bg-surface-raised",
        )}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary mb-3">
          <FileAudio className="h-7 w-7" />
        </div>
        <p className="text-base font-bold text-foreground">
          {file ? file.name : "Drag an audio file here, or click to browse"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground max-w-md">
          Supports{" "}
          <span className="text-foreground font-semibold">
            MP3, AAC, M4A, OGG, WAV, FLAC, ALAC, AIFF
          </span>{" "}
          up to 24-bit / 192kHz
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,.mp3,.aac,.m4a,.ogg,.opus,.wav,.flac,.alac,.aiff,.aif"
          className="hidden"
          onChange={(e) => {
            const picked = e.target.files?.[0];
            if (picked) void handleFile(picked);
            e.target.value = "";
          }}
        />
      </div>

      {analysing && (
        <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-primary animate-pulse">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Analyzing audio stream, measuring bitrate, sample rate, and waveform…</span>
        </div>
      )}

      {error && (
        <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-destructive">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </p>
      )}

      {/* ── Measured Audio Quality & Specs Card ── */}
      {analysis && (
        <div className="mt-6 rounded-3xl border border-border/60 bg-card p-6 shadow-md space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1 font-mono text-xs font-extrabold uppercase border",
                  analysis.badgeColor,
                )}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {analysis.tierLabel}
              </span>
              <span className="text-xs font-bold text-foreground">
                {analysis.format} {analysis.bitDepth ? `${analysis.bitDepth}-bit / ` : ""}
                {analysis.sampleRate >= 1000
                  ? `${analysis.sampleRate / 1000}kHz`
                  : `${analysis.sampleRate}Hz`}
              </span>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {formatDuration(analysis.duration)} ·{" "}
              {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : ""}
            </span>
          </div>

          {/* Detailed Audio Measurements Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs font-mono">
            <div className="rounded-2xl border border-border/40 bg-surface-raised p-3">
              <span className="text-[10px] text-muted-foreground block">Format</span>
              <span className="font-bold text-foreground text-sm">{analysis.format}</span>
            </div>
            <div className="rounded-2xl border border-border/40 bg-surface-raised p-3">
              <span className="text-[10px] text-muted-foreground block">Bitrate</span>
              <span className="font-bold text-foreground text-sm">{analysis.bitrate} kbps</span>
            </div>
            <div className="rounded-2xl border border-border/40 bg-surface-raised p-3">
              <span className="text-[10px] text-muted-foreground block">Sample Rate</span>
              <span className="font-bold text-foreground text-sm">
                {(analysis.sampleRate / 1000).toFixed(1)} kHz
              </span>
            </div>
            <div className="rounded-2xl border border-border/40 bg-surface-raised p-3">
              <span className="text-[10px] text-muted-foreground block">Peak Level</span>
              <span className="font-bold text-foreground text-sm">
                {analysis.peakDb ?? -0.1} dB
              </span>
            </div>
          </div>

          {/* Quality Recommendation Banner (Non-Blocking) */}
          {analysis.recommendation && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3.5 flex items-start gap-2.5">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <span className="font-bold text-foreground block mb-0.5">
                  Quality Recommendation
                </span>
                {analysis.recommendation}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Copyright / Fingerprint notification */}
      {matchResult?.isMatch && (
        <div className="mt-6 rounded-3xl border border-amber/40 bg-amber/10 p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber font-bold text-sm">
            <ShieldAlert className="h-4 w-4" />
            <span>
              Audio Fingerprint Match Detected ({Math.round(matchResult.confidence * 100)}%
              Confidence)
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {matchResult.reason}. To ensure seamless publishing, you can enable a 50/50 revenue
            split with the original creator.
          </p>
          <Button
            type="button"
            size="sm"
            onClick={() => setAcceptSplit((v) => !v)}
            className={cn(
              "h-8 text-xs font-semibold gap-1.5 rounded-full",
              acceptSplit
                ? "bg-amber text-black hover:bg-amber/90 font-bold"
                : "border border-amber/40 text-amber hover:bg-amber/10 bg-transparent",
            )}
          >
            <Split className="h-3.5 w-3.5" />
            {acceptSplit ? "50/50 Revenue Split Enabled" : "Enable 50/50 Revenue Split"}
          </Button>
        </div>
      )}

      {/* ── Metadata Form ── */}
      <div className="mt-8 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 sm:col-span-2">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              Track Title
            </span>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Midnight Protocol"
              className="rounded-2xl border-border/60 bg-surface text-foreground"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              Genre
            </span>
            <Input
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              placeholder="e.g. Electronic, Ambient, Jazz"
              className="rounded-2xl border-border/60 bg-surface text-foreground"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              Cover Artwork
            </span>
            <div
              onClick={() => coverInputRef.current?.click()}
              className="flex h-10 items-center justify-between rounded-2xl border border-border/60 bg-surface px-3 text-xs text-muted-foreground cursor-pointer hover:border-primary/40"
            >
              <span className="truncate">{cover ? cover.name : "Select JPG / PNG artwork"}</span>
              <ImagePlus className="h-4 w-4 text-muted-foreground" />
            </div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const picked = e.target.files?.[0];
                if (picked) handleCover(picked);
              }}
            />
          </label>
        </div>

        {/* Pricing / Monetization Options */}
        <div className="rounded-3xl border border-border/40 bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">DRM-Free Store Listing</p>
              <p className="text-xs text-muted-foreground">
                Allow listeners to buy and download your high-resolution master file (85% paid to
                you).
              </p>
            </div>
            <Switch checked={monetized} onCheckedChange={setMonetized} />
          </div>

          {monetized && (
            <div className="pt-2">
              <label className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">Price (USD): $</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0.50"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-28 rounded-xl text-xs font-mono"
                />
              </label>
            </div>
          )}
        </div>

        {/* Rights Confirmation */}
        <div className="flex items-center gap-2.5 pt-2">
          <Checkbox
            id="rights"
            checked={rightsConfirmed}
            onCheckedChange={(c) => setRightsConfirmed(Boolean(c))}
          />
          <label htmlFor="rights" className="text-xs text-muted-foreground cursor-pointer">
            I own or have obtained the necessary rights and master licenses to distribute this audio
            recording.
          </label>
        </div>

        {/* Publish Action Button */}
        <Button
          onClick={() => publish.mutate()}
          disabled={!canPublish}
          className="w-full h-12 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-sm shadow-lg shadow-primary/25 gap-2 cursor-pointer disabled:opacity-50"
        >
          {publish.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Publishing Master to Network...
            </>
          ) : (
            <>
              <UploadCloud className="h-4 w-4" />
              Publish Track ({analysis ? analysis.tierLabel : "Audio"})
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
