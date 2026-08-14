export interface LrcLine {
  time: number; // in seconds
  text: string;
}

/**
 * Parses raw LRC timestamp text format into LrcLine objects.
 * Format: [mm:ss.xx] Line text
 */
export function parseLrc(lrcText: string): LrcLine[] {
  const lines = lrcText.split("\n");
  const result: LrcLine[] = [];

  const timeRegex = /\[(\d+):(\d+(?:\.\d+)?)\](.*)/;

  for (const line of lines) {
    const trimmed = line.trim();
    const match = timeRegex.exec(trimmed);
    if (match) {
      const minutes = parseFloat(match[1] || "0");
      const seconds = parseFloat(match[2] || "0");
      const text = match[3] ? match[3].trim() : "";
      const timeInSeconds = minutes * 60 + seconds;

      if (text) {
        result.push({ time: timeInSeconds, text });
      }
    }
  }

  return result.sort((a, b) => a.time - b.time);
}

/**
 * Generates sample synchronized lyrics lines matching track duration.
 */
export function generateSampleLrc(
  trackTitle: string,
  artistName: string,
  duration: number = 180,
): LrcLine[] {
  const step = Math.max(8, Math.floor(duration / 8));
  return [
    { time: 0, text: `🎵 ${trackTitle} — ${artistName}` },
    { time: step * 1, text: "Walking through the glowing neon streets" },
    { time: step * 2, text: "Frequencies pulsing to the heavy beats" },
    { time: step * 3, text: "Echoes of the synth wave in the night" },
    { time: step * 4, text: "Lost inside lossless digital light" },
    { time: step * 5, text: "Rhythm taking over time and space" },
    { time: step * 6, text: "Harmony found in this quiet place" },
    { time: step * 7, text: `✨ End of ${trackTitle}` },
  ];
}
