// Separators commonly found in combined color strings: / \ , " e " (Italian "and")
const SEP_RE = /\s*[\/\\,]\s*|\s+e\s+/i;

/** Returns true when the string contains a color separator. */
export function hasColorSeparator(v: string): boolean {
  return SEP_RE.test(v);
}

/**
 * Splits a raw color string (e.g. "avorio/bianco" or "rosso, blu e verde")
 * into up to three parts.  Each part is trimmed; empty slots return "".
 */
export function splitColori(raw: string): [string, string, string] {
  const parts = raw
    .split(SEP_RE)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);
  return [parts[0] ?? '', parts[1] ?? '', parts[2] ?? ''];
}
