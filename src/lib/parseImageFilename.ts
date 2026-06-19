const MAX_IMAGE_INDEX = 5;

export type ParsedImageFilename =
  | { valid: true; productCode: string; imageIndex: number }
  | { valid: false; reason: 'empty_code' | 'index_out_of_range' };

/**
 * Parses a product image filename following the convention: {code}_{N}.{ext}
 * e.g. "123_1.jpg"     → { productCode: "123", imageIndex: 1 }
 *      "1234.jpg"      → { productCode: "1234", imageIndex: 1 }  (no suffix = slot 1)
 *      "HUBM_300.jpg"  → { productCode: "HUBM_300", imageIndex: 1 }
 *      "HUBM_300_1.jpg"→ { productCode: "HUBM_300", imageIndex: 1 }
 *
 * The last underscore is used as separator ONLY when the part after it is an integer
 * in [1, MAX_IMAGE_INDEX]. Otherwise the whole stem is treated as the product code at slot 1.
 */
export function parseImageFilename(filename: string): ParsedImageFilename {
  const stem = filename.replace(/\.[^/.]+$/, '').trim();
  if (!stem) return { valid: false, reason: 'empty_code' };

  const lastUnderscore = stem.lastIndexOf('_');

  if (lastUnderscore !== -1) {
    const codePart = stem.slice(0, lastUnderscore).trim();
    const indexPart = stem.slice(lastUnderscore + 1);
    const n = parseInt(indexPart, 10);

    if (!isNaN(n) && n >= 1 && n <= MAX_IMAGE_INDEX) {
      if (!codePart) return { valid: false, reason: 'empty_code' };
      return { valid: true, productCode: codePart.toUpperCase(), imageIndex: n };
    }
  }

  // No underscore, non-numeric suffix, or index out of range:
  // treat whole stem as product code at slot 1
  return { valid: true, productCode: stem.toUpperCase(), imageIndex: 1 };
}

/** Maps imageIndex (1-5) to the corresponding Product field name. */
export function imageIndexToField(
  index: number
): 'imageUrl' | 'imageUrl2' | 'imageUrl3' | 'imageUrl4' | 'imageUrl5' {
  if (index === 1) return 'imageUrl';
  return `imageUrl${index}` as 'imageUrl2' | 'imageUrl3' | 'imageUrl4' | 'imageUrl5';
}

type InvalidReason = 'empty_code' | 'index_out_of_range';

export function invalidReason(reason: InvalidReason): string {
  const map: Record<InvalidReason, string> = {
    empty_code: 'codice mancante',
    index_out_of_range: `indice fuori range (max ${MAX_IMAGE_INDEX})`,
  };
  return map[reason];
}
