import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { slugify } from '@/lib/utils';
import { titleCase } from '@/lib/normalizeClassification';
import { normalizeProductName } from '@/lib/normalizeProductName';

function parseDecimal(v: any): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : Number(v);
  return isNaN(n) ? undefined : n;
}

function parseDecimalRequired(v: any): number {
  const n = parseDecimal(v);
  if (n === undefined) throw new Error('Valore numerico non valido');
  return n;
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

const importRowSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.any().optional(),
  category: z.any().optional(),
  costPrice: z.any().transform(parseDecimalRequired),
  retailPrice: z.any().transform(parseDecimalRequired),
  lotSize: z.any().optional(),
  notes: z.any().optional(),
  imageUrl: z.any().optional(),
  collectionId: z.any().optional(),
  famiglia: z.any().optional(),
  sottofamiglia: z.any().optional(),
  colore: z.any().optional(),
  nomLinea: z.any().optional(),
  misura: z.any().optional(),
  produttore: z.any().optional(),
  gruppoMerceologico: z.any().optional(),
  classe: z.any().optional(),
  sottoclasse: z.any().optional(),
  gruppoOmogeneo: z.any().optional(),
  stagione: z.any().optional(),
  temaColore: z.any().optional(),
  fasciaRicarico: z.any().optional(),
  fasciaSconto: z.any().optional(),
  collezione: z.any().optional(),
  tranche: z.any().optional(),
  paese: z.any().optional(),
  iva: z.any().optional(),
  isActive: z.any().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { rows, collectionId } = body as { rows: any[]; collectionId?: string };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No rows provided' }, { status: 400 });
    }

    // Pre-fetch existing codes to distinguish creates vs updates
    const allCodes = rows
      .map((r) => (r.code ? String(r.code).toUpperCase().trim() : null))
      .filter(Boolean) as string[];
    const existing = await prisma.product.findMany({
      where: { code: { in: allCodes } },
      select: { code: true },
    });
    const existingCodes = new Set(existing.map((p) => p.code));

    let created = 0;
    let updated = 0;
    const errors: Array<{ row: number; message: string; data?: any }> = [];
    const categoryCache = new Map<string, string>();

    for (let i = 0; i < rows.length; i++) {
      try {
        const parsed = importRowSchema.parse(rows[i]);
        const code = parsed.code.toUpperCase().trim();

        // Category
        let categoryId: string | null = null;
        const catName = str(parsed.category);
        if (catName) {
          const catKey = `${catName}-${collectionId || 'global'}`;
          if (categoryCache.has(catKey)) {
            categoryId = categoryCache.get(catKey)!;
          } else {
            const existingCat = await prisma.category.findFirst({
              where: { name: catName, collectionId: collectionId || null },
            });
            if (existingCat) {
              categoryId = existingCat.id;
            } else {
              const newCat = await prisma.category.create({
                data: { name: catName, slug: slugify(catName), collectionId: collectionId || null, order: 99 },
              });
              categoryId = newCat.id;
            }
            categoryCache.set(catKey, categoryId);
          }
        }

        const nomLineaValue = str(parsed.nomLinea);
        const fields = {
          name: normalizeProductName(parsed.name, nomLineaValue),
          description: str(parsed.description),
          costPrice: parsed.costPrice,
          retailPrice: parsed.retailPrice,
          lotSize: parseIntField(parsed.lotSize, 1),
          notes: str(parsed.notes),
          imageUrl: str(parsed.imageUrl),
          categoryId,
          collectionId: collectionId || null,
          famiglia: str(parsed.famiglia),
          sottofamiglia: str(parsed.sottofamiglia),
          colore: str(parsed.colore),
          nomLinea: nomLineaValue,
          paese: str(parsed.paese),
          misura: str(parsed.misura),
          produttore: parsed.produttore ? titleCase(str(parsed.produttore) ?? '') || null : null,
          gruppoMerceologico: str(parsed.gruppoMerceologico),
          classe: str(parsed.classe),
          sottoclasse: str(parsed.sottoclasse),
          gruppoOmogeneo: str(parsed.gruppoOmogeneo),
          stagione: str(parsed.stagione),
          temaColore: str(parsed.temaColore),
          fasciaRicarico: str(parsed.fasciaRicarico),
          fasciaSconto: parseDecimal(parsed.fasciaSconto) ?? null,
          collezione: str(parsed.collezione),
          tranche: str(parsed.tranche),
          iva: parseIntField(parsed.iva, 22),
        };

        const activeVal = parseBool(parsed.isActive);

        const isNew = !existingCodes.has(code);

        await prisma.product.upsert({
          where: { code },
          update: {
            ...fields,
            ...(activeVal !== undefined ? { isActive: activeVal } : {}),
          },
          create: {
            code,
            isActive: activeVal ?? true,
            ...fields,
          },
        });

        if (isNew) created++; else updated++;
      } catch (err: any) {
        errors.push({ row: i + 2, message: err.message || 'Errore sconosciuto', data: rows[i] });
      }
    }

    return NextResponse.json({ created, updated, errors });
  } catch (err) {
    console.error('Import error:', err);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
