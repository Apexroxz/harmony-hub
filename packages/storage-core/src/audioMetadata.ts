export interface ExtractedMetadata {
  title?: string;
  artist?: string;
  album?: string;
  coverImage?: string; // Blob URL or base64
  duration?: number;
  folderPath?: string;
  genre?: string;
  format?: string;
  bitrate?: number;
  sampleRate?: number;
  bitDepth?: number;
  year?: string;
  trackNumber?: string;
  replayGainTrack?: number; // Gain offset in dB (e.g. -6.5)
  replayGainAlbum?: number; // Album gain offset in dB (e.g. -5.2)
  replayGainPeak?: number;  // Peak sample / true-peak (0.0 to 1.0+)
}

export function decodeHtmlEntities(str: string): string {
  if (!str) return "";
  return str
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .trim();
}

/**
 * Strips web ripper watermarks, bitrate stamps, and file artifacts.
 */
export function cleanAudioText(text: string): string {
  if (!text) return "";
  let clean = decodeHtmlEntities(text);

  // Normalize consecutive spaces
  clean = clean.replace(/\s+/g, " ");

  // Remove common downloader / ripper tags and timestamps
  clean = clean
    .replace(/\s*[\(\[]\s*(?:320\s*kbps|128\s*kbps|256\s*kbps|64\s*kbps|VBR|CBR)\s*[\)\]]/gi, "")
    .replace(/\s*[\(\[]\s*(?:official\s*(?:video|audio|music\s*video|hd|hq|4k|lyric\s*video))\s*[\)\]]/gi, "")
    .replace(/\s*[\(\[]\s*(?:pagalworld(?:\.com|\.in)?|songs\.pk|djpunjab|gaana|jiosaavn|hungama|y2mate|ytmp3|yt1s)[^\)\]]*[\)\]]/gi, "")
    .replace(/-\s*\d{4,}\s*$/g, "") // trailing random web download IDs
    .trim();

  // If the title contains duplicate consecutive clauses separated by " - ", simplify
  const parts = clean.split(/\s+-\s+/);
  if (parts.length === 2 && parts[0].trim().toLowerCase() === parts[1].trim().toLowerCase()) {
    clean = parts[0].trim();
  }

  return clean;
}

/**
 * Intelligently cleans and splits Artist / Title / Album
 */
export function sanitizeExtractedMetadata(
  meta: ExtractedMetadata,
  filename?: string
): ExtractedMetadata {
  let title = meta.title ? cleanAudioText(meta.title) : "";
  let artist = meta.artist ? cleanAudioText(meta.artist) : "";
  let album = meta.album ? cleanAudioText(meta.album) : "";

  // If title is missing or contains artist separator and artist was default
  if (!title && filename) {
    const rawName = filename.replace(/\.[^/.]+$/, "");
    const cleanedFilename = cleanAudioText(rawName);

    if (cleanedFilename.includes(" - ")) {
      const split = cleanedFilename.split(" - ");
      if (split.length >= 2) {
        if (!artist || artist === "Local Artist" || artist === "Unknown Artist") {
          artist = split[0].trim();
        }
        title = split.slice(1).join(" - ").trim();
      } else {
        title = cleanedFilename;
      }
    } else {
      title = cleanedFilename;
    }
  } else if (title.includes(" - ") && (!artist || artist === "Local Artist" || artist === "Unknown Artist")) {
    const split = title.split(" - ");
    if (split.length === 2) {
      artist = split[0].trim();
      title = split[1].trim();
    }
  }

  return {
    ...meta,
    title: title || (filename ? cleanAudioText(filename.replace(/\.[^/.]+$/, "")) : "Untitled Track"),
    artist: artist || "Local Artist",
    album: album || "Local Master Imports",
  };
}

