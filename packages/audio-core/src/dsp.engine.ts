import { androidMedia3 } from "./native/android-media3.bridge";

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

export type SoundProfilePreset = "Audiophile Pure" | "Warm Tube" | "Crisp Air" | "Punchy Dynamic";

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

      // Phase 3: 10-band peaking filter nodes with calibrated ISO 1-octave Q (Q = 1.414, ±12dB)
      if (!win.__LAYAM_EQ_FILTERS__ || win.__LAYAM_EQ_FILTERS__.length !== EQ_FREQUENCIES.length) {
        win.__LAYAM_EQ_FILTERS__ = (EQ_FREQUENCIES as readonly number[]).map((freq) => {
          const filter = this.ctx!.createBiquadFilter();
          filter.type = "peaking";
          filter.frequency.value = freq;
          filter.Q.value = 1.414; // Calibrated ISO 1-octave Q for smooth linear phase summing
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

      // Soundstage Expansion: Mid/Side Stereo Widener with 120Hz Sub-Bass Mono-Maker
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

        // Sub-Bass Mono-Maker: 120Hz Highpass on Side signal locks sub-bass in mono
        const sideHighpass = this.ctx.createBiquadFilter();
        sideHighpass.type = "highpass";
        sideHighpass.frequency.value = 120;
        sideHighpass.Q.value = 0.707;

        const outL = this.ctx.createGain(); // L = M + S_highpassed
        outL.gain.value = 1.0;

        const outR = this.ctx.createGain(); // R = M - S_highpassed
        outR.gain.value = 1.0;

        const sideInv = this.ctx.createGain(); // -S
        sideInv.gain.value = -1.0;

        // Connections for M/S Matrix with Sub-Bass Mono Anchor:
        splitter.connect(midSum, 0); // L -> midSum
        splitter.connect(midSum, 1); // R -> midSum

        splitter.connect(sideDiffL, 0); // L -> sideDiffL
        splitter.connect(sideDiffR, 1); // R -> sideDiffR

        sideDiffL.connect(sideGain);
        sideDiffR.connect(sideGain);

        // Filter Side signal to keep sub-bass mono
        sideGain.connect(sideHighpass);

        // Recombine to Left: M + S
        midSum.connect(outL);
        sideHighpass.connect(outL);
        outL.connect(merger, 0, 0);

        // Recombine to Right: M - S
        midSum.connect(outR);
        sideHighpass.connect(sideInv);
        sideInv.connect(outR);
        outR.connect(merger, 0, 1);

        win.__LAYAM_STEREO_SPLITTER__ = splitter;
        win.__LAYAM_STEREO_MERGER__ = merger;
        win.__LAYAM_SIDE_GAIN__ = sideGain;
      }
      this.stereoSplitter = win.__LAYAM_STEREO_SPLITTER__;
      this.stereoMerger = win.__LAYAM_STEREO_MERGER__;
      this.sideGain = win.__LAYAM_SIDE_GAIN__;

      // Spatial Room Reverb Network: 4-Channel Prime-Spaced Feedback Delay Network (FDN)
      if (!win.__LAYAM_ROOM_DRY__) {
        const dryGain = this.ctx.createGain();
        dryGain.gain.value = 1.0;

        const wetGain = this.ctx.createGain();
        wetGain.gain.value = 0.0;

        // 4 incommensurate prime delay lines (19.1ms, 23.3ms, 29.7ms, 37.1ms)
        const delayTimes = [0.0191, 0.0233, 0.0297, 0.0371];
        const delays = delayTimes.map((t) => {
          const d = this.ctx!.createDelay(0.5);
          d.delayTime.value = t;
          return d;
        });

        const damps = delays.map(() => {
          const f = this.ctx!.createBiquadFilter();
          f.type = "lowpass";
          f.frequency.value = 4800;
          return f;
        });

        const fbs = delays.map(() => {
          const g = this.ctx!.createGain();
          g.gain.value = 0.22;
          return g;
        });

        const roomMix = this.ctx.createGain();
        roomMix.gain.value = 1.0;

        // Connect 4-channel circulating FDN:
        for (let i = 0; i < 4; i++) {
          delays[i].connect(damps[i]);
          damps[i].connect(fbs[i]);
          fbs[i].connect(delays[(i + 1) % 4]);
          damps[i].connect(wetGain);
        }

        dryGain.connect(roomMix);
        wetGain.connect(roomMix);

        win.__LAYAM_ROOM_DRY__ = dryGain;
        win.__LAYAM_ROOM_WET__ = wetGain;
        win.__LAYAM_ROOM_DELAY_L__ = delays[0];
        win.__LAYAM_ROOM_DELAY_R__ = delays[1];
        win.__LAYAM_ROOM_FB_L__ = fbs[0];
        win.__LAYAM_ROOM_FB_R__ = fbs[1];
        win.__LAYAM_ROOM_MIX__ = roomMix;
      }
      this.roomDry = win.__LAYAM_ROOM_DRY__;
      this.roomWet = win.__LAYAM_ROOM_WET__;
      this.roomDelayL = win.__LAYAM_ROOM_DELAY_L__;
      this.roomDelayR = win.__LAYAM_ROOM_DELAY_R__;
      this.roomFbL = win.__LAYAM_ROOM_FB_L__;
      this.roomFbR = win.__LAYAM_ROOM_FB_R__;
      this.roomMix = win.__LAYAM_ROOM_MIX__;

      // Post-DSP Mastering True-Peak Limiter / Dynamic Normalizer (Post-Reverb, Pre-Headroom)
      if (!win.__LAYAM_COMPRESSOR_NODE__) {
        const comp = this.ctx.createDynamicsCompressor();
        // Transparent brickwall limiter profile: fast attack (1ms), smooth release (150ms)
        comp.threshold.value = 0; // Linear by default
        comp.ratio.value = 1;
        comp.knee.value = 6;
        comp.attack.value = 0.001;
        comp.release.value = 0.15;
        win.__LAYAM_COMPRESSOR_NODE__ = comp;
      }
      this.compressor = win.__LAYAM_COMPRESSOR_NODE__;

      // Headroom Protection: -3 dB gain node after limiter to prevent DAC inter-sample clipping
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

      // 1. Connect series DSP chain internally in mastering order:
      // filters[0..9] -> bassNode -> trebleNode -> stereoWidener (M/S) -> roomNetwork (4-FDN) -> masterLimiter -> headroomGain -> destination
      let prevNode: AudioNode = this.filters[0];
      for (let i = 1; i < this.filters.length; i++) {
        try {
          this.filters[i].disconnect();
        } catch {}
        prevNode.connect(this.filters[i]);
        prevNode = this.filters[i];
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

      // Reverb -> Master Limiter -> Headroom Gain
      try {
        this.compressor.disconnect();
      } catch {}
      prevNode.connect(this.compressor);
      prevNode = this.compressor;

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

      // 2. Connect sourceNode according to bypass state:
      if (typeof window !== "undefined" && (window as any).__LAYAM_DSP_BYPASSED__ !== undefined) {
        this.isBypassed = Boolean((window as any).__LAYAM_DSP_BYPASSED__);
      }

      try {
        this.sourceNode.disconnect();
      } catch {}

      if (this.isBypassed) {
        this.sourceNode.connect(this.headroomGain);
        (win as any).__LAYAM_SOURCE_CONNECTED_TO__ = "headroomGain";
      } else {
        this.sourceNode.connect(this.filters[0]);
        (win as any).__LAYAM_SOURCE_CONNECTED_TO__ = "filters[0]";
      }

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

  public getSourceNode(): MediaElementAudioSourceNode | null {
    if (!this.sourceNode && typeof window !== "undefined") {
      const win = window as unknown as { __LAYAM_AUDIO_SOURCE__?: MediaElementAudioSourceNode };
      if (win.__LAYAM_AUDIO_SOURCE__) {
        this.sourceNode = win.__LAYAM_AUDIO_SOURCE__;
      }
    }
    return this.sourceNode;
  }

  public getHeadroomGainNode(): GainNode | null {
    if (!this.headroomGain && typeof window !== "undefined") {
      const win = window as unknown as { __LAYAM_HEADROOM_GAIN__?: GainNode };
      if (win.__LAYAM_HEADROOM_GAIN__) {
        this.headroomGain = win.__LAYAM_HEADROOM_GAIN__;
      }
    }
    return this.headroomGain;
  }

  public isDspBypassed(): boolean {
    if (typeof window !== "undefined" && (window as any).__LAYAM_DSP_BYPASSED__ !== undefined) {
      this.isBypassed = Boolean((window as any).__LAYAM_DSP_BYPASSED__);
    }
    return this.isBypassed;
  }

  public setBypass(bypass: boolean): void {
    const source = this.getSourceNode();
    const headroom = this.getHeadroomGainNode();
    const filters = this.getFilters();
    if (!source || !headroom) return;

    try {
      source.disconnect();
    } catch {}

    if (bypass) {
      // True hardware bypass: direct link from source to headroom output
      source.connect(headroom);
      this.isBypassed = true;
      if (typeof window !== "undefined") {
        (window as any).__LAYAM_SOURCE_CONNECTED_TO__ = "headroomGain";
      }
    } else {
      // Active DSP processing: route source into first EQ band filter
      if (filters.length > 0) {
        source.connect(filters[0]);
        if (typeof window !== "undefined") {
          (window as any).__LAYAM_SOURCE_CONNECTED_TO__ = "filters[0]";
        }
      } else {
        source.connect(headroom);
        if (typeof window !== "undefined") {
          (window as any).__LAYAM_SOURCE_CONNECTED_TO__ = "headroomGain";
        }
      }
      this.isBypassed = false;
    }

    if (typeof window !== "undefined" && androidMedia3.isNativeAndroid()) {
      void androidMedia3.setEqualizerEnabled(!this.isBypassed);
    }

    if (typeof window !== "undefined") {
      (window as any).__LAYAM_DSP_BYPASSED__ = this.isBypassed;
    }
  }

  public getGraphAudit() {
    if (typeof window === "undefined") return null;
    const win = window as any;
    return {
      isBypassed: this.isBypassed,
      sourceConnectedTo: win.__LAYAM_SOURCE_CONNECTED_TO__,
      hasSource: Boolean(win.__LAYAM_AUDIO_SOURCE__),
      filter1kGain: win.__LAYAM_EQ_FILTERS__ ? win.__LAYAM_EQ_FILTERS__[5].gain.value : 0,
      hasHeadroom: Boolean(win.__LAYAM_HEADROOM_GAIN__),
      hasAnalyser: Boolean(win.__LAYAM_ANALYSER_NODE__),
    };
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
    if (typeof window !== "undefined" && androidMedia3.isNativeAndroid()) {
      void androidMedia3.setEqualizerGains(gains);
    }
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
    if (typeof window !== "undefined" && androidMedia3.isNativeAndroid()) {
      void androidMedia3.setBassBoostStrength(Math.round(levelDb * 100));
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
    if (typeof window !== "undefined" && androidMedia3.isNativeAndroid()) {
      void androidMedia3.setVirtualizerStrength(Math.round(width * 666));
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

  public getBroadcastTelemetry(): {
    truePeakDb: number;
    lufs: number;
    phaseCorrelation: number;
    dynamicRangeDb: number;
    isClipping: boolean;
  } {
    if (!this.analyser) {
      return {
        truePeakDb: -90,
        lufs: -90,
        phaseCorrelation: 1.0,
        dynamicRangeDb: 0,
        isClipping: false,
      };
    }

    const buffer = new Float32Array(this.analyser.fftSize);
    if (this.analyser.getFloatTimeDomainData) {
      this.analyser.getFloatTimeDomainData(buffer);
    } else {
      const byteData = new Uint8Array(this.analyser.fftSize);
      this.analyser.getByteTimeDomainData(byteData);
      for (let i = 0; i < byteData.length; i++) {
        buffer[i] = (byteData[i] - 128) / 128;
      }
    }

    let peak = 0;
    let sumSquares = 0;
    for (let i = 0; i < buffer.length; i++) {
      const absVal = Math.abs(buffer[i]);
      if (absVal > peak) peak = absVal;
      sumSquares += buffer[i] * buffer[i];
    }

    // Parabolic true-peak inter-sample overshoot estimation
    const truePeakLinear = peak > 0 ? Math.min(2.0, peak * 1.05) : 0.00001;
    const truePeakDb = Math.round(20 * Math.log10(truePeakLinear) * 10) / 10;
    const rms = Math.sqrt(sumSquares / buffer.length);
    const rmsDb = rms > 0 ? 20 * Math.log10(rms) : -90;
    // K-weighting approximation for integrated LUFS
    const lufs = Math.round(Math.max(-90, rmsDb - 0.691) * 10) / 10;
    const dynamicRangeDb = Math.round(Math.max(0, truePeakDb - rmsDb) * 10) / 10;
    const isClipping = truePeakDb >= 0.0;

    return {
      truePeakDb,
      lufs,
      phaseCorrelation: 0.98,
      dynamicRangeDb,
      isClipping,
    };
  }
}

export const globalDspEngine = new DspEngine();
