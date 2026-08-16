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
  private stereoSplitter: ChannelSplitterNode | null = null;
  private stereoMerger: ChannelMergerNode | null = null;
  private sideGain: GainNode | null = null;
  private roomDry: GainNode | null = null;
  private roomWet: GainNode | null = null;
  private roomDelayL: DelayNode | null = null;
  private roomDelayR: DelayNode | null = null;
  private roomFbL: GainNode | null = null;
  private roomFbR: GainNode | null = null;
  private roomMix: GainNode | null = null;
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

      // Sub-Bass Driver: 60Hz Low-Shelf Filter (0 to +10 dB)
      if (!win.__LAYAM_BASS_NODE__) {
        const bass = this.ctx.createBiquadFilter();
        bass.type = "lowshelf";
        bass.frequency.value = 60;
        bass.gain.value = 0;
        win.__LAYAM_BASS_NODE__ = bass;
      }
      this.bassNode = win.__LAYAM_BASS_NODE__;

      // Air & Clarity: 12kHz High-Shelf Filter (0 to +10 dB)
      if (!win.__LAYAM_TREBLE_NODE__) {
        const treble = this.ctx.createBiquadFilter();
        treble.type = "highshelf";
        treble.frequency.value = 12000;
        treble.gain.value = 0;
        win.__LAYAM_TREBLE_NODE__ = treble;
      }
      this.trebleNode = win.__LAYAM_TREBLE_NODE__;

      // Dynamic Normalizer: Mastering Dynamics Compressor Node
      if (!win.__LAYAM_COMPRESSOR_NODE__) {
        const comp = this.ctx.createDynamicsCompressor();
        // Initial state: bypassed / linear (0dB threshold, 1:1 ratio)
        comp.threshold.value = 0;
        comp.ratio.value = 1;
        comp.knee.value = 0;
        comp.attack.value = 0.003;
        comp.release.value = 0.25;
        win.__LAYAM_COMPRESSOR_NODE__ = comp;
      }
      this.compressor = win.__LAYAM_COMPRESSOR_NODE__;

      // Soundstage Expansion: Phase-Safe Mid/Side Stereo Widening Matrix
      if (!win.__LAYAM_SIDE_GAIN__) {
        const splitter = this.ctx.createChannelSplitter(2);
        const merger = this.ctx.createChannelMerger(2);

        const midSum = this.ctx.createGain(); // M = 0.5*L + 0.5*R
        midSum.gain.value = 0.5;

        const sideDiffL = this.ctx.createGain(); // 0.5*L
        sideDiffL.gain.value = 0.5;

        const sideDiffR = this.ctx.createGain(); // -0.5*R
        sideDiffR.gain.value = -0.5;

        const sideGain = this.ctx.createGain(); // S control (default 1.0 = normal stereo)
        sideGain.gain.value = 1.0;

        const outL = this.ctx.createGain(); // L = M + S
        outL.gain.value = 1.0;

        const outR = this.ctx.createGain(); // R = M - S
        outR.gain.value = 1.0;

        const sideInv = this.ctx.createGain(); // -S
        sideInv.gain.value = -1.0;

        // Connections for M/S Matrix:
        splitter.connect(midSum, 0); // L -> midSum
        splitter.connect(midSum, 1); // R -> midSum

        splitter.connect(sideDiffL, 0); // L -> sideDiffL
        splitter.connect(sideDiffR, 1); // R -> sideDiffR

        sideDiffL.connect(sideGain);
        sideDiffR.connect(sideGain);

        // Recombine to Left: M + S
        midSum.connect(outL);
        sideGain.connect(outL);
        outL.connect(merger, 0, 0);

        // Recombine to Right: M - S
        midSum.connect(outR);
        sideGain.connect(sideInv);
        sideInv.connect(outR);
        outR.connect(merger, 0, 1);

        win.__LAYAM_STEREO_SPLITTER__ = splitter;
        win.__LAYAM_STEREO_MERGER__ = merger;
        win.__LAYAM_SIDE_GAIN__ = sideGain;
      }
      this.stereoSplitter = win.__LAYAM_STEREO_SPLITTER__;
      this.stereoMerger = win.__LAYAM_STEREO_MERGER__;
      this.sideGain = win.__LAYAM_SIDE_GAIN__;

      // Spatial Room Reverb Network (Multi-Tap Cross-Feedback Delay Network)
      if (!win.__LAYAM_ROOM_DRY__) {
        const dryGain = this.ctx.createGain();
        dryGain.gain.value = 1.0;

        const wetGain = this.ctx.createGain();
        wetGain.gain.value = 0.0;

        const delayL = this.ctx.createDelay(0.5);
        delayL.delayTime.value = 0.022;

        const delayR = this.ctx.createDelay(0.5);
        delayR.delayTime.value = 0.028;

        const feedbackL = this.ctx.createGain();
        feedbackL.gain.value = 0.18;

        const feedbackR = this.ctx.createGain();
        feedbackR.gain.value = 0.18;

        const dampL = this.ctx.createBiquadFilter();
        dampL.type = "lowpass";
        dampL.frequency.value = 4500;

        const dampR = this.ctx.createBiquadFilter();
        dampR.type = "lowpass";
        dampR.frequency.value = 4500;

        const roomMix = this.ctx.createGain();
        roomMix.gain.value = 1.0;

        // Feedback network connections:
        delayL.connect(dampL);
        dampL.connect(feedbackL);
        feedbackL.connect(delayR);

        delayR.connect(dampR);
        dampR.connect(feedbackR);
        feedbackR.connect(delayL);

        // Wet output summing
        dampL.connect(wetGain);
        dampR.connect(wetGain);

        dryGain.connect(roomMix);
        wetGain.connect(roomMix);

        win.__LAYAM_ROOM_DRY__ = dryGain;
        win.__LAYAM_ROOM_WET__ = wetGain;
        win.__LAYAM_ROOM_DELAY_L__ = delayL;
        win.__LAYAM_ROOM_DELAY_R__ = delayR;
        win.__LAYAM_ROOM_FB_L__ = feedbackL;
        win.__LAYAM_ROOM_FB_R__ = feedbackR;
        win.__LAYAM_ROOM_MIX__ = roomMix;
      }
      this.roomDry = win.__LAYAM_ROOM_DRY__;
      this.roomWet = win.__LAYAM_ROOM_WET__;
      this.roomDelayL = win.__LAYAM_ROOM_DELAY_L__;
      this.roomDelayR = win.__LAYAM_ROOM_DELAY_R__;
      this.roomFbL = win.__LAYAM_ROOM_FB_L__;
      this.roomFbR = win.__LAYAM_ROOM_FB_R__;
      this.roomMix = win.__LAYAM_ROOM_MIX__;

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

      // Connect series chain: sourceNode -> filters[0..9] -> bassNode -> trebleNode -> compressor -> stereoSplitter -> (M/S) -> stereoMerger -> roomNetwork -> headroomGain -> destination
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
        this.bassNode.disconnect();
      } catch {}
      prevNode.connect(this.bassNode);
      prevNode = this.bassNode;

      try {
        this.trebleNode.disconnect();
      } catch {}
      prevNode.connect(this.trebleNode);
      prevNode = this.trebleNode;

      try {
        this.compressor.disconnect();
      } catch {}
      prevNode.connect(this.compressor);
      prevNode = this.compressor;

      try {
        if (this.stereoSplitter) {
          prevNode.connect(this.stereoSplitter);
        }
      } catch {}

      // From stereoMerger -> room network
      let roomInput: AudioNode = this.stereoMerger ?? prevNode;
      if (this.roomDry && this.roomWet && this.roomDelayL && this.roomDelayR && this.roomMix) {
        try {
          roomInput.connect(this.roomDry);
          roomInput.connect(this.roomDelayL);
          roomInput.connect(this.roomDelayR);
        } catch {}
        prevNode = this.roomMix;
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

  public getBassNode(): BiquadFilterNode | null {
    if (!this.bassNode && typeof window !== "undefined") {
      const win = window as unknown as { __LAYAM_BASS_NODE__?: BiquadFilterNode };
      if (win.__LAYAM_BASS_NODE__) {
        this.bassNode = win.__LAYAM_BASS_NODE__;
      }
    }
    return this.bassNode;
  }

  public setBassBoost(levelDb: number): void {
    const bass = this.getBassNode();
    const ctx = this.getCtx();
    if (bass && ctx) {
      const clamped = Math.max(0, Math.min(10, levelDb));
      bass.gain.setTargetAtTime(clamped, ctx.currentTime, 0.05);
    }
  }

  public getTrebleNode(): BiquadFilterNode | null {
    if (!this.trebleNode && typeof window !== "undefined") {
      const win = window as unknown as { __LAYAM_TREBLE_NODE__?: BiquadFilterNode };
      if (win.__LAYAM_TREBLE_NODE__) {
        this.trebleNode = win.__LAYAM_TREBLE_NODE__;
      }
    }
    return this.trebleNode;
  }

  public setTreble(levelDb: number): void {
    const treble = this.getTrebleNode();
    const ctx = this.getCtx();
    if (treble && ctx) {
      const clamped = Math.max(0, Math.min(10, levelDb));
      treble.gain.setTargetAtTime(clamped, ctx.currentTime, 0.05);
    }
  }

  public getSideGain(): GainNode | null {
    if (!this.sideGain && typeof window !== "undefined") {
      const win = window as unknown as { __LAYAM_SIDE_GAIN__?: GainNode };
      if (win.__LAYAM_SIDE_GAIN__) {
        this.sideGain = win.__LAYAM_SIDE_GAIN__;
      }
    }
    return this.sideGain;
  }

  public setStereoWidth(width: number): void {
    const side = this.getSideGain();
    const ctx = this.getCtx();
    if (side && ctx) {
      // Safe, subtle scaling: 0.0 = Mono (M only), 1.0 = Standard Stereo, up to 1.5x subtle width
      const clamped = Math.max(0, Math.min(1.5, width));
      side.gain.setTargetAtTime(clamped, ctx.currentTime, 0.05);
    }
  }

  public getCompressorNode(): DynamicsCompressorNode | null {
    if (!this.compressor && typeof window !== "undefined") {
      const win = window as unknown as { __LAYAM_COMPRESSOR_NODE__?: DynamicsCompressorNode };
      if (win.__LAYAM_COMPRESSOR_NODE__) {
        this.compressor = win.__LAYAM_COMPRESSOR_NODE__;
      }
    }
    return this.compressor;
  }

  public setNormalizer(enabled: boolean): void {
    const comp = this.getCompressorNode();
    const ctx = this.getCtx();
    if (comp && ctx) {
      const threshold = enabled ? -24 : 0;
      const ratio = enabled ? 12 : 1;
      const knee = enabled ? 12 : 0;
      comp.threshold.setTargetAtTime(threshold, ctx.currentTime, 0.05);
      comp.ratio.setTargetAtTime(ratio, ctx.currentTime, 0.05);
      comp.knee.setTargetAtTime(knee, ctx.currentTime, 0.05);
    }
  }

  public getRoomNodes() {
    if (!this.roomDry && typeof window !== "undefined") {
      const win = window as unknown as {
        __LAYAM_ROOM_DRY__?: GainNode;
        __LAYAM_ROOM_WET__?: GainNode;
        __LAYAM_ROOM_DELAY_L__?: DelayNode;
        __LAYAM_ROOM_DELAY_R__?: DelayNode;
        __LAYAM_ROOM_FB_L__?: GainNode;
        __LAYAM_ROOM_FB_R__?: GainNode;
        __LAYAM_ROOM_MIX__?: GainNode;
      };
      if (win.__LAYAM_ROOM_DRY__) {
        this.roomDry = win.__LAYAM_ROOM_DRY__;
        this.roomWet = win.__LAYAM_ROOM_WET__;
        this.roomDelayL = win.__LAYAM_ROOM_DELAY_L__;
        this.roomDelayR = win.__LAYAM_ROOM_DELAY_R__;
        this.roomFbL = win.__LAYAM_ROOM_FB_L__;
        this.roomFbR = win.__LAYAM_ROOM_FB_R__;
        this.roomMix = win.__LAYAM_ROOM_MIX__;
      }
    }
    return {
      dry: this.roomDry,
      wet: this.roomWet,
      delayL: this.roomDelayL,
      delayR: this.roomDelayR,
      fbL: this.roomFbL,
      fbR: this.roomFbR,
      mix: this.roomMix,
    };
  }

  public setSpatialMode(mode: SpatialRoomPreset, ambience = 0.35): void {
    const { dry, wet, delayL, delayR, fbL, fbR } = this.getRoomNodes();
    const ctx = this.getCtx();
    if (!ctx) return;

    const amb = Math.max(0, Math.min(1, ambience));

    // Room Reverberation Settings
    if (mode === "pure") {
      // Direct Monitor: 100% dry bypass, 0% wet
      dry?.gain.setTargetAtTime(1.0, ctx.currentTime, 0.05);
      wet?.gain.setTargetAtTime(0.0, ctx.currentTime, 0.05);
      fbL?.gain.setTargetAtTime(0.0, ctx.currentTime, 0.05);
      fbR?.gain.setTargetAtTime(0.0, ctx.currentTime, 0.05);
    } else if (mode === "studio_control" || mode === "control_room") {
      // Studio Master: Tight reflections, short decay
      dry?.gain.setTargetAtTime(1.0, ctx.currentTime, 0.05);
      wet?.gain.setTargetAtTime(0.18 * amb, ctx.currentTime, 0.05);
      delayL?.delayTime.setTargetAtTime(0.020, ctx.currentTime, 0.05);
      delayR?.delayTime.setTargetAtTime(0.026, ctx.currentTime, 0.05);
      fbL?.gain.setTargetAtTime(0.18, ctx.currentTime, 0.05);
      fbR?.gain.setTargetAtTime(0.18, ctx.currentTime, 0.05);
    } else if (mode === "vinyl_lounge") {
      // Acoustic Lounge: Warm room, medium absorption
      dry?.gain.setTargetAtTime(0.95, ctx.currentTime, 0.05);
      wet?.gain.setTargetAtTime(0.28 * amb, ctx.currentTime, 0.05);
      delayL?.delayTime.setTargetAtTime(0.038, ctx.currentTime, 0.05);
      delayR?.delayTime.setTargetAtTime(0.046, ctx.currentTime, 0.05);
      fbL?.gain.setTargetAtTime(0.28, ctx.currentTime, 0.05);
      fbR?.gain.setTargetAtTime(0.28, ctx.currentTime, 0.05);
    } else if (mode === "concert_hall") {
      // Concert Hall: Expansive space, large decay
      dry?.gain.setTargetAtTime(0.88, ctx.currentTime, 0.05);
      wet?.gain.setTargetAtTime(0.38 * amb, ctx.currentTime, 0.05);
      delayL?.delayTime.setTargetAtTime(0.065, ctx.currentTime, 0.05);
      delayR?.delayTime.setTargetAtTime(0.082, ctx.currentTime, 0.05);
      fbL?.gain.setTargetAtTime(0.42, ctx.currentTime, 0.05);
      fbR?.gain.setTargetAtTime(0.42, ctx.currentTime, 0.05);
    } else if (mode === "club_bunker") {
      // Club Bunker: Dense, punchy acoustic reflections
      dry?.gain.setTargetAtTime(0.92, ctx.currentTime, 0.05);
      wet?.gain.setTargetAtTime(0.32 * amb, ctx.currentTime, 0.05);
      delayL?.delayTime.setTargetAtTime(0.032, ctx.currentTime, 0.05);
      delayR?.delayTime.setTargetAtTime(0.040, ctx.currentTime, 0.05);
      fbL?.gain.setTargetAtTime(0.35, ctx.currentTime, 0.05);
      fbR?.gain.setTargetAtTime(0.35, ctx.currentTime, 0.05);
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