export async function extractAudioMetadata(file: File): Promise<ExtractedMetadata> {
  const result: ExtractedMetadata = {
    folderPath: file.webkitRelativePath
      ? file.webkitRelativePath.split("/").slice(0, -1).join("/") || "Local Tracks"
      : "Local Tracks",
  };

  try {
    // 1. Initial 16KB probe to inspect container header
    const probeBuffer = await file.slice(0, 16 * 1024).arrayBuffer();
    const probeView = new DataView(probeBuffer);

    // ── ID3 (MP3 / AIFF / WAV / FLAC with ID3 wrapper) ──
    if (probeView.byteLength >= 10 && probeView.getUint8(0) === 0x49 && probeView.getUint8(1) === 0x44 && probeView.getUint8(2) === 0x33) {
      const majorVersion = probeView.getUint8(3);
      const tagSize =
        ((probeView.getUint8(6) & 0x7f) << 21) |
        ((probeView.getUint8(7) & 0x7f) << 14) |
        ((probeView.getUint8(8) & 0x7f) << 7) |
        (probeView.getUint8(9) & 0x7f);

      // Load full ID3 tag chunk safely (capped at 16MB)
      const fullTagLength = Math.min(tagSize + 10, Math.min(file.size, 16 * 1024 * 1024));
      const buffer = fullTagLength > probeBuffer.byteLength
        ? await file.slice(0, fullTagLength).arrayBuffer()
        : probeBuffer;
      const view = new DataView(buffer);

      let offset = 10;
      const endOffset = Math.min(offset + tagSize, buffer.byteLength);

      while (offset < endOffset - 10) {
        let frameId = "";
        let frameSize = 0;

        if (majorVersion === 3 || majorVersion === 4) {
          for (let i = 0; i < 4; i++) {
            frameId += String.fromCharCode(view.getUint8(offset + i));
          }
          if (majorVersion === 4) {
            frameSize =
              ((view.getUint8(offset + 4) & 0x7f) << 21) |
              ((view.getUint8(offset + 5) & 0x7f) << 14) |
              ((view.getUint8(offset + 6) & 0x7f) << 7) |
              (view.getUint8(offset + 7) & 0x7f);
          } else {
            frameSize = view.getUint32(offset + 4);
          }
          offset += 10;
        } else if (majorVersion === 2) {
          for (let i = 0; i < 3; i++) {
            frameId += String.fromCharCode(view.getUint8(offset + i));
          }
          frameSize =
            (view.getUint8(offset + 3) << 16) |
            (view.getUint8(offset + 4) << 8) |
            view.getUint8(offset + 5);
          offset += 6;
        } else {
          break;
        }

        if (!frameId || frameSize <= 0 || offset + frameSize > buffer.byteLength) {
          break;
        }

        const frameData = new Uint8Array(buffer, offset, frameSize);

        if (frameId === "TIT2" || frameId === "TT2") {
          result.title = decodeTextFrame(frameData);
        } else if (frameId === "TPE1" || frameId === "TP1") {
          result.artist = decodeTextFrame(frameData);
        } else if (frameId === "TALB" || frameId === "TAL") {
          result.album = decodeTextFrame(frameData);
        } else if (frameId === "APIC" || frameId === "PIC") {
          const coverUrl = decodeApicFrame(frameData, majorVersion);
          if (coverUrl) result.coverImage = coverUrl;
        } else if (frameId === "TXXX" || frameId === "TXX") {
          const txxx = decodeTxxxFrame(frameData);
          if (txxx) {
            const desc = txxx.description.toUpperCase().replace(/\s+/g, "_");
            const val = txxx.value;
            if (desc === "REPLAYGAIN_TRACK_GAIN" || desc === "R128_TRACK_GAIN") {
              const gain = parseLoudnessGain(val);
              if (gain !== null) result.replayGainTrack = gain;
            } else if (desc === "REPLAYGAIN_ALBUM_GAIN" || desc === "R128_ALBUM_GAIN") {
              const gain = parseLoudnessGain(val);
              if (gain !== null) result.replayGainAlbum = gain;
            } else if (desc === "REPLAYGAIN_TRACK_PEAK") {
              const peak = parseFloat(val);
              if (!isNaN(peak) && peak > 0) result.replayGainPeak = peak;
            }
          }
        } else if (frameId === "RVA2") {
          const rva = decodeRva2Frame(frameData);
          if (rva !== null && result.replayGainTrack === undefined) {
            result.replayGainTrack = rva.gainDb;
            if (rva.peak !== undefined) result.replayGainPeak = rva.peak;
          }
        }

        offset += frameSize;
      }
    }

    // ── Native FLAC METADATA Blocks (fLaC) ──
    if (probeView.byteLength >= 4 && probeView.getUint8(0) === 0x66 && probeView.getUint8(1) === 0x4c && probeView.getUint8(2) === 0x61 && probeView.getUint8(3) === 0x43) {
      await parseFlacMetadata(file, result);
    }

    // ── MP4 / M4A / ALAC / AAC Atoms (ftyp / moov) ──
    if (probeView.byteLength >= 8) {
      const typeStr = String.fromCharCode(
        probeView.getUint8(4),
        probeView.getUint8(5),
        probeView.getUint8(6),
        probeView.getUint8(7)
      );
      if (typeStr === "ftyp" || typeStr === "moov") {
        await parseMp4Metadata(file, result);
      }
    }

    // ── WAV / RIFF Audio Container (RIFF....WAVE) ──
    if (
      probeView.byteLength >= 12 &&
      probeView.getUint8(0) === 0x52 && probeView.getUint8(1) === 0x49 && probeView.getUint8(2) === 0x46 && probeView.getUint8(3) === 0x46 &&
      probeView.getUint8(8) === 0x57 && probeView.getUint8(9) === 0x41 && probeView.getUint8(10) === 0x56 && probeView.getUint8(11) === 0x45
    ) {
      await parseWavMetadata(file, result);
    }

    // ── OGG Vorbis / Opus (OggS) ──
    if (
      probeView.byteLength >= 4 &&
      probeView.getUint8(0) === 0x4f && probeView.getUint8(1) === 0x67 && probeView.getUint8(2) === 0x67 && probeView.getUint8(3) === 0x53
    ) {
      await parseOggMetadata(file, result);
    }
  } catch {
    // Silent failure on malformed metadata headers
  }

  return sanitizeExtractedMetadata(result, file.name);
}

