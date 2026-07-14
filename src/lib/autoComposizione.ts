/**
 * Se il prodotto ha un solo materiale e composizione vuota,
 * restituisce "100% {materiale}" automaticamente.
 * Se il materiale inizia già con cifra (es. "100% cotone"), lo restituisce as-is.
 * Se composizione è già compilata, la rispetta senza sovrascrivere.
 */
export function autoComposizione(
  m1: string | null | undefined,
  m2: string | null | undefined,
  m3: string | null | undefined,
  existing: string | null | undefined,
): string | null {
  if (existing?.trim()) return existing.trim();
  if (!m1?.trim()) return null;
  if (m2?.trim() || m3?.trim()) return null;
  const mat = m1.trim();
  return /^\d/.test(mat) ? mat : `100% ${mat}`;
}
