import type { LyricTimestampLine, LyricFormat } from "./lyrics.schema";

/**
 * Parses timestamped LRC format into sorted timestamped lines.
 */
export function parseLrcContent(lrcText: string): { lines: LyricTimestampLine[]; isSynced: boolean } {
  const rawLines = lrcText.split("\n");
  const parsedLines: LyricTimestampLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const matches = [...trimmed.matchAll(timeRegex)];
    if (matches.length > 0) {
      const text = trimmed.replace(timeRegex, "").trim();
      for (const match of matches) {
        const min = parseInt(match[1] || "0", 10);
        const sec = parseInt(match[2] || "0", 10);
        const ms = match[3] ? parseInt(match[3].padEnd(3, "0").slice(0, 3), 10) : 0;
        const totalSeconds = min * 60 + sec + ms / 1000;
        parsedLines.push({ time: totalSeconds, text });
      }
    }
  }

  if (parsedLines.length > 0) {
    parsedLines.sort((a, b) => a.time - b.time);
    return { lines: parsedLines, isSynced: true };
  }

  // Fallback for plain text without timestamps
  const plainLines: LyricTimestampLine[] = rawLines
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("[ti:") && !l.startsWith("[ar:") && !l.startsWith("[al:"))
    .map((text, i) => ({ time: i * 4, text }));

  return { lines: plainLines, isSynced: false };
}

/**
 * Parses SubRip (.srt) subtitle files into timestamped lyric lines.
 */
export function parseSrtContent(srtText: string): LyricTimestampLine[] {
  const blocks = srtText.trim().split(/\n\s*\n/);
  const result: LyricTimestampLine[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim());
    if (lines.length < 2) continue;

    const timeLine = lines.find((l) => l.includes("-->"));
    if (!timeLine) continue;

    const [startStr] = timeLine.split("-->").map((s) => s.trim());
    if (!startStr) continue;

    const [hStr, mStr, sMsStr] = startStr.split(":");
    if (!hStr || !mStr || !sMsStr) continue;

    const [secStr, msStr] = sMsStr.split(",");
    const hours = parseInt(hStr, 10) || 0;
    const mins = parseInt(mStr, 10) || 0;
    const secs = parseInt(secStr || "0", 10) || 0;
    const ms = parseInt(msStr || "0", 10) || 0;
    const totalSeconds = hours * 3600 + mins * 60 + secs + ms / 1000;

    const textLines = lines.slice(lines.indexOf(timeLine) + 1).join(" ");
    if (textLines) {
      result.push({ time: totalSeconds, text: textLines });
    }
  }

  return result.sort((a, b) => a.time - b.time);
}

/**
 * Auto-detects lyric format and parses accordingly.
 */
export function parseAnyLyricFormat(
  rawContent: string,
  filename = "lyrics.lrc",
): { format: LyricFormat; lines: LyricTimestampLine[]; isSynced: boolean } {
  const ext = filename.split(".").pop()?.toLowerCase() || "";

  if (ext === "srt" || rawContent.includes("-->")) {
    const lines = parseSrtContent(rawContent);
    return { format: "srt", lines, isSynced: true };
  }

  if (ext === "lrc" || /\[\d{2}:\d{2}/.test(rawContent)) {
    const { lines, isSynced } = parseLrcContent(rawContent);
    return { format: "synced_lrc", lines, isSynced };
  }

  const { lines } = parseLrcContent(rawContent);
  return { format: "plain_text", lines, isSynced: false };
}