async function parseMp4Metadata(file: File, result: ExtractedMetadata) {
  try {
    // Read up to 8MB for MP4 header atoms
    const headerBuffer = await file.slice(0, Math.min(file.size, 8 * 1024 * 1024)).arrayBuffer();
    const view = new DataView(headerBuffer);
    const decoder = new TextDecoder("utf-8");

    let offset = 0;
    while (offset + 8 <= headerBuffer.byteLength) {
      const atomSize = view.getUint32(offset);
      const atomType = decoder.decode(new Uint8Array(headerBuffer, offset + 4, 4));
      if (atomSize <= 0 || offset + atomSize > headerBuffer.byteLength) break;

      if (atomType === "moov") {
        findIlstInMoov(headerBuffer, offset + 8, atomSize - 8, result);
        break;
      }
      offset += atomSize;
    }
  } catch {}
}

function findIlstInMoov(buffer: ArrayBuffer, start: number, length: number, result: ExtractedMetadata) {
  const view = new DataView(buffer);
  const decoder = new TextDecoder("utf-8");
  let offset = start;
  const end = start + length;

  while (offset + 8 <= end) {
    const size = view.getUint32(offset);
    if (size <= 0 || offset + size > end) break;
    const type = decoder.decode(new Uint8Array(buffer, offset + 4, 4));

    if (type === "udta" || type === "meta") {
      const innerStart = type === "meta" ? offset + 12 : offset + 8; // meta has 4 bytes flags/version
      findIlstInMoov(buffer, innerStart, size - (innerStart - offset), result);
    } else if (type === "ilst") {
      parseIlstTags(buffer, offset + 8, size - 8, result);
      return;
    }
    offset += size;
  }
}

function parseIlstTags(buffer: ArrayBuffer, start: number, length: number, result: ExtractedMetadata) {
  const view = new DataView(buffer);
  const decoder = new TextDecoder("utf-8");
  let offset = start;
  const end = start + length;

  while (offset + 8 <= end) {
    const tagSize = view.getUint32(offset);
    if (tagSize <= 0 || offset + tagSize > end) break;
    const tagType = decoder.decode(new Uint8Array(buffer, offset + 4, 4));

    // Inspect 'data' sub-atom inside tag
    let subOffset = offset + 8;
    const tagEnd = offset + tagSize;
    while (subOffset + 8 <= tagEnd) {
      const subSize = view.getUint32(subOffset);
      const subType = decoder.decode(new Uint8Array(buffer, subOffset + 4, 4));
      if (subSize <= 0 || subOffset + subSize > tagEnd) break;

      if (subType === "data" && subSize >= 16) {
        const typeFlags = view.getUint32(subOffset + 8);
        const payloadLength = subSize - 16;
        const payloadStart = subOffset + 16;

        if (tagType === "©nam") {
          result.title = decoder.decode(new Uint8Array(buffer, payloadStart, payloadLength)).trim();
        } else if (tagType === "©ART" || tagType === "aART") {
          result.artist = decoder.decode(new Uint8Array(buffer, payloadStart, payloadLength)).trim();
        } else if (tagType === "©alb") {
          result.album = decoder.decode(new Uint8Array(buffer, payloadStart, payloadLength)).trim();
        } else if (tagType === "©day") {
          result.year = decoder.decode(new Uint8Array(buffer, payloadStart, payloadLength)).trim();
        } else if (tagType === "covr" && payloadLength > 0) {
          // typeFlags 13 = JPEG, 14 = PNG
          const mime = typeFlags === 14 ? "image/png" : "image/jpeg";
          const imgBytes = new Uint8Array(buffer, payloadStart, payloadLength);
          result.coverImage = uint8ArrayToDataUrl(imgBytes, mime);
        }
        break;
      }
      subOffset += subSize;
    }

    offset += tagSize;
  }
}

