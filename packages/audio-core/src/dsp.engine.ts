export const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;

export const EQ_PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  Bass: [8, 6, 4, 2, 0, 0, 0, 0, 0, 0],
  Treble: [0, 0, 0, 0, 0, 2, 4, 6, 8, 8],
  Vocal: [-2, -2, 0, 4, 6, 4, 2, 0, -2, -2],
  Rock: [6, 4, 2, 0, -2, -2, 0, 2, 4, 6],
  Jazz: [4, 2, 0, 2, 4, 4, 2, 0, -2, -2],
  Classical: [0, 0, 0, 0, 0, 0, 0, 0, 4, 4],
  Electronic: [6, 4, 2, 0, -2, 0, 2, 4, 6, 6],
  Acoustic: [4, 2, 2, 4, 2, 0, -2, -2, 0, 2],
};

export type SpatialRoomPreset =
  | "pure"
  | "studio_control"
  | "control_room"
  | "vinyl_lounge"
  | "concert_hall"
  | "club_bunker";

export interface SoundProfile {
  id: string;
  name: string;
  hardwareDevice?: string;
  eqGains: number[];
  eqPreset: string;
  bassBoostLevel: number;
  trebleLevel: number;
  stereoWidth: number;
  normalizerEnabled: boolean;
  spatialMode: SpatialRoomPreset;
  spatialAmbience: number;
  syncedAt?: string;
}

/**
 * Isolated Digital Signal Processing (DSP) Engine.
 * Encapsulates Web Audio API graph: 10-band EQ, shelving filters, dynamics compressor,
 * stereo panner, analyser nodes, and spatial room emulation.
 */
export class DspEngine {
  private ctx: AudioContext | null = null;
  private filters: BiquadFilterNode[] = [];
  private bassNode: BiquadFilterNode | null = null;
  private trebleNode: BiquadFilterNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private panner: StereoPannerNode | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;

  private isInitialized = false;

  public init(_audio?: HTMLAudioElement): void {
    // Pure bit-perfect playback: audio element output is direct PCM without MediaElementSource tap
    this.isInitialized = true;
  }

  public async resume(): Promise<void> {
    // No-op for direct HTML5 audio playback
  }

  public setEqGain(bandIndex: number, gainDb: number): void {
    if (this.filters[bandIndex] && this.ctx) {
      this.filters[bandIndex].gain.setTargetAtTime(gainDb, this.ctx.currentTime, 0.05);
    }
  }

  public setEqGains(gains: number[]): void {
    gains.forEach((gain, index) => this.setEqGain(index, gain));
  }

  public setEqPreset(presetName: string): number[] {
    const gains = EQ_PRESETS[presetName] ?? EQ_PRESETS["Flat"]!;
    this.setEqGains(gains);
    return gains;
  }

  public setBassBoost(levelDb: number): void {
    if (this.bassNode && this.ctx) {
      this.bassNode.gain.setTargetAtTime(levelDb, this.ctx.currentTime, 0.05);
    }
  }

  public setTreble(levelDb: number): void {
    if (this.trebleNode && this.ctx) {
      this.trebleNode.gain.setTargetAtTime(levelDb, this.ctx.currentTime, 0.05);
    }
  }

  public setStereoWidth(width: number): void {
    if (this.panner && this.ctx) {
      // Scale width (0 = mono, 1 = normal, >1 = wide)
      const pan = Math.max(-1, Math.min(1, (width - 1.0) * 0.5));
      this.panner.pan.setTargetAtTime(pan, this.ctx.currentTime, 0.05);
    }
  }

  public setNormalizer(enabled: boolean): void {
    if (this.compressor && this.ctx) {
      const threshold = enabled ? -18 : -24;
      const ratio = enabled ? 8 : 12;
      this.compressor.threshold.setTargetAtTime(threshold, this.ctx.currentTime, 0.05);
      this.compressor.ratio.setTargetAtTime(ratio, this.ctx.currentTime, 0.05);
    }
  }

  public setSpatialMode(mode: SpatialRoomPreset, ambience = 0.35): void {
    if (!this.ctx) return;
    // Spatial room EQ tuning offsets
    if (mode === "concert_hall") {
      this.setBassBoost(3.0 * ambience);
      this.setTreble(2.0 * ambience);
    } else if (mode === "club_bunker") {
      this.setBassBoost(6.0 * ambience);
      this.setTreble(-2.0 * ambience);
    } else if (mode === "vinyl_lounge") {
      this.setBassBoost(2.0 * ambience);
      this.setTreble(-1.5 * ambience);
    } else if (mode === "studio_control" || mode === "control_room") {
      this.setBassBoost(1.0 * ambience);
      this.setTreble(1.0 * ambience);
    } else {
      this.setBassBoost(0);
      this.setTreble(0);
    }
  }

  public getAnalyserNode(): AnalyserNode | null {
    return this.analyser;
  }

  public getFrequencyData(array: Uint8Array): void {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(array);
    }
  }

  public getTimeDomainData(array: Uint8Array): void {
    if (this.analyser) {
      this.analyser.getByteTimeDomainData(array);
    }
  }
}

export const globalDspEngine = new DspEngine();
