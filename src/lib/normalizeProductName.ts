/**
 * Estrae nomLinea dal nome prodotto cercando la prima sequenza di parole in MAIUSCOLO.
 * Il nome moda segue il pattern: "[Tipo] [LINEA] [resto in minuscolo]"
 * Ritorna la linea in title case, o null se non trovata.
 */
export function extractLineaFromName(name: string): string | null {
  if (!name?.trim()) return null;
  const match = name.trim().match(/\b([A-ZÀÈÉÌÒÙ]{2,}(?:\s+[A-ZÀÈÉÌÒÙ]{2,})*)\b/);
  if (!match) return null;
  return match[1]
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

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
  dettaglio?: string | null,
): string {
  let result = name
    .replace(/[,;:.]/g, '')
    .replace(/&/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  if (result.length > 0) {
    result = result.charAt(0).toUpperCase() + result.slice(1);
  }

  if (!nomLinea?.trim()) return result;

  const newLinea = nomLinea.trim();
  const newLineaLower = newLinea.toLowerCase();

  // 1. New linea already present as a whole word — uppercase it
  const idx = findWholeWord(result, newLineaLower);
  if (idx !== -1) {
    return (
      result.slice(0, idx) +
      result.slice(idx, idx + newLineaLower.length).toUpperCase() +
      result.slice(idx + newLineaLower.length)
    );
  }

  // 2. Old linea present — replace it with new linea
  if (oldNomLinea?.trim()) {
    const oldLineaLower = oldNomLinea.trim().toLowerCase();
    const oldIdx = findWholeWord(result, oldLineaLower);
    if (oldIdx !== -1) {
      return (
        result.slice(0, oldIdx) +
        newLinea.toUpperCase() +
        result.slice(oldIdx + oldLineaLower.length)
      );
    }
  }

  // 3. Linea not found anywhere — insert it right after the dettaglio
  if (dettaglio?.trim()) {
    const detLower = dettaglio.trim().toLowerCase();
    if (result.toLowerCase().startsWith(detLower)) {
      const after = detLower.length;
      return result.slice(0, after) + ' ' + newLinea.toUpperCase() + result.slice(after);
    }
  }

  return result;
}

/** Rimuove il nome stampa dal fondo del nome prodotto (case-insensitive). */
export function stripStampaFromName(name: string, nomeStampa: string | null | undefined): string {
  if (!nomeStampa?.trim()) return name;
  const suffix = ' ' + nomeStampa.trim();
  if (name.toLowerCase().endsWith(suffix.toLowerCase())) {
    return name.slice(0, -suffix.length).trim();
  }
  return name;
}

/** Aggiunge il nome stampa in fondo al nome prodotto se fantasia === 'stampa'. */
export function applyStampaToName(name: string, nomeStampa: string | null | undefined, fantasia: string | null | undefined): string {
  if (fantasia?.trim().toLowerCase() === 'stampa' && nomeStampa?.trim()) {
    const suffix = ' ' + nomeStampa.trim();
    if (!name.toLowerCase().endsWith(suffix.toLowerCase())) {
      return name + suffix;
    }
  }
  return name;
}