async function parseWavMetadata(file: File, result: ExtractedMetadata) {
  try {
    const buffer = await file.slice(0, Math.min(file.size, 4 * 1024 * 1024)).arrayBuffer();
    const view = new DataView(buffer);
    const decoder = new TextDecoder("utf-8");
    let offset = 12; // Skip 'RIFF' + size + 'WAVE'

    while (offset + 8 <= buffer.byteLength) {
      const chunkId = decoder.decode(new Uint8Array(buffer, offset, 4));
      const chunkSize = view.getUint32(offset + 4, true);
      offset += 8;
      if (offset + chunkSize > buffer.byteLength) break;

      if (chunkId === "fmt " && chunkSize >= 16) {
        const sampleRate = view.getUint32(offset + 4, true);
        const bitsPerSample = view.getUint16(offset + 14, true);
        if (sampleRate > 0) result.sampleRate = sampleRate;
        if (bitsPerSample > 0) result.bitDepth = bitsPerSample;
      } else if (chunkId === "LIST" && chunkSize >= 4) {
        const listType = decoder.decode(new Uint8Array(buffer, offset, 4));
        if (listType === "INFO") {
          let listOffset = offset + 4;
          const listEnd = offset + chunkSize;
          while (listOffset + 8 <= listEnd) {
            const subId = decoder.decode(new Uint8Array(buffer, listOffset, 4));
            const subSize = view.getUint32(listOffset + 4, true);
            listOffset += 8;
            if (listOffset + subSize > listEnd) break;
            const textBytes = new Uint8Array(buffer, listOffset, subSize);
            const val = decoder.decode(textBytes).replace(/\0/g, "").trim();
            if (subId === "INAM") result.title = val;
            else if (subId === "IART") result.artist = val;
            else if (subId === "IPRD") result.album = val;
            listOffset += subSize + (subSize % 2); // 2-byte word align
          }
        }
      } else if (chunkId === "id3 " || chunkId === "ID3 ") {
        // Embedded ID3 chunk in WAV
        // Will have standard ID3 header
      }

      offset += chunkSize + (chunkSize % 2); // 2-byte word align
    }
  } catch {}
}

async function parseOggMetadata(file: File, result: ExtractedMetadata) {
  try {
    const buffer = await file.slice(0, Math.min(file.size, 1 * 1024 * 1024)).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const decoder = new TextDecoder("utf-8");
    const headerStr = decoder.decode(bytes);

    // Look for vorbis comment header pattern or METADATA_BLOCK_PICTURE
    const picMatch = headerStr.match(/METADATA_BLOCK_PICTURE=([A-Za-z0-9+/=]+)/);
    if (picMatch && picMatch[1]) {
      try {
        const binStr = atob(picMatch[1]);
        const picBytes = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) picBytes[i] = binStr.charCodeAt(i);
        const picView = new DataView(picBytes.buffer);
        if (picBytes.length >= 32) {
          const mimeLen = picView.getUint32(4);
          let mime = "image/jpeg";
          if (mimeLen > 0 && 8 + mimeLen < picBytes.length) {
            mime = new TextDecoder("ascii").decode(picBytes.subarray(8, 8 + mimeLen)) || "image/jpeg";
          }
          const descLenOffset = 8 + mimeLen;
          const descLen = picView.getUint32(descLenOffset);
          const dataLenOffset = descLenOffset + 4 + descLen + 16;
          if (dataLenOffset + 4 <= picBytes.length) {
            const picDataLen = picView.getUint32(dataLenOffset);
            const picDataStart = dataLenOffset + 4;
            if (picDataStart + picDataLen <= picBytes.length) {
              const rawImg = picBytes.subarray(picDataStart, picDataStart + picDataLen);
              result.coverImage = uint8ArrayToDataUrl(rawImg, mime);
            }
          }
        }
      } catch {}
    }
  } catch {}
}

