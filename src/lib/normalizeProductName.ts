export function normalizeProductName(name: string, nomLinea?: string | null): string {
  let result = name
    .replace(/[,;:.]/g, '')
    .replace(/&/g, ' ');

  result = result.replace(/\s+/g, ' ').trim();
  result = result.toLowerCase();
  if (result.length > 0) {
    result = result.charAt(0).toUpperCase() + result.slice(1);
  }

  if (nomLinea) {
    const linea = nomLinea.trim();
    if (linea) {
      const lineaLower = linea.toLowerCase();
      const idx = result.toLowerCase().indexOf(lineaLower);
      if (idx !== -1) {
        result =
          result.slice(0, idx) +
          result.slice(idx, idx + lineaLower.length).toUpperCase() +
          result.slice(idx + lineaLower.length);
      }
    }
  }

  return result;
}
