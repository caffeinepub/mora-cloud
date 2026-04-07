/**
 * Detect the real MIME type of a binary blob by reading its magic bytes.
 * Falls back to the provided default if no signature matches.
 */
export function detectMimeType(bytes: Uint8Array, fallback: string): string {
  if (bytes.length < 12) return fallback;

  const b = bytes;

  // --- Video ---

  // MP4 / QuickTime — ftyp box: bytes 4-7 == "ftyp"
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    // Check brand at bytes 8-11 to distinguish MOV vs MP4
    const brand = String.fromCharCode(b[8], b[9], b[10], b[11]).trim();
    if (["qt  ", "moov", "mobj", "mqt "].includes(brand)) {
      return "video/quicktime";
    }
    // isom, mp41, mp42, M4V , avc1, dash, etc. -> MP4
    return "video/mp4";
  }

  // WebM / MKV — starts with 0x1A 0x45 0xDF 0xA3 (EBML)
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) {
    return "video/webm";
  }

  // AVI — RIFF....AVI
  if (
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x41 &&
    b[9] === 0x56 &&
    b[10] === 0x49 &&
    b[11] === 0x20
  ) {
    return "video/x-msvideo";
  }

  // MPEG-2 Transport Stream
  if (b[0] === 0x47) {
    return "video/mp2t";
  }

  // FLV
  if (b[0] === 0x46 && b[1] === 0x4c && b[2] === 0x56) {
    return "video/x-flv";
  }

  // 3GP / 3G2 — ftyp brand check (bytes 4-7 == "ftyp")
  // Already handled above in MP4/QT section, but check for 3gp brand
  // (this path is only reached if ftyp wasn't at offset 4, so skip)

  // --- Image ---

  // JPEG — FF D8 FF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG — 89 50 4E 47 0D 0A 1A 0A
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return "image/png";
  }

  // GIF
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) {
    return "image/gif";
  }

  // WebP — RIFF....WEBP
  if (
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50
  ) {
    return "image/webp";
  }

  // BMP
  if (b[0] === 0x42 && b[1] === 0x4d) {
    return "image/bmp";
  }

  // HEIC / HEIF — ftyp brand "heic" or "heix" or "mif1"
  // (this is also at offset 4, but we checked ftyp brand above already)

  return fallback;
}

/**
 * Given a MIME type, return the canonical file extension (with leading dot).
 */
export function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "video/webm": ".webm",
    "video/x-msvideo": ".avi",
    "video/mp2t": ".ts",
    "video/x-flv": ".flv",
    "video/ogg": ".ogv",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/bmp": ".bmp",
    "image/heic": ".heic",
  };
  return map[mime] ?? "";
}

/**
 * Fetch a URL and return a Blob with the correct MIME type,
 * detected from the actual file bytes (not the HTTP header).
 * Also returns the detected MIME type string.
 */
export async function fetchWithCorrectMime(
  url: string,
  isVideo: boolean,
): Promise<{ blob: Blob; mimeType: string; ext: string }> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  const fallback = isVideo ? "video/mp4" : "image/jpeg";
  const mimeType = detectMimeType(bytes, fallback);
  const ext = mimeToExt(mimeType) || (isVideo ? ".mp4" : ".jpg");

  const blob = new Blob([bytes], { type: mimeType });
  return { blob, mimeType, ext };
}
