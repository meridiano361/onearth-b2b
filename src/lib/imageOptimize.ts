import sharp from 'sharp';

const DEFAULT_MAX_BYTES = 200 * 1024; // 200 KB
const DEFAULT_MAX_DIM   = 1500;       // 1500 × 1500 px

/**
 * Converts any supported image buffer to WebP, resizes to fit within
 * maxDim×maxDim, then iteratively reduces quality until the result is
 * ≤ maxBytes. Quality never drops below 35 to avoid unacceptable artefacts.
 */
export async function compressImage(
  input: Buffer,
  maxBytes = DEFAULT_MAX_BYTES,
  maxDim   = DEFAULT_MAX_DIM,
): Promise<Buffer> {
  let quality = 85;
  let result: Buffer;

  do {
    result = await sharp(input)
      .resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();

    if (result.length <= maxBytes) break;
    quality -= 5;
  } while (quality >= 35);

  return result;
}
