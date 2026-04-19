import sharp from "sharp";

/**
 * Generate a small JPEG thumbnail data URL from a raw image buffer.
 * Sized to fit list and detail views; kept well under Redis-friendly limits.
 */
export async function makeThumbnail(
  bytes: Buffer,
  mime: string,
): Promise<string | undefined> {
  if (!/^image\/(png|jpeg|webp|gif)$/.test(mime)) return undefined;
  try {
    const out = await sharp(bytes, { failOn: "none" })
      .rotate()
      .resize({ width: 800, height: 600, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 72, mozjpeg: true })
      .toBuffer();
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch {
    return undefined;
  }
}
