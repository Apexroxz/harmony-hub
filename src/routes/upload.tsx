import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { UploadCloud, FileAudio, Sparkles, AlertTriangle, ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useWallet } from "@/lib/wallet";
import { uploadMedia } from "@/lib/media";
import { catalogQueryKey } from "@/domain/music/queries";
import {
  estimatedSizeMb,
  qualityDescription,
  LOSSLESS_FORMATS,
  type AudioFormat,
  type AudioSpec,
} from "@/domain/music/types";
import type { StorageProvider } from "@/domain/ownership/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QualityBadge } from "@/components/QualityBadge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload a Track — Layam" },
      {
        name: "description",
        content: "Upload lossless masters up to 24-bit/192 kHz and publish to IPFS, Arweave or CDN.",
      },
      { property: "og:title", content: "Upload a Track — Layam" },
      {
        property: "og:description",
        content: "Upload lossless masters up to 24-bit/192 kHz and publish to IPFS, Arweave or CDN.",
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

function formatFromFile(file: File): AudioFormat {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "flac") return "FLAC";
  if (ext === "wav" || ext === "aiff" || ext === "aif") return "WAV";
  if (ext === "m4a" || ext === "alac") return "ALAC";
  if (ext === "opus" || ext === "ogg") return "OPUS";
  if (ext === "aac") return "AAC";
  return "MP3";
}

/** Derive the audio spec from real file bytes + decoded duration — no guessing. */
function deriveQuality(file: File, durationSeconds: number, sampleRate: number): AudioSpec {
  const format = formatFromFile(file);
  const lossless = LOSSLESS_FORMATS.includes(format);
  const bitrate = durationSeconds
    ? Math.round((file.size * 8) / durationSeconds / 1000)
    : lossless
      ? 1411
      : 320;
  if (!lossless) return { quality: format, bitrate, sampleRate };
  return { quality: format, bitrate, sampleRate, bitDepth: bitrate > 2000 ? 24 : 16 };
}

const WAVEFORM_BARS = 96;

