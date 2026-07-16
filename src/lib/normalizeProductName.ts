function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findWholeWord(text: string, word: string): number {
  const m = text.match(new RegExp(`(?<![\\w])${escapeRegex(word)}(?![\\w])`, 'i'));
  return m?.index ?? -1;
}

export function normalizeProductName(
  name: string,
  nomLinea?: string | null,
  oldNomLinea?: string | null,
): string {
  let result = name
    .replace(/[,;:.]/g, '')
    .replace(/&/g, ' ');

  result = result.replace(/\s+/g, ' ').trim();
  result = result.toLowerCase();
  if (result.length > 0) {
    result = result.charAt(0).toUpperCase() + result.slice(1);
  }

  if (nomLinea?.trim()) {
    const newLinea = nomLinea.trim();
    const newLineaLower = newLinea.toLowerCase();
    const idx = findWholeWord(result, newLineaLower);

    if (idx !== -1) {
      // New linea found as standalone word — uppercase it
      result =
        result.slice(0, idx) +
        result.slice(idx, idx + newLineaLower.length).toUpperCase() +
        result.slice(idx + newLineaLower.length);
    } else if (oldNomLinea?.trim()) {
      // New linea not in name — replace old linea with new linea (uppercased)
      const oldLineaLower = oldNomLinea.trim().toLowerCase();
      const oldIdx = findWholeWord(result, oldLineaLower);
      if (oldIdx !== -1) {
        result =
          result.slice(0, oldIdx) +
          newLinea.toUpperCase() +
          result.slice(oldIdx + oldLineaLower.length);
      }
    }
  }

  return result;
}
