import sharp from "sharp";

/**
 * Generate a JPEG thumbnail data URL from a raw image buffer.
 *
 * Sized for the enlarged score-detail view as well as list rows: fits within
 * 1400px (longest side) at quality 82. This is a balance — large enough that
 * the detail screenshot stays crisp without upscaling, but still a bounded
 * base64 string in Redis. `withoutEnlargement` means we never blow up a small
 * source. Only affects scores created from here on; existing thumbnails keep
 * their previously-saved resolution.
 */
export async function makeThumbnail(
  bytes: Buffer,
  mime: string,
): Promise<string | undefined> {
  if (!/^image\/(png|jpeg|webp|gif)$/.test(mime)) return undefined;
  try {
    const out = await sharp(bytes, { failOn: "none" })
      .rotate()
      .resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch {
    return undefined;
  }
}
