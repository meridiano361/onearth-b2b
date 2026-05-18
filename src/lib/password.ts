/**
 * Generates the default B2B password from a company/organisation name.
 * Rule: "onearth_" + first 5 alphabetic characters (lowercase, no spaces or special chars).
 * Examples:
 *   "IL FIORE SRL"   → "onearth_ilfio"
 *   "EMPORIO 361"    → "onearth_empor"
 *   "LA ROSA BIANCA" → "onearth_laros"
 */
export function generateDefaultPassword(companyName: string): string {
  const letters = companyName
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .slice(0, 5);
  return `onearth_${letters}`;
}
