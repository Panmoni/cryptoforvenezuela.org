/**
 * Strips the EXIF (APP1) segment from a JPEG — specifically to drop GPS
 * coordinates before a photo becomes public, protecting volunteers' and
 * the recipient's locations. Scoped to JPEG only (what phone cameras
 * produce); any other format, or anything that doesn't parse as a
 * well-formed JPEG segment stream, is passed through unchanged rather
 * than risking a corrupted image.
 */
export function stripJpegExif(input: ArrayBuffer): ArrayBuffer {
  const bytes = new Uint8Array(input);
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return input; // not a JPEG
  }

  const out: number[] = [0xff, 0xd8];
  let i = 2;

  while (i + 1 < bytes.length) {
    if (bytes[i] !== 0xff) {
      return input; // malformed stream — don't risk mangling it, pass through
    }
    const marker = bytes[i + 1];

    if (marker === 0xda) {
      // Start of scan: copy everything from here to EOF verbatim.
      for (let j = i; j < bytes.length; j++) out.push(bytes[j]);
      return new Uint8Array(out).buffer;
    }

    if (marker >= 0xd0 && marker <= 0xd7) {
      // Restart markers carry no length field.
      out.push(0xff, marker);
      i += 2;
      continue;
    }

    if (i + 3 >= bytes.length) return input;
    const length = (bytes[i + 2] << 8) | bytes[i + 3]; // includes the 2 length bytes
    const segmentEnd = i + 2 + length;
    if (length < 2 || segmentEnd > bytes.length) return input;

    const isApp1Exif =
      marker === 0xe1 &&
      length >= 8 &&
      bytes[i + 4] === 0x45 && // E
      bytes[i + 5] === 0x78 && // x
      bytes[i + 6] === 0x69 && // i
      bytes[i + 7] === 0x66; // f

    if (!isApp1Exif) {
      for (let j = i; j < segmentEnd; j++) out.push(bytes[j]);
    }
    i = segmentEnd;
  }

  return input; // ran off the end without hitting SOS — bail out safely
}
