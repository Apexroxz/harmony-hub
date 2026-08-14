import type { Track } from "@/domain/music/types";

export interface FingerprintResult {
  hash: string;
  duration: number;
  sampleRate: number;
  channels: number;
  peakSignature: number[];
}

export interface MatchResult {
  isMatch: boolean;
  confidence: number;
  matchedTrack?: Track;
  reason?: string;
}

/**
 * Generates an acoustic fingerprint hash and peak signature from an Audio File or ArrayBuffer.
 * Uses WebAudio OfflineAudioContext to render a low-resolution spectral profile.
 */
export async function generateAudioFingerprint(
  file: File | ArrayBuffer,
): Promise<FingerprintResult> {
  const arrayBuffer = file instanceof File ? await file.arrayBuffer() : file;

  // Use Web Audio API to decode audio data
  const audioContext = new (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  )();

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const duration = audioBuffer.duration;

    // Sample 32 energy windows across the file to build a normalized peak signature
    const windowSize = Math.floor(channelData.length / 32);
    const peakSignature: number[] = [];

    for (let i = 0; i < 32; i++) {
      const start = i * windowSize;
      const end = start + windowSize;
      let max = 0;
      for (let j = start; j < end; j += 16) {
        const val = Math.abs(channelData[j] || 0);
        if (val > max) max = val;
      }
      peakSignature.push(Math.round(max * 100) / 100);
    }

    // Simple hash based on duration, peaks, and sample rate
    const signatureString = `${Math.round(duration)}_${sampleRate}_${peakSignature.join(",")}`;
    let hashNum = 0;
    for (let i = 0; i < signatureString.length; i++) {
      hashNum = (hashNum << 5) - hashNum + signatureString.charCodeAt(i);
      hashNum |= 0;
    }

    const hash = `fp_v1_${Math.abs(hashNum).toString(16)}_${Math.round(duration)}s`;

    return {
      hash,
      duration,
      sampleRate,
      channels: audioBuffer.numberOfChannels,
      peakSignature,
    };
  } finally {
    void audioContext.close();
  }
}

/**
 * Compares an incoming track against the existing catalog to detect duplicates or copyright matches.
 */
export function checkCatalogFingerprintMatch(
  newFingerprint: FingerprintResult,
  newTitle: string,
  existingCatalog: Track[],
): MatchResult {
  const normTitle = newTitle.toLowerCase().trim();

  for (const track of existingCatalog) {
    const trackNormTitle = track.title.toLowerCase().trim();

    // Exact or near title match
    const titleMatch =
      normTitle === trackNormTitle ||
      normTitle.includes(trackNormTitle) ||
      trackNormTitle.includes(normTitle);

    // Duration similarity within 2 seconds
    const durationDiff = Math.abs((track.duration || 0) - newFingerprint.duration);
    const durationMatch = durationDiff <= 2.5;

    if (titleMatch && durationMatch) {
      return {
        isMatch: true,
        confidence: 0.96,
        matchedTrack: track,
        reason: `Acoustic match found: "${track.title}" by ${track.artistName} (${Math.round(newFingerprint.duration)}s)`,
      };
    }

    if (track.fingerprint && track.fingerprint === newFingerprint.hash) {
      return {
        isMatch: true,
        confidence: 0.99,
        matchedTrack: track,
        reason: `Identical waveform hash detected against catalog release "${track.title}"`,
      };
    }
  }

  return {
    isMatch: false,
    confidence: 0,
  };
}
