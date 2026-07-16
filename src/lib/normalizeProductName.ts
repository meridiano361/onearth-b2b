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
    const idx = result.toLowerCase().indexOf(newLineaLower);

    if (idx !== -1) {
      // New linea found in name — uppercase it
      result =
        result.slice(0, idx) +
        result.slice(idx, idx + newLineaLower.length).toUpperCase() +
        result.slice(idx + newLineaLower.length);
    } else if (oldNomLinea?.trim()) {
      // New linea not found — replace old linea with new linea (uppercased)
      const oldLineaLower = oldNomLinea.trim().toLowerCase();
      const oldIdx = result.toLowerCase().indexOf(oldLineaLower);
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