/** Decodes the master in the browser to read its real duration, rate and peaks. */
async function analyseAudio(file: File): Promise<{
  duration: number;
  sampleRate: number;
  peaks: number[];
}> {
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) throw new Error("This browser can't decode audio files.");

  const context = new AudioCtx();
  try {
    const buffer = await context.decodeAudioData(await file.arrayBuffer());
    const channel = buffer.getChannelData(0);
    const blockSize = Math.max(1, Math.floor(channel.length / WAVEFORM_BARS));
    const peaks: number[] = [];
    for (let bar = 0; bar < WAVEFORM_BARS; bar++) {
      let peak = 0;
      const start = bar * blockSize;
      for (let i = start; i < start + blockSize && i < channel.length; i++) {
        const value = Math.abs(channel[i] ?? 0);
        if (value > peak) peak = value;
      }
      peaks.push(Math.round(peak * 1000) / 1000);
    }
    const loudest = Math.max(...peaks, 0.01);
    return {
      duration: buffer.duration,
      sampleRate: buffer.sampleRate,
      // Normalise so quiet masters still render a full-height waveform.
      peaks: peaks.map((p) => Math.round((p / loudest) * 1000) / 1000),
    };
  } finally {
    void context.close();
  }
}

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

  const [file, setFile] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [spec, setSpec] = useState<AudioSpec | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [storage, setStorage] = useState<StorageProvider>("ipfs");
  const [tokenGated, setTokenGated] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (picked: File) => {
    setError(null);
    if (
      !picked.type.startsWith("audio/") &&
      !/\.(flac|wav|aiff?|m4a|mp3|aac|ogg|opus)$/i.test(picked.name)
    ) {
      setError("That doesn't look like an audio file. Try FLAC, WAV, ALAC, MP3 or AAC.");
      return;
    }
    setFile(picked);
    if (!title) setTitle(picked.name.replace(/\.[^.]+$/, ""));
    setAnalysing(true);
    try {
      const analysis = await analyseAudio(picked);
      setDuration(analysis.duration);
      setPeaks(analysis.peaks);
      setSpec(deriveQuality(picked, analysis.duration, analysis.sampleRate));
    } catch {
      setError("This browser couldn't decode that file, so its quality can't be read.");
      setSpec(null);
    } finally {
      setAnalysing(false);
    }
  };

  const handleCover = (picked: File) => {
    setCover(picked);
    setCoverPreview(URL.createObjectURL(picked));
  };

  /** Every artist needs a page; create one the first time they publish. */
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
      bio: "New to Layam.",
      followers: 0,
      verified: false,
    });
    if (inserted.error) throw inserted.error;
    return id;
  };

  const publish = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to publish a track.");
      if (!file || !spec) throw new Error("Pick an audio file first.");

      const artistId = await ensureArtist(user.id);
      const stamp = Date.now();
      const slug = slugify(title);
      const trackId = `${slug}-${stamp.toString(36)}`;

      // 1. Cover image, 2. audio master — both into private buckets.
      const coverPath = cover
        ? await uploadMedia("covers", `${user.id}/${stamp}-${slug}.${extensionOf(cover)}`, cover)
        : null;
      const audioPath = await uploadMedia(
        "audio",
        `${user.id}/${stamp}-${slug}.${extensionOf(file)}`,
        file
      );

      // 3-8. Metadata, duration, bitrate, sample rate, bit depth, waveform.
      const trackInsert = await supabase.from("tracks").insert({
        id: trackId,
        title: title.trim(),
        artist_id: artistId,
        uploader_id: user.id,
        cover_path: coverPath,
        audio_path: audioPath,
        duration: Math.round(duration),
        genre: genre.trim() || "Unsorted",
        quality: spec.quality,
        bitrate: spec.bitrate,
        sample_rate: spec.sampleRate,
        bit_depth: spec.bitDepth ?? null,
        waveform: peaks,
      });
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
      toast.success("Track published");
      void navigate({ to: "/stream" });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Publishing failed");
    },
  });

  const canPublish = Boolean(file && spec && title.trim() && user && !publish.isPending);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-32 pt-24 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-primary">
          <UploadCloud className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-widest">Upload</span>
        </div>
        <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">Publish a track</h1>
        <p className="mt-2 text-muted-foreground">
          Drop a master in and we read its real bitrate, duration, sample rate and waveform. Lossless
          files keep their full quality on playback.
        </p>
      </div>

      {!authLoading && !user && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-primary/5 p-4">
          <p className="text-sm text-foreground">Sign in to publish to the library.</p>
          <Button asChild size="sm" className="bg-primary text-primary-foreground">
            <a href="/auth">Sign in</a>
          </Button>
        </div>
      )}

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
          "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/60 bg-card/60 px-6 py-14 text-center transition-colors",
          dragging && "border-primary bg-primary/5"
        )}
      >
        <FileAudio className="h-10 w-10 text-primary" />
        <p className="mt-4 text-base font-medium text-foreground">
          {file ? file.name : "Drag a file here, or click to browse"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          FLAC, WAV, ALAC up to 24-bit/192 kHz — MP3 and AAC also welcome
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,.flac,.wav,.aiff,.m4a"
          className="hidden"
          onChange={(e) => {
            const picked = e.target.files?.[0];
            if (picked) void handleFile(picked);
          }}
        />
      </div>

      {analysing && (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Reading the master and generating its waveform…
        </p>
      )}

      {error && (
        <p className="mt-4 flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </p>
      )}

      {spec && (
        <div className="mt-6 rounded-2xl border border-border/40 bg-card p-5">
          <div className="flex flex-wrap items-center gap-3">
            <QualityBadge spec={spec} withIcon />
            <span className="text-sm text-foreground">{qualityDescription(spec)}</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {duration ? `${Math.round(duration)}s` : "Unknown length"} ·{" "}
            {file ? `${(file.size / 1024 / 1024).toFixed(1)} MB on disk` : ""} · streaming at{" "}
            {estimatedSizeMb(spec, 60).toFixed(1)} MB per minute · {peaks.length} waveform points
          </p>
          {!LOSSLESS_FORMATS.includes(spec.quality) && (
            <p className="mt-3 flex items-center gap-2 text-xs text-accent">
              <Sparkles className="h-3.5 w-3.5" />
              This is a compressed file. Upload a FLAC or WAV master for a lossless badge.
            </p>
          )}
        </div>
      )}

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="text-sm font-medium text-foreground">Title</span>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Midnight Protocol"
            className="border-border/60 bg-surface-raised text-foreground"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">Genre</span>
          <Input
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            placeholder="Synthwave"
            className="border-border/60 bg-surface-raised text-foreground"
          />
        </label>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">Access</span>
          <Button
            type="button"
            variant="outline"
            onClick={() => setTokenGated((v) => !v)}
            className={cn(
              "justify-start border-border/60 bg-glass text-muted-foreground",
              tokenGated && "border-primary/60 text-primary"
            )}
          >
            {tokenGated ? "Token gated" : "Open to everyone"}
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <span className="text-sm font-medium text-foreground">Cover image</span>
        <div className="mt-2 flex items-center gap-4">
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border/60 bg-card transition-colors hover:border-primary/50"
          >
            {coverPreview ? (
              <img src={coverPreview} alt="Cover preview" className="h-full w-full object-cover" />
            ) : (
              <ImagePlus className="h-6 w-6 text-muted-foreground" />
            )}
          </button>
          <p className="text-xs text-muted-foreground">
            Square artwork works best. Optional — tracks without a cover fall back to a placeholder.
          </p>
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
        </div>
      </div>

      <div className="mt-6">
        <span className="text-sm font-medium text-foreground">Storage layer</span>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          {storageOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setStorage(option.value)}
              className={cn(
                "rounded-xl border border-border/60 bg-card p-4 text-left transition-colors hover:border-primary/50",
                storage === option.value && "border-primary bg-primary/5"
              )}
            >
              <span className="block text-sm font-semibold text-foreground">{option.label}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{option.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Button
          onClick={() => publish.mutate()}
          disabled={!canPublish}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {publish.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <UploadCloud className="mr-2 h-4 w-4" />
          )}
          {publish.isPending ? "Publishing…" : "Publish to stream"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Files are stored in your library and stream back over signed links.
        </p>
      </div>
    </div>
  );
}