async function parseFlacMetadata(file: File, result: ExtractedMetadata) {
  try {
    let offset = 4; // Skip "fLaC"
    let isLast = false;
    // Probe up to 4MB of metadata blocks
    const headerBuffer = await file.slice(0, Math.min(file.size, 4 * 1024 * 1024)).arrayBuffer();
    const view = new DataView(headerBuffer);

    while (!isLast && offset + 4 <= headerBuffer.byteLength) {
      const blockHeader = view.getUint8(offset);
      isLast = (blockHeader & 0x80) !== 0;
      const blockType = blockHeader & 0x7f;
      const blockLength = (view.getUint8(offset + 1) << 16) | (view.getUint8(offset + 2) << 8) | view.getUint8(offset + 3);
      offset += 4;

      if (offset + blockLength > headerBuffer.byteLength) {
        break;
      }

      // Block 0: STREAMINFO (sample rate, bit depth, channels)
      if (blockType === 0 && blockLength >= 18) {
        const sr1 = view.getUint8(offset + 10);
        const sr2 = view.getUint8(offset + 11);
        const sr3 = view.getUint8(offset + 12);
        const sampleRate = (sr1 << 12) | (sr2 << 4) | (sr3 >> 4);
        const bitsPerSample = (((sr3 & 0x01) << 4) | (view.getUint8(offset + 13) >> 4)) + 1;
        if (sampleRate > 0) result.sampleRate = sampleRate;
        if (bitsPerSample > 0) result.bitDepth = bitsPerSample;
      }

      // Block 4: VORBIS_COMMENT
      if (blockType === 4 && blockLength >= 4) {
        const commentData = new Uint8Array(headerBuffer, offset, blockLength);
        parseVorbisComments(commentData, result);
      }

      // Block 6: PICTURE
      if (blockType === 6 && blockLength >= 32) {
        const picView = new DataView(headerBuffer, offset, blockLength);
        const mimeLen = picView.getUint32(4);
        let mimeType = "image/jpeg";
        if (mimeLen > 0 && 8 + mimeLen < blockLength) {
          const mimeBytes = new Uint8Array(headerBuffer, offset + 8, mimeLen);
          mimeType = new TextDecoder("ascii").decode(mimeBytes) || "image/jpeg";
        }
        const descLenOffset = 8 + mimeLen;
        const descLen = picView.getUint32(descLenOffset);
        const dataLenOffset = descLenOffset + 4 + descLen + 16;
        if (dataLenOffset + 4 <= blockLength) {
          const picDataLen = picView.getUint32(dataLenOffset);
          const picDataStart = offset + dataLenOffset + 4;
          if (picDataStart + picDataLen <= headerBuffer.byteLength) {
            const picBytes = new Uint8Array(headerBuffer, picDataStart, picDataLen);
            result.coverImage = uint8ArrayToDataUrl(picBytes, mimeType);
          }
        }
      }

      offset += blockLength;
    }
  } catch (e) {
    console.warn("FLAC metadata parser error:", e);
  }
}

function parseVorbisComments(data: Uint8Array, result: ExtractedMetadata) {
  try {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const vendorLen = view.getUint32(0, true);
    let offset = 4 + vendorLen;
    if (offset + 4 > data.length) return;
    const numComments = view.getUint32(offset, true);
    offset += 4;
    const decoder = new TextDecoder("utf-8");

    for (let i = 0; i < numComments && offset + 4 <= data.length; i++) {
      const commentLen = view.getUint32(offset, true);
      offset += 4;
      if (offset + commentLen > data.length) break;
      const commentStr = decoder.decode(data.subarray(offset, offset + commentLen));
      offset += commentLen;

      const eqIdx = commentStr.indexOf("=");
      if (eqIdx > 0) {
        const key = commentStr.slice(0, eqIdx).toUpperCase().trim();
        const val = commentStr.slice(eqIdx + 1).trim();
        if (key === "TITLE") result.title = val;
        else if (key === "ARTIST") result.artist = val;
        else if (key === "ALBUM") result.album = val;
        else if (key === "REPLAYGAIN_TRACK_GAIN" || key === "R128_TRACK_GAIN") {
          const g = parseLoudnessGain(val);
          if (g !== null) result.replayGainTrack = g;
        } else if (key === "REPLAYGAIN_ALBUM_GAIN" || key === "R128_ALBUM_GAIN") {
          const g = parseLoudnessGain(val);
          if (g !== null) result.replayGainAlbum = g;
        } else if (key === "REPLAYGAIN_TRACK_PEAK") {
          const p = parseFloat(val);
          if (!isNaN(p) && p > 0) result.replayGainPeak = p;
        }
      }
    }
  } catch {}
}

