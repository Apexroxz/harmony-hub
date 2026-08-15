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
}

/**
 * Extracts embedded ID3v2 tags (Title, Artist, Album, APIC Artwork) from local File objects.
 */
export async function extractAudioMetadata(file: File): Promise<ExtractedMetadata> {
  const result: ExtractedMetadata = {
    folderPath: file.webkitRelativePath
      ? file.webkitRelativePath.split("/").slice(0, -1).join("/") || "Local Tracks"
      : "Local Tracks",
  };

  try {
    const buffer = await file.slice(0, 128 * 1024).arrayBuffer();
    const view = new DataView(buffer);

    // Check ID3 header magic bytes: "ID3"
    if (view.getUint8(0) === 0x49 && view.getUint8(1) === 0x44 && view.getUint8(2) === 0x33) {
      const majorVersion = view.getUint8(3);
      const tagSize =
        ((view.getUint8(6) & 0x7f) << 21) |
        ((view.getUint8(7) & 0x7f) << 14) |
        ((view.getUint8(8) & 0x7f) << 7) |
        (view.getUint8(9) & 0x7f);

      let offset = 10;
      const endOffset = Math.min(offset + tagSize, buffer.byteLength - 10);

      while (offset < endOffset) {
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
        }

        offset += frameSize;
      }
    }
  } catch (err) {
    console.warn("ID3 metadata extraction warning for file:", file.name, err);
  }

  // Fallback title derived from filename if ID3 title missing
  if (!result.title) {
    result.title = file.name.replace(/\.[^/.]+$/, "");
  }

  return result;
}

function decodeTextFrame(data: Uint8Array): string {
  if (data.length <= 1) return "";
  const encoding = data[0];
  const body = data.subarray(1);

  if (encoding === 1 || encoding === 2) {
    // UTF-16
    const decoder = new TextDecoder("utf-16");
    return decoder.decode(body).replace(/\0/g, "").trim();
  } else if (encoding === 3) {
    // UTF-8
    const decoder = new TextDecoder("utf-8");
    return decoder.decode(body).replace(/\0/g, "").trim();
  } else {
    // ISO-8859-1 / ASCII
    const decoder = new TextDecoder("iso-8859-1");
    return decoder.decode(body).replace(/\0/g, "").trim();
  }
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
      const copy = imageBytes.slice().buffer;
      const blob = new Blob([copy], { type: mimeType });
      return URL.createObjectURL(blob);
    }
  } catch (err) {
    console.warn("APIC frame parse error:", err);
  }
  return null;
}
