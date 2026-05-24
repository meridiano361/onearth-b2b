import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { titleCase } from '@/lib/normalizeClassification';
import { syncManyProductClassifications } from '@/lib/syncClassification';

// ─── Parsers ──────────────────────────────────────────────────────────────────

function parseDecimal(v: any): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : Number(v);
  return isNaN(n) ? undefined : n;
}

function parseIntField(v: any, fallback: number): number {
  if (v === undefined || v === null || v === '') return fallback;
  const n = parseInt(String(v));
  return isNaN(n) ? fallback : n;
}

function parseBool(v: any): boolean | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v === 'boolean') return v;
  const s = String(v).toLowerCase().trim();
  if (s === '1' || s === 'true' || s === 'si' || s === 'sì' || s === 'yes') return true;
  if (s === '0' || s === 'false' || s === 'no') return false;
  return undefined;
}

function str(v: any): string | null {
  if (v === undefined || v === null || v === '') return null;
  return String(v).trim() || null;
}

// Returns `undefined` if the field is absent from the row (skip), or a Prisma-ready value otherwise
function buildFieldValue(campo: string, row: any): unknown {
  switch (campo) {
    case 'name':
      return row.name !== undefined ? String(row.name).trim() || null : undefined;
    case 'produttore':
      return row.produttore !== undefined
        ? (row.produttore ? titleCase(String(row.produttore).trim()) || null : null)
        : undefined;
    case 'paese':       return str(row.paese);
    case 'misura':      return str(row.misura);
    case 'gruppoMerceologico': return str(row.gruppoMerceologico);
    case 'famiglia':    return str(row.famiglia);
    case 'classe':      return str(row.classe);
    case 'sottoclasse': return str(row.sottoclasse);
    case 'gruppoOmogeneo': return str(row.gruppoOmogeneo);
    case 'nomLinea':    return str(row.nomLinea);
    case 'stagione':    return str(row.stagione);
    case 'collezione':
      return row.collezione !== undefined
        ? (str(row.collezione)?.toUpperCase() ?? null)
        : undefined;
    case 'colore':      return str(row.colore);
    case 'temaColore':  return str(row.temaColore);
    case 'tranche':     return str(row.tranche);
    case 'lotSize':
      return row.lotSize !== undefined ? parseIntField(row.lotSize, 1) : undefined;
    case 'iva':
      return row.iva !== undefined ? parseIntField(row.iva, 22) : undefined;
    case 'costPrice': {
      if (row.costPrice === undefined) return undefined;
      return parseDecimal(row.costPrice);
    }
    case 'retailPrice': {
      if (row.retailPrice === undefined) return undefined;
      return parseDecimal(row.retailPrice);
    }
    case 'fasciaRicarico': return str(row.fasciaRicarico);
    case 'fasciaSconto':
      return row.fasciaSconto !== undefined ? (parseDecimal(row.fasciaSconto) ?? null) : undefined;
    case 'notes':  return str(row.notes);
    case 'isActive': {
      if (row.isActive === undefined) return undefined;
      const b = parseBool(row.isActive);
      return b !== undefined ? b : undefined;
    }
    case 'imageUrl': return str(row.imageUrl);
    case 'code':
      return row.code !== undefined ? (String(row.code).toUpperCase().trim() || null) : undefined;
    default: return undefined;
  }
}

// Normalise Prisma Decimal → plain number/string for JSON comparison
function toDisplay(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === 'object' && 'toNumber' in v) return v.toNumber();
  return v;
}

// ─── Prisma select (all updatable fields) ─────────────────────────────────────

const PRODUCT_SELECT = {
  id: true, code: true, name: true, produttore: true, paese: true, misura: true,
  gruppoMerceologico: true, famiglia: true, classe: true, sottoclasse: true,
  gruppoOmogeneo: true, nomLinea: true, stagione: true, collezione: true,
  colore: true, temaColore: true, tranche: true, lotSize: true, iva: true,
  costPrice: true, retailPrice: true, fasciaRicarico: true, fasciaSconto: true,
  notes: true, isActive: true, imageUrl: true,
} as const;

