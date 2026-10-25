export interface LyricLine {
  time: number; // in seconds
  text: string;
}

/**
 * Parses standard LRC timestamped text [mm:ss.xx] into structured lines.
 */
export function parseLrc(lrcText: string): LyricLine[] {
  const lines = lrcText.split("\n");
  const result: LyricLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Extract all timestamps in the line (handles multi-timestamp lines)
    const matches = [...trimmed.matchAll(timeRegex)];
    if (matches.length === 0) continue;

    const text = trimmed.replace(timeRegex, "").trim();
    if (!text) continue;

    for (const match of matches) {
      const min = parseInt(match[1] || "0", 10);
      const sec = parseInt(match[2] || "0", 10);
      const ms = match[3] ? parseInt(match[3].padEnd(3, "0").slice(0, 3), 10) : 0;
      const totalSeconds = min * 60 + sec + ms / 1000;
      result.push({ time: totalSeconds, text });
    }
  }

  return result.sort((a, b) => a.time - b.time);
}

/**
 * Curated synced lyrics for catalog & demo tracks
 */
const CATALOG_LYRICS: Record<string, string> = {
  "Midnight Protocol": `
[00:04.00] (Low frequency analog synth pulses in)
[00:12.50] Into the neon grid where circuits hum
[00:20.00] A resonant pulse, the digital drum
[00:28.20] Midnight Protocol is taking the lead
[00:36.40] Shifting through lines at lightning speed
[00:48.00] Feel the sub-bass rise from the floor
[00:56.50] Uncompressed waves and nothing more
[01:06.00] Echoes in the dark...
[01:14.20] Reaching through the analog spark
[01:24.00] (Deep sub-bass drop and resonance)
[01:42.00] Timeless frequencies in the lower band
[01:52.00] Pure clarity across the land
[02:05.00] Dissolving into warm harmonic silence...
`,
  "Chain Reaction": `
[00:06.00] (Heavy industrial modular arpeggio)
[00:15.00] Blocks connecting across the stream
[00:23.50] Turning the vision into reality, not a dream
[00:32.00] Chain reaction sparking bright
[00:41.00] 24-bit audio cutting through the night
[00:52.00] Zero distortion, maximum gain
[01:02.00] Pure lossless signal running through the vein
[01:15.00] High-resolution transient attack
[01:28.00] Bringing the true dynamics back
[01:45.00] (Massive stereo field explosion)
[02:00.00] Infinite resolution in the mix...
`,
  "Subterranean Echoes": `
[00:04.00] (Low frequency atmospheric hum)
[00:12.50] Into the depths where shadows hum
[00:20.00] A resonant pulse, the ancient drum
[00:28.20] Subterranean echoes guide the way
[00:36.40] Through obsidian caves where secrets stay
[00:48.00] Feel the bass line rise from the stone
[00:56.50] Vibrating wires, you are not alone
[01:06.00] Echoes in the dark...
[01:14.20] Reaching through the analog spark
[01:24.00] (Deep sub-bass swell and resonance)
[01:42.00] Timeless waves in the lower register
[01:52.00] Clarity found beneath the surface
[02:05.00] Dissolving into warm harmonic silence...
`,
  "Ethereal Horizons": `
[00:06.00] (Lush shimmer reverb fading in)
[00:15.00] Dawn breaks across the synthetic plain
[00:23.50] Light washing over the gentle rain
[00:32.00] Chasing the horizon, boundless and clear
[00:41.00] High-resolution textures drawing near
[00:52.00] Feel the openness, let the sound breathe
[01:02.00] Pure spatial warmth in every degree
[01:15.00] Golden frequencies floating high
[01:28.00] Merging seamlessly with the velvet sky
[01:45.00] (Crystal vocal harmonics)
[02:00.00] Infinite space, perfect repose...
`,
  "Quantum Drift": `
[00:05.00] (Punchy analog kick & arpeggio)
[00:14.00] Synchronized pulses in 4D space
[00:21.00] Shifting the continuum at our own pace
[00:28.50] Quantum particles align in the groove
[00:36.00] Zero resistance, we start to move
[00:46.00] Modulate the filter, open up wide
[00:54.00] Across the frequency divide
[01:08.00] Drop the transient, hear it ring
[01:18.00] Pure studio clarity in everything
[01:32.00] Drift through the waveform...
[01:48.00] Master output locking in...
`,
  "Analog Dreams": `
[00:08.00] (Tape warmth and vinyl flutter)
[00:18.00] Vintage circuits warm to the touch
[00:26.50] Vacuum tubes that we love so much
[00:35.00] Saturate the memories, bring them alive
[00:44.00] Where pure harmonics and tape survive
[00:56.00] 24 bits of dynamic grace
[01:06.00] Timeless sound in a modern space
[01:20.00] Dream in analog...
[01:36.00] Purest signal on the wire...
`,
};

/**
 * Returns synced lyrics for any track, either from curated LRC catalog or generated dynamically.
 */
export function getTrackLyrics(trackTitle: string, artistName: string, duration: number): LyricLine[] {
  // Check exact or partial match in curated lyrics
  for (const [titleKey, lrc] of Object.entries(CATALOG_LYRICS)) {
    if (trackTitle.toLowerCase().includes(titleKey.toLowerCase())) {
      return parseLrc(lrc);
    }
  }

  // Algorithmic dynamic synced lyrics generator for any uploaded or local track
  const d = Math.max(duration || 180, 60);
  const lines: LyricLine[] = [
    { time: 2, text: `♪ ${trackTitle} — ${artistName} ♪` },
    { time: Math.round(d * 0.05), text: "(Instrumental Intro · Studio Master Quality)" },
    { time: Math.round(d * 0.12), text: "Immerse in the stereo soundstage" },
    { time: Math.round(d * 0.20), text: "Crystal highs and deep resonant bass" },
    { time: Math.round(d * 0.28), text: "Every transient rendered with zero distortion" },
    { time: Math.round(d * 0.38), text: "♪ Harmonic frequencies filling the space ♪" },
    { time: Math.round(d * 0.46), text: "(Dynamic Chorus · Full Spectrum Richness)" },
    { time: Math.round(d * 0.55), text: "Let the sound wash over your senses" },
    { time: Math.round(d * 0.65), text: "Pure uncompressed fidelity in your ears" },
    { time: Math.round(d * 0.74), text: "(Bridge · Spatial Audio Expansion)" },
    { time: Math.round(d * 0.84), text: "Fading into smooth analog warmth..." },
    { time: Math.round(d * 0.94), text: "(Outro · Ambient Decay)" },
  ];

  return lines;
}
