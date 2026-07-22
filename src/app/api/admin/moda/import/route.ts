import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';

function str(v: ExcelJS.CellValue): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'SI' : 'NO';
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object' && 'text' in (v as any)) return String((v as any).text).trim();
  if (typeof v === 'object' && 'result' in (v as any)) return str((v as any).result);
  return String(v).trim();
}

function num(v: ExcelJS.CellValue): number | null {
  const s = str(v);
  if (!s) return null;
  const n = parseFloat(s.replace(',', '.'));
  return isNaN(n) ? null : n;
}

function bool(v: ExcelJS.CellValue): boolean {
  const s = str(v).toUpperCase();
  return s === 'SI' || s === 'TRUE' || s === '1' || s === 'YES';
}

// Build composizione string from materiale + comp slots
function buildComposizione(
  mat1: string, comp1: number | null,
  mat2: string, comp2: number | null,
  mat3: string, comp3: number | null,
): string | null {
  const parts: string[] = [];
  if (mat1 && comp1 != null) parts.push(`${comp1}% ${mat1}`);
  if (mat2 && comp2 != null) parts.push(`${comp2}% ${mat2}`);
  if (mat3 && comp3 != null) parts.push(`${comp3}% ${mat3}`);
  return parts.length ? parts.join(', ') : null;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'Nessun file' }, { status: 400 });

  const arrayBuffer = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load(Buffer.from(arrayBuffer) as any);

  const ws = wb.getWorksheet('Prodotti MODA');
  if (!ws) {
    return NextResponse.json({ error: 'Foglio "Prodotti MODA" non trovato' }, { status: 400 });
  }

  // Row 1 = headers, Row 2 = instructions, data starts at row 3
  const HEADER_ROW = 1;
  const DATA_START = 3;

  // Build column index map from header row
  const colMap: Record<string, number> = {};
  ws.getRow(HEADER_ROW).eachCell((cell, colNumber) => {
    const h = str(cell.value).replace(/\s*\*\s*$/, '').trim().toLowerCase();
    colMap[h] = colNumber;
    if (h === 'tipo') colMap['dettaglio'] = colNumber; // 'Tipo' è alias di 'dettaglio'
  });

  function get(row: ExcelJS.Row, header: string): ExcelJS.CellValue {
    const idx = colMap[header.toLowerCase()];
    return idx ? row.getCell(idx).value : null;
  }

  const created: string[] = [];
  const updated: string[] = [];
  const errors: { row: number; code: string; error: string }[] = [];

  // Cache all pantone codes to avoid repeated DB lookups
  type PantoneRow = { id: bigint; code: string };
  const allPantones = await prisma.$queryRaw<PantoneRow[]>`SELECT id, code FROM pantone_colors`;
  const pantoneByCode = new Map<string, number>(allPantones.map((p) => [p.code.toUpperCase(), Number(p.id)]));

  async function resolvePantoneId(code: string): Promise<number | null> {
    if (!code) return null;
    const upper = code.toUpperCase().trim();
    if (pantoneByCode.has(upper)) return pantoneByCode.get(upper)!;
    // Create new pantone entry
    const created = await prisma.$queryRaw<PantoneRow[]>`
      INSERT INTO pantone_colors (code, name, hex_code, system_type)
      VALUES (${upper}, ${upper}, '#CCCCCC', 'PANTONE')
      ON CONFLICT (code) DO UPDATE SET code = EXCLUDED.code
      RETURNING id, code
    `;
    const id = Number(created[0].id);
    pantoneByCode.set(upper, id);
    return id;
  }

  const rowCount = ws.rowCount;
  for (let rowNum = DATA_START; rowNum <= rowCount; rowNum++) {
    const row = ws.getRow(rowNum);
    const code = str(get(row, 'codice *')).toUpperCase();
    if (!code) continue; // skip empty rows

    try {
      const name = str(get(row, 'nome *'));
      if (!name) {
        errors.push({ row: rowNum, code, error: 'Nome mancante' });
        continue;
      }

      const taglie_str = str(get(row, 'taglie varianti (s:cod1;m:cod2)'));
      const sizeVariants = taglie_str
        ? taglie_str.split(';').map((part) => {
            const [taglia, codice] = part.split(':');
            return { taglia: taglia?.trim() ?? '', codice: codice?.trim() ?? '' };
          }).filter((sv) => sv.taglia && sv.codice)
        : null;

      const costoSenza = num(get(row, 'costo i.e. senza reso *'));
      const retailPrice = num(get(row, 'prezzo vendita i.i. *'));
      if (!costoSenza || !retailPrice) {
        errors.push({ row: rowNum, code, error: 'Costo o prezzo mancante' });
        continue;
      }

      const mat1 = str(get(row, 'materiale 1'));
      const mat2 = str(get(row, 'materiale 2'));
      const mat3 = str(get(row, 'materiale 3'));
      const comp1 = num(get(row, 'comp.1 %'));
      const comp2 = num(get(row, 'comp.2 %'));
      const comp3 = num(get(row, 'comp.3 %'));

      const pantone1 = str(get(row, 'pantone 1'));
      const pantone2 = str(get(row, 'pantone 2'));
      const pantone3 = str(get(row, 'pantone 3'));

      const pantoneIds = (await Promise.all(
        [pantone1, pantone2, pantone3].map((c) => resolvePantoneId(c))
      )).filter((id): id is number => id !== null);

      const ivaRaw = str(get(row, 'iva %'));
      const ivaVal = ivaRaw ? parseInt(ivaRaw, 10) : 22;

      const payload = {
        name,
        gruppoMerceologico: 'Moda',
        famiglia:       str(get(row, 'famiglia')) || null,
        classe:         str(get(row, 'classe')) || null,
        sottoclasse:    str(get(row, 'sottoclasse')) || null,
        gruppoOmogeneo: str(get(row, 'gruppo omogeneo')) || null,
        dettaglio:      str(get(row, 'dettaglio')) || null,
        misura:         str(get(row, 'modello')) || null,
        materiale1:     mat1 || null,
        materiale2:     mat2 || null,
        materiale3:     mat3 || null,
        composizione:   buildComposizione(mat1, comp1, mat2, comp2, mat3, comp3),
        colore:         str(get(row, 'colore 1')) || null,
        colore2:        str(get(row, 'colore 2')) || null,
        colore3:        str(get(row, 'colore 3')) || null,
        fantasia:       (() => { const v = str(get(row, 'fantasia')); return v ? v.charAt(0).toUpperCase() + v.slice(1).toLowerCase() : null; })(),
        lavorazione:    str(get(row, 'lavorazione')) || null,
        produttore:     str(get(row, 'produttore')) || null,
        paese:          str(get(row, 'paese')) || null,
        collezione:     str(get(row, 'collezione')) || null,
        stagione:       str(get(row, 'stagione')) || null,
        tranche:        str(get(row, 'tranche')) || null,
        costoIeSenzaReso: costoSenza,
        costoIeConReso:   num(get(row, 'costo i.e. con reso')),
        costPrice:      costoSenza,
        retailPrice,
        iva:            isNaN(ivaVal) ? 22 : ivaVal,
        lotSize:        num(get(row, 'confezione')) ?? 1,
        isActive:       str(get(row, 'attivo')).toUpperCase() !== 'NO',
        notes:          str(get(row, 'note')) || null,
        sizeVariants:   sizeVariants,
      };

      const existing = await prisma.product.findUnique({ where: { code } });

      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: payload as any,
        });
        // Replace pantone links
        await prisma.$executeRaw`DELETE FROM product_pantones WHERE product_id = ${existing.id}`;
        for (let i = 0; i < pantoneIds.length; i++) {
          await prisma.$executeRaw`
            INSERT INTO product_pantones (product_id, pantone_color_id, sort_order, is_primary)
            VALUES (${existing.id}, ${BigInt(pantoneIds[i])}, ${i}, ${i === 0})
            ON CONFLICT (product_id, pantone_color_id) DO NOTHING
          `;
        }
        updated.push(code);
      } else {
        const created_product = await prisma.product.create({
          data: { code, ...payload } as any,
        });
        for (let i = 0; i < pantoneIds.length; i++) {
          await prisma.$executeRaw`
            INSERT INTO product_pantones (product_id, pantone_color_id, sort_order, is_primary)
            VALUES (${created_product.id}, ${BigInt(pantoneIds[i])}, ${i}, ${i === 0})
            ON CONFLICT (product_id, pantone_color_id) DO NOTHING
          `;
        }
        created.push(code);
      }
    } catch (err: any) {
      errors.push({ row: rowNum, code, error: err?.message ?? 'Errore sconosciuto' });
    }
  }

  return NextResponse.json({ created: created.length, updated: updated.length, errors, createdCodes: created, updatedCodes: updated });
}
