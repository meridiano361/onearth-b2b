const MAX_IMAGE_INDEX = 4;

export type ParsedImageFilename =
  | { valid: true; productCode: string; imageIndex: number }
  | { valid: false; reason: 'no_underscore' | 'empty_code' | 'no_number' | 'index_out_of_range' };

/**
 * Parses a product image filename following the convention: {code}_{N}.{ext}
 * e.g. "123_1.jpg" → { productCode: "123", imageIndex: 1 }
 *      "456_3.png" → { productCode: "456", imageIndex: 3 }
 *
 * Uses the LAST underscore as separator so codes containing underscores work:
 * "HUBM_300_1.jpg" → { productCode: "HUBM_300", imageIndex: 1 }
 */
export function parseImageFilename(filename: string): ParsedImageFilename {
  const stem = filename.replace(/\.[^/.]+$/, '').trim();
  const lastUnderscore = stem.lastIndexOf('_');

  if (lastUnderscore === -1) return { valid: false, reason: 'no_underscore' };

  const codePart = stem.slice(0, lastUnderscore).trim();
  const indexPart = stem.slice(lastUnderscore + 1);

  if (!codePart) return { valid: false, reason: 'empty_code' };

  const imageIndex = parseInt(indexPart, 10);
  if (isNaN(imageIndex) || imageIndex < 1) return { valid: false, reason: 'no_number' };
  if (imageIndex > MAX_IMAGE_INDEX) return { valid: false, reason: 'index_out_of_range' };

  return { valid: true, productCode: codePart.toUpperCase(), imageIndex };
}

/** Maps imageIndex (1-4) to the corresponding Product field name. */
export function imageIndexToField(
  index: number
): 'imageUrl' | 'imageUrl2' | 'imageUrl3' | 'imageUrl4' {
  if (index === 1) return 'imageUrl';
  return `imageUrl${index}` as 'imageUrl2' | 'imageUrl3' | 'imageUrl4';
}

type InvalidReason = 'no_underscore' | 'empty_code' | 'no_number' | 'index_out_of_range';

export function invalidReason(reason: InvalidReason): string {
  const map: Record<InvalidReason, string> = {
    no_underscore: 'nome non conforme (manca _N)',
    empty_code: 'codice mancante prima di _N',
    no_number: 'indice non numerico dopo _',
    index_out_of_range: `indice fuori range (max ${MAX_IMAGE_INDEX})`,
  };
  return map[reason];
}
