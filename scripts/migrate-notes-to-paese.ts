import { PrismaClient } from '@prisma/client';
import { PAESI } from '../src/lib/paesi';

const prisma = new PrismaClient();

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// Build aliases: "China" -> "Cina", "Thailand" -> "Thailandia", etc.
const ALIASES: Record<string, string> = {
  china: 'Cina',
  cambodia: 'Cambogia',
  thailand: 'Thailandia',
  malesia: 'Malaysia',
  vietnam: 'Vietnam',
  bangladesh: 'Bangladesh',
  india: 'India',
  nepal: 'Nepal',
  indonesia: 'Indonesia',
  pakistan: 'Pakistan',
  myanmar: 'Myanmar',
  laos: 'Laos',
  'sri lanka': 'Sri Lanka',
};

// Combine PAESI + aliases into a single lookup: lowercaseKey -> canonicalName
const PAESE_MAP = new Map<string, string>();
for (const p of PAESI) {
  PAESE_MAP.set(p.toLowerCase(), p);
}
for (const [alias, canonical] of Object.entries(ALIASES)) {
  PAESE_MAP.set(alias, canonical);
}

function findCountryInNotes(notes: string): { canonical: string; pattern: RegExp } | null {
  const notesLower = notes.toLowerCase();
  // Try longest keys first to avoid partial short-name matches (e.g., "cina" inside "argentina")
  const sorted = [...PAESE_MAP.entries()].sort((a, b) => b[0].length - a[0].length);
  for (const [key, canonical] of sorted) {
    // Word-boundary-like: surrounded by start/end or non-letter
    const pattern = new RegExp(`(?<![a-zàèéìíîòóùú])${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-zàèéìíîòóùú])`, 'i');
    if (pattern.test(notesLower)) {
      return { canonical, pattern };
    }
  }
  return null;
}

function cleanCountryFromNotes(notes: string, pattern: RegExp): string | null {
  const cleaned = notes.replace(pattern, '').replace(/\s+/g, ' ').trim();
  // Normalize separators left at boundaries (e.g., " - " at start/end)
  return cleaned.replace(/^[\s,;.\-–—]+|[\s,;.\-–—]+$/g, '').trim() || null;
}

async function main() {
  const all = await prisma.product.findMany({
    select: { id: true, code: true, notes: true, paese: true },
  });

  let updatedPaese = 0;
  let cleanedNotes = 0;
  let unchanged = 0;
  const countryFrequency: Record<string, number> = {};
  const report: { code: string; paese: string; notesBefore: string; notesAfter: string | null }[] = [];

  for (const p of all) {
    if (!p.notes) { unchanged++; continue; }

    const match = findCountryInNotes(p.notes);

    if (!match) { unchanged++; continue; }

    const { canonical, pattern } = match;
    const newPaese = p.paese ?? canonical; // keep existing paese if already set
    const newNotes = cleanCountryFromNotes(p.notes, pattern);

    const paeseChanged = !p.paese;
    const notesChanged = newNotes !== p.notes;

    if (!paeseChanged && !notesChanged) { unchanged++; continue; }

    await prisma.product.update({
      where: { id: p.id },
      data: {
        ...(paeseChanged ? { paese: canonical } : {}),
        notes: newNotes,
      },
    });

    if (paeseChanged) updatedPaese++;
    if (notesChanged) cleanedNotes++;
    countryFrequency[canonical] = (countryFrequency[canonical] ?? 0) + 1;
    report.push({ code: p.code, paese: newPaese, notesBefore: p.notes, notesAfter: newNotes });
  }

  console.log('\n=== Migrazione notes → paese ===\n');
  console.log(`Prodotti con paese impostato:     ${updatedPaese}`);
  console.log(`Prodotti con notes pulite:        ${cleanedNotes}`);
  console.log(`Prodotti invariati:               ${unchanged}`);

  console.log('\nPaesi trovati (frequenza):');
  const sorted = Object.entries(countryFrequency).sort((a, b) => b[1] - a[1]);
  for (const [country, count] of sorted) {
    console.log(`  ${country.padEnd(20)} ${count}`);
  }

  if (report.length) {
    console.log('\nDettaglio prodotti aggiornati:');
    for (const r of report) {
      console.log(`  ${r.code.padEnd(12)} paese=${r.paese.padEnd(15)} notes: "${r.notesBefore}" → ${r.notesAfter ? `"${r.notesAfter}"` : 'null'}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