const CLASSIFICATION_FIELDS = new Set([
  'nomLinea', 'collezione', 'colore', 'temaColore', 'stagione',
  'gruppoMerceologico', 'famiglia', 'classe', 'sottoclasse', 'gruppoOmogeneo',
]);

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { rows, campiDaAggiornare, dryRun = false } = body as {
      rows: any[];
      campiDaAggiornare: string[];
      dryRun?: boolean;
    };

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Nessuna riga fornita' }, { status: 400 });
    }
    if (!Array.isArray(campiDaAggiornare) || campiDaAggiornare.length === 0) {
      return NextResponse.json({ error: 'Nessun campo selezionato' }, { status: 400 });
    }

    const allCodes = rows
      .map((r) => (r.code ? String(r.code).toUpperCase().trim() : null))
      .filter(Boolean) as string[];

    // ── Dry run: preview ──────────────────────────────────────────────────────
    if (dryRun) {
      const previewRows = rows.slice(0, 10);
      const previewCodes = previewRows
        .map((r) => (r.code ? String(r.code).toUpperCase().trim() : null))
        .filter(Boolean) as string[];

      const [allExisting, previewProducts] = await Promise.all([
        prisma.product.findMany({ where: { code: { in: allCodes } }, select: { code: true } }),
        prisma.product.findMany({ where: { code: { in: previewCodes } }, select: PRODUCT_SELECT }),
      ]);

      const existingSet = new Set(allExisting.map((p) => p.code));
      const previewMap = new Map(previewProducts.map((p) => [p.code, p]));
      const nonTrovatiCodes = allCodes.filter((c) => !existingSet.has(c)).slice(0, 100);

      const preview = previewRows.map((row) => {
        const codice = row.code ? String(row.code).toUpperCase().trim() : null;
        const prodotto = codice ? previewMap.get(codice) : undefined;
        const campi: Record<string, { corrente: any; nuovo: any }> = {};

        for (const campo of campiDaAggiornare) {
          const nuovo = buildFieldValue(campo, row);
          if (nuovo !== undefined) {
            const corrente = prodotto ? toDisplay((prodotto as any)[campo]) : null;
            campi[campo] = { corrente, nuovo };
          }
        }

        return { codice, trovato: !!prodotto, campi };
      });

      return NextResponse.json({
        preview,
        trovati: existingSet.size,
        nonTrovati: allCodes.length - existingSet.size,
        nonTrovatiCodes,
      });
    }

    // ── Actual import ─────────────────────────────────────────────────────────
    const existing = await prisma.product.findMany({
      where: { code: { in: allCodes } },
      select: { id: true, code: true },
    });
    const existingMap = new Map(existing.map((p) => [p.code, p]));

    let updated = 0;
    const notFound: string[] = [];
    const errors: Array<{ codice: string; message: string }> = [];
    const syncFields: Parameters<typeof syncManyProductClassifications>[0] = [];
    const touchesClassification = campiDaAggiornare.some((f) => CLASSIFICATION_FIELDS.has(f));

    for (const row of rows) {
      const codice = row.code ? String(row.code).toUpperCase().trim() : null;
      if (!codice) continue;

      const prodotto = existingMap.get(codice);
      if (!prodotto) {
        notFound.push(codice);
        continue;
      }

      try {
        const updateData: Record<string, any> = {};
        for (const campo of campiDaAggiornare) {
          const val = buildFieldValue(campo, row);
          if (val !== undefined) updateData[campo] = val;
        }

        if (Object.keys(updateData).length > 0) {
          await prisma.product.update({ where: { id: prodotto.id }, data: updateData });
          updated++;

          if (touchesClassification) {
            syncFields.push({
              nomLinea: updateData.nomLinea,
              collezione: updateData.collezione,
              colore: updateData.colore,
              temaColore: updateData.temaColore,
              stagione: updateData.stagione,
              gruppoMerceologico: updateData.gruppoMerceologico,
              famiglia: updateData.famiglia,
              classe: updateData.classe,
              sottoclasse: updateData.sottoclasse,
              gruppoOmogeneo: updateData.gruppoOmogeneo,
            });
          }
        }
      } catch (err: any) {
        errors.push({ codice, message: err.message ?? 'Errore sconosciuto' });
      }
    }

    if (syncFields.length > 0) {
      void syncManyProductClassifications(syncFields);
    }

    return NextResponse.json({ updated, notFound, campiAggiornati: campiDaAggiornare, errors });
  } catch (err) {
    console.error('[import/selettivo]', err);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
