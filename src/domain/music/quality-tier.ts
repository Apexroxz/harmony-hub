import type { AudioSpec } from "./types";

export type QualityTier = "studio_master" | "lossless" | "high_quality" | "standard_quality";

export interface QualityAnalysis {
  tier: QualityTier;
  tierLabel: string;
  badgeColor: string;
  format: string;
  bitrate: number;
  sampleRate: number;
  bitDepth?: number;
  duration: number;
  peakDb?: number;
  rms?: number;
  loudnessLu?: number;
  recommendation?: string;
}

export const SUPPORTED_AUDIO_EXTENSIONS = [
  "mp3",
  "aac",
  "m4a",
  "ogg",
  "opus",
  "wav",
  "flac",
  "alac",
  "aiff",
  "aif",
];

export function getAudioFormatName(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "mp3";
  switch (ext) {
    case "flac":
      return "FLAC";
    case "wav":
      return "WAV";
    case "aiff":
    case "aif":
      return "AIFF";
    case "alac":
    case "m4a":
      return "ALAC";
    case "aac":
      return "AAC";
    case "ogg":
    case "opus":
      return "OGG";
    case "mp3":
    default:
      return "MP3";
  }
}

export function classifyQualityTier(spec: {
  format: string;
  bitrate: number;
  sampleRate: number;
  bitDepth?: number;
}): { tier: QualityTier; tierLabel: string; recommendation?: string } {
  const isUncompressed = ["FLAC", "WAV", "AIFF", "ALAC"].includes(spec.format.toUpperCase());

  // 1. Studio Master: Lossless >= 24-bit or >= 88.2 kHz
  if (isUncompressed && ((spec.bitDepth && spec.bitDepth >= 24) || spec.sampleRate >= 88200)) {
    return {
      tier: "studio_master",
      tierLabel: "Studio Master",
    };
  }

  // 2. Lossless: CD Quality (16-bit / 44.1kHz or 48kHz)
  if (isUncompressed) {
    return {
      tier: "lossless",
      tierLabel: "Lossless",
      recommendation: "Master uploaded in CD quality. Upload a 24-bit / 96kHz master for the Studio Master badge.",
    };
  }

  // 3. High Quality: MP3/AAC >= 256 kbps
  if (spec.bitrate >= 256) {
    return {
      tier: "high_quality",
      tierLabel: "High Quality",
      recommendation: "High quality compressed audio. Upload a WAV or FLAC master for bit-perfect Lossless playback.",
    };
  }

  // 4. Standard Quality: MP3/AAC < 256 kbps
  return {
    tier: "standard_quality",
    tierLabel: "Standard Quality",
    recommendation: "Standard compressed file. We recommend uploading a 320kbps MP3 or lossless WAV/FLAC master for optimal audio fidelity.",
  };
}

export async function analyzeAudioFile(file: File): Promise<QualityAnalysis & { peaks: number[] }> {
  const format = getAudioFormatName(file.name);
  const isUncompressed = ["FLAC", "WAV", "AIFF", "ALAC"].includes(format);

  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  let duration = 0;
  let sampleRate = 44100;
  let peaks: number[] = [];
  let peakDb = -0.1;
  let rms = 0.2;

  if (AudioCtx) {
    try {
      const context = new AudioCtx();
      const arrayBuf = await file.arrayBuffer();
      const buffer = await context.decodeAudioData(arrayBuf);
      duration = buffer.duration;
      sampleRate = buffer.sampleRate;

      const channel = buffer.getChannelData(0);
      const totalSamples = channel.length;
      const barCount = 96;
      const blockSize = Math.max(1, Math.floor(totalSamples / barCount));

      let sumSquares = 0;
      let maxAbs = 0;

      for (let bar = 0; bar < barCount; bar++) {
        let barMax = 0;
        const start = bar * blockSize;
        for (let i = start; i < start + blockSize && i < totalSamples; i++) {
          const val = Math.abs(channel[i] || 0);
          if (val > barMax) barMax = val;
          sumSquares += val * val;
          if (val > maxAbs) maxAbs = val;
        }
        peaks.push(Math.round(barMax * 1000) / 1000);
      }

      rms = Math.sqrt(sumSquares / totalSamples);
      peakDb = maxAbs > 0 ? Math.round(20 * Math.log10(maxAbs) * 10) / 10 : -60;

      const loudest = Math.max(...peaks, 0.01);
      peaks = peaks.map((p) => Math.round((p / loudest) * 1000) / 1000);

      void context.close();
    } catch {
      // Fallback for MP3s or browser decoding hiccups - NEVER block the upload
      duration = Math.max(30, Math.round(file.size / (192 * 1024 / 8)));
      peaks = Array.from({ length: 96 }).map(() => Math.round((Math.random() * 0.6 + 0.4) * 1000) / 1000);
    }
  }

  // Calculate bitrate
  const bitrate = duration > 0
    ? Math.round((file.size * 8) / duration / 1000)
    : isUncompressed ? 1411 : 320;

  const bitDepth = isUncompressed ? (bitrate > 2000 || sampleRate >= 88200 ? 24 : 16) : undefined;

  const classification = classifyQualityTier({
    format,
    bitrate,
    sampleRate,
    bitDepth,
  });

  let badgeColor = "bg-surface-raised text-muted-foreground border-border/60";
  if (classification.tier === "studio_master") {
    badgeColor = "bg-amber/15 text-amber border-amber/40 shadow-sm shadow-amber/10";
  } else if (classification.tier === "lossless") {
    badgeColor = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  } else if (classification.tier === "high_quality") {
    badgeColor = "bg-primary/15 text-primary border-primary/30";
  }

  return {
    tier: classification.tier,
    tierLabel: classification.tierLabel,
    badgeColor,
    format,
    bitrate,
    sampleRate,
    bitDepth,
    duration,
    peakDb,
    rms: Math.round(rms * 100) / 100,
    loudnessLu: Math.round((20 * Math.log10(rms || 0.01)) * 10) / 10,
    recommendation: classification.recommendation,
    peaks,
  };
}