function uint8ArrayToDataUrl(data: Uint8Array, mimeType: string): string {
  let binary = "";
  const len = data.byteLength;
  const chunkSize = 0x8000;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = data.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

function decodeTextFrame(data: Uint8Array): string {
  if (data.length <= 1) return "";
  const encoding = data[0];
  const body = data.subarray(1);

  let raw = "";
  if (encoding === 1 || encoding === 2) {
    const decoder = new TextDecoder("utf-16");
    raw = decoder.decode(body).replace(/\0/g, "").trim();
  } else if (encoding === 3) {
    const decoder = new TextDecoder("utf-8");
    raw = decoder.decode(body).replace(/\0/g, "").trim();
  } else {
    const decoder = new TextDecoder("iso-8859-1");
    raw = decoder.decode(body).replace(/\0/g, "").trim();
  }
  return decodeHtmlEntities(raw);
}

function decodeApicFrame(data: Uint8Array, majorVersion: number): string | null {
  try {
    let offset = 1; // skip encoding byte
    let mimeType = "image/jpeg";

    if (majorVersion === 2) {
      const b1 = data[1] ?? 74;
      const b2 = data[2] ?? 80;
      const b3 = data[3] ?? 71;
      const format = String.fromCharCode(b1, b2, b3).toUpperCase();
      mimeType = format === "PNG" ? "image/png" : "image/jpeg";
      offset = 4 + 1;
    } else {
      let mimeStr = "";
      while (offset < data.length && data[offset] !== 0) {
        const byte = data[offset];
        if (byte != null && byte !== 0) mimeStr += String.fromCharCode(byte);
        offset++;
      }
      offset++;
      if (mimeStr) mimeType = mimeStr;
      offset++;
    }

    while (offset < data.length && data[offset] !== 0) {
      offset++;
    }
    offset++;

    if (offset < data.length) {
      const imageBytes = data.subarray(offset);
      return uint8ArrayToDataUrl(imageBytes, mimeType);
    }
  } catch (err) {
    console.warn("APIC frame parse error:", err);
  }
  return null;
}

function decodeTxxxFrame(data: Uint8Array): { description: string; value: string } | null {
  if (data.length <= 2) return null;
  const encoding = data[0];
  const body = data.subarray(1);

  if (encoding === 0 || encoding === 3) {
    let nullIdx = -1;
    for (let i = 0; i < body.length; i++) {
      if (body[i] === 0) {
        nullIdx = i;
        break;
      }
    }
    if (nullIdx === -1) return null;
    const decoder = new TextDecoder(encoding === 3 ? "utf-8" : "iso-8859-1");
    const description = decoder.decode(body.subarray(0, nullIdx)).trim();
    const value = decoder.decode(body.subarray(nullIdx + 1)).replace(/\0/g, "").trim();
    return { description, value };
  } else if (encoding === 1 || encoding === 2) {
    let nullIdx = -1;
    for (let i = 0; i < body.length - 1; i += 2) {
      if (body[i] === 0 && body[i + 1] === 0) {
        nullIdx = i;
        break;
      }
    }
    if (nullIdx === -1) return null;
    const decoder = new TextDecoder("utf-16");
    const description = decoder.decode(body.subarray(0, nullIdx)).trim();
    const value = decoder.decode(body.subarray(nullIdx + 2)).replace(/\0/g, "").trim();
    return { description, value };
  }
  return null;
}

function decodeRva2Frame(data: Uint8Array): { gainDb: number; peak?: number } | null {
  try {
    if (data.length < 5) return null;
    let offset = 0;
    while (offset < data.length && data[offset] !== 0) {
      offset++;
    }
    offset++;
    if (offset + 3 > data.length) return null;
    const channelType = data[offset];
    offset++;
    const view = new DataView(data.buffer, data.byteOffset + offset, 2);
    const rawVal = view.getInt16(0);
    const gainDb = rawVal / 512.0;
    offset += 2;
    return { gainDb };
  } catch {
    return null;
  }
}

function parseLoudnessGain(val: string): number | null {
  if (!val) return null;
  const clean = val.replace(/dB/gi, "").trim();
  const num = parseFloat(clean);
  if (isNaN(num)) return null;
  if (Math.abs(num) > 60 && Number.isInteger(num)) {
    return num / 100.0;
  }
  return num;
}

