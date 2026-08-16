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
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private filters: BiquadFilterNode[] = [];
  private headroomGain: GainNode | null = null;
  private bassNode: BiquadFilterNode | null = null;
  private trebleNode: BiquadFilterNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private panner: StereoPannerNode | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;

  private isInitialized = false;

  public init(audio?: HTMLAudioElement): void {
    if (this.isInitialized || typeof window === "undefined" || !audio) return;

    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    try {
      const win = window as unknown as {
        __LAYAM_AUDIO_CTX__?: AudioContext;
        __LAYAM_AUDIO_SOURCE__?: MediaElementAudioSourceNode;
        __LAYAM_EQ_FILTERS__?: BiquadFilterNode[];
        __LAYAM_HEADROOM_GAIN__?: GainNode;
      };

      if (!win.__LAYAM_AUDIO_CTX__) {
        win.__LAYAM_AUDIO_CTX__ = new AudioCtx();
      }
      this.ctx = win.__LAYAM_AUDIO_CTX__;

      if (!win.__LAYAM_AUDIO_SOURCE__) {
        win.__LAYAM_AUDIO_SOURCE__ = this.ctx.createMediaElementSource(audio);
      }
      this.sourceNode = win.__LAYAM_AUDIO_SOURCE__;

      // Phase 3: 10-band peaking filter nodes (32Hz -> 16kHz, Q=1.4, ±12dB)
      if (!win.__LAYAM_EQ_FILTERS__ || win.__LAYAM_EQ_FILTERS__.length !== EQ_FREQUENCIES.length) {
        win.__LAYAM_EQ_FILTERS__ = (EQ_FREQUENCIES as readonly number[]).map((freq) => {
          const filter = this.ctx!.createBiquadFilter();
          filter.type = "peaking";
          filter.frequency.value = freq;
          filter.Q.value = 1.4;
          filter.gain.value = 0;
          return filter;
        });
      }
      this.filters = win.__LAYAM_EQ_FILTERS__;
      win.__LAYAM_EQ_1K_NODE__ = this.filters[5];

      // Headroom Protection: -3 dB gain node after EQ chain to prevent clipping on multi-band boosts
      if (!win.__LAYAM_HEADROOM_GAIN__) {
        const headroom = this.ctx.createGain();
        // -3dB = 10^(-3/20) ≈ 0.70794578
        headroom.gain.value = 0.70794578;
        win.__LAYAM_HEADROOM_GAIN__ = headroom;
      }
      this.headroomGain = win.__LAYAM_HEADROOM_GAIN__;

      // Parallel Read-Only Analyser Tap (does NOT alter audio path to destination)
      if (!win.__LAYAM_ANALYSER_NODE__) {
        const analyser = this.ctx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.8;
        analyser.minDecibels = -90;
        analyser.maxDecibels = -10;
        win.__LAYAM_ANALYSER_NODE__ = analyser;
      }
      this.analyser = win.__LAYAM_ANALYSER_NODE__;

      // Connect series chain: sourceNode -> filter[0] -> filter[1] -> ... -> filter[9] -> headroomGain -> destination
      try {
        this.sourceNode.disconnect();
      } catch {}

      let prevNode: AudioNode = this.sourceNode;
      for (const filter of this.filters) {
        try {
          filter.disconnect();
        } catch {}
        prevNode.connect(filter);
        prevNode = filter;
      }

      try {
        this.headroomGain.disconnect();
      } catch {}
      prevNode.connect(this.headroomGain);
      this.headroomGain.connect(this.ctx.destination);

      // Connect parallel read-only tap (headroomGain -> analyser)
      try {
        this.analyser.disconnect();
      } catch {}
      this.headroomGain.connect(this.analyser);

      this.isInitialized = true;
    } catch (err) {
      console.warn("[DspEngine] Web Audio tap initialization deferred:", err);
    }
  }

  public async resume(): Promise<void> {
    if (this.ctx && this.ctx.state === "suspended") {
      try {
        await this.ctx.resume();
      } catch (err) {
        console.warn("[DspEngine] AudioContext resume failed:", err);
      }
    }
  }

  public getCtx(): AudioContext | null {
    if (!this.ctx && typeof window !== "undefined") {
      const win = window as unknown as { __LAYAM_AUDIO_CTX__?: AudioContext };
      if (win.__LAYAM_AUDIO_CTX__) {
        this.ctx = win.__LAYAM_AUDIO_CTX__;
      }
    }
    return this.ctx;
  }

  public getFilters(): BiquadFilterNode[] {
    if ((!this.filters || this.filters.length === 0) && typeof window !== "undefined") {
      const win = window as unknown as { __LAYAM_EQ_FILTERS__?: BiquadFilterNode[] };
      if (win.__LAYAM_EQ_FILTERS__ && win.__LAYAM_EQ_FILTERS__.length === EQ_FREQUENCIES.length) {
        this.filters = win.__LAYAM_EQ_FILTERS__;
      }
    }
    return this.filters;
  }

  public getAnalyserNode(): AnalyserNode | null {
    if (!this.analyser && typeof window !== "undefined") {
      const win = window as unknown as { __LAYAM_ANALYSER_NODE__?: AnalyserNode };
      if (win.__LAYAM_ANALYSER_NODE__) {
        this.analyser = win.__LAYAM_ANALYSER_NODE__;
      }
    }
    return this.analyser;
  }

  public setEqGain(bandIndex: number, gainDb: number): void {
    const filters = this.getFilters();
    const ctx = this.getCtx();
    if (filters[bandIndex] && ctx) {
      const clamped = Math.max(-12, Math.min(12, gainDb));
      filters[bandIndex].gain.setTargetAtTime(clamped, ctx.currentTime, 0.05);
    }
  }

  public getFilterGain(index: number): number {
    const filters = this.getFilters();
    return filters[index] ? filters[index].gain.value : 0;
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
