import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';
import {
  COLORE_OPTIONS,
  FANTASIA_OPTIONS,
  MATERIALE_OPTIONS,
  TAGLIA_OPTIONS,
  STAGIONE_OPTIONS,
} from '@/lib/productConstants';
import { MODA_FAMIGLIE } from '@/lib/modaTassonomia';

const IVA_OPTIONS = ['0', '4', '5', '10', '22'];
const SI_NO_OPTIONS = ['SI', 'NO'];

const COLS = [
  { key: 'code',              header: 'Codice *',                    width: 16 },
  { key: 'name',              header: 'Nome *',                      width: 30 },
  { key: 'famiglia',          header: 'Famiglia',                    width: 22 },
  { key: 'classe',            header: 'Classe',                      width: 18 },
  { key: 'sottoclasse',       header: 'Sottoclasse',                 width: 20 },
  { key: 'gruppoOmogeneo',    header: 'Gruppo omogeneo',             width: 22 },
  { key: 'dettaglio',         header: 'Tipo',                        width: 18 },
  { key: 'misura',            header: 'Modello',                     width: 16 },
  { key: 'taglia',            header: 'Taglia',                      width: 10 },
  { key: 'taglie_varianti',   header: 'Taglie varianti (S:COD1;M:COD2)', width: 28 },
  { key: 'materiale1',        header: 'Materiale 1',                 width: 18 },
  { key: 'comp1',             header: 'Comp.1 %',                    width: 10 },
  { key: 'materiale2',        header: 'Materiale 2',                 width: 18 },
  { key: 'comp2',             header: 'Comp.2 %',                    width: 10 },
  { key: 'materiale3',        header: 'Materiale 3',                 width: 18 },
  { key: 'comp3',             header: 'Comp.3 %',                    width: 10 },
  { key: 'colore',            header: 'Colore 1',                    width: 18 },
  { key: 'colore2',           header: 'Colore 2',                    width: 18 },
  { key: 'colore3',           header: 'Colore 3',                    width: 18 },
  { key: 'pantone1',          header: 'Pantone 1',                   width: 14 },
  { key: 'pantone2',          header: 'Pantone 2',                   width: 14 },
  { key: 'pantone3',          header: 'Pantone 3',                   width: 14 },
  { key: 'fantasia',          header: 'Fantasia',                    width: 24 },
  { key: 'lavorazione',       header: 'Lavorazione',                 width: 20 },
  { key: 'produttore',        header: 'Produttore',                  width: 18 },
  { key: 'paese',             header: 'Paese',                       width: 14 },
  { key: 'collezione',        header: 'Collezione',                  width: 14 },
  { key: 'stagione',          header: 'Stagione',                    width: 10 },
  { key: 'tranche',           header: 'Tranche',                     width: 12 },
  { key: 'costoIeSenzaReso',  header: 'Costo i.e. senza reso *',    width: 20 },
  { key: 'costoIeConReso',    header: 'Costo i.e. con reso',        width: 18 },
  { key: 'retailPrice',       header: 'Prezzo vendita i.i. *',      width: 20 },
  { key: 'iva',               header: 'IVA %',                       width: 8  },
  { key: 'lotSize',           header: 'Confezione',                  width: 12 },
  { key: 'isActive',          header: 'Attivo',                      width: 8  },
  { key: 'notes',             header: 'Note',                        width: 30 },
];

// --- Lists for dropdown references ---
const LISTS: Record<string, readonly string[] | string[]> = {
  Famiglia:   MODA_FAMIGLIE,
  Taglia:     TAGLIA_OPTIONS,
  Materiale:  MATERIALE_OPTIONS,
  Colore:     COLORE_OPTIONS,
  Fantasia:   FANTASIA_OPTIONS,
  Stagione:   STAGIONE_OPTIONS,
  IVA:        IVA_OPTIONS,
  Attivo:     SI_NO_OPTIONS,
};

function colLetter(idx: number): string {
  let letter = '';
  idx += 1;
  while (idx > 0) {
    const rem = (idx - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    idx = Math.floor((idx - 1) / 26);
  }
  return letter;
}

function composizioneToPercent(comp: string | null, slot: 1 | 2 | 3): number | null {
  if (!comp) return null;
  const parts = comp.split(/[,;]/).map((s) => s.trim());
  const part = parts[slot - 1];
  if (!part) return null;
  const m = part.match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  const products = await prisma.product.findMany({
    where: { gruppoMerceologico: 'Moda' },
    orderBy: { code: 'asc' },
  });

  // Fetch pantone info for all products
  type PpRow = { product_id: string; code: string; sort_order: number };
  const productIds = products.map((p) => p.id);
  const ppRows: PpRow[] = productIds.length > 0
    ? await prisma.$queryRaw<PpRow[]>`
        SELECT pp.product_id, pc.code, pp.sort_order
        FROM   product_pantones pp
        JOIN   pantone_colors pc ON pc.id = pp.pantone_color_id
        WHERE  pp.product_id = ANY(${productIds}::text[])
        ORDER  BY pp.sort_order ASC
      `
    : [];
  const pantonesByProduct = new Map<string, string[]>();
  for (const row of ppRows) {
    const arr = pantonesByProduct.get(row.product_id) ?? [];
    arr.push(row.code);
    pantonesByProduct.set(row.product_id, arr);
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'ON EARTH';
  wb.created = new Date();

  // --- Hidden "Liste" sheet ---
  const listeSheet = wb.addWorksheet('Liste');
  listeSheet.state = 'hidden';

  // Write each list into a column on Liste sheet
  const listColIndex: Record<string, number> = {};
  let colIdx = 1;
  for (const [listName, values] of Object.entries(LISTS)) {
    listColIndex[listName] = colIdx;
    listeSheet.getCell(1, colIdx).value = listName;
    (values as string[]).forEach((v, i) => {
      listeSheet.getCell(i + 2, colIdx).value = v;
    });
    colIdx++;
  }

  // Helper: get the ExcelJS data validation formula for a list
  function listFormula(listName: string): string {
    const idx = listColIndex[listName];
    const len = (LISTS[listName] as string[]).length;
    const letter = colLetter(idx - 1);
    return `Liste!$${letter}$2:$${letter}$${len + 1}`;
  }

  // --- Main "Prodotti MODA" sheet ---
  const ws = wb.addWorksheet('Prodotti MODA');

  // Header row
  ws.columns = COLS.map((c) => ({ key: c.key, width: c.width }));
  const headerRow = ws.addRow(COLS.map((c) => c.header));
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a1a2e' } };
  headerRow.alignment = { vertical: 'middle', wrapText: false };
  headerRow.height = 20;
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  // Instructions row
  const instrRow = ws.addRow(COLS.map((c) => {
    if (c.key === 'taglie_varianti') return 'Formato: S:COD;M:COD2 — se compilato ignora Taglia e Codice';
    if (c.key === 'comp1' || c.key === 'comp2' || c.key === 'comp3') return 'es: 80';
    if (c.key === 'lotSize') return 'Default 1';
    if (c.key === 'iva') return '0/4/5/10/22';
    if (c.key === 'isActive') return 'SI / NO';
    return '';
  }));
  instrRow.font = { italic: true, color: { argb: 'FF888888' }, size: 9 };
  instrRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
  instrRow.height = 15;

  // Populate existing products
  const FIRST_DATA_ROW = 3;
  for (const p of products) {
    const pantones = pantonesByProduct.get(p.id) ?? [];
    const sizeVariants = (p.sizeVariants as Array<{ taglia: string; codice: string }> | null) ?? null;
    const taglie_varianti = sizeVariants?.length
      ? sizeVariants.map((sv) => `${sv.taglia}:${sv.codice}`).join(';')
      : '';

    // composizione: "80% Cotone, 20% Lino" — parse percentages
    const comp = p.composizione ?? '';
    const compParts = comp ? comp.split(/[,;]/).map((s) => s.trim()) : [];
    function extractPercent(part: string | undefined): number | null {
      if (!part) return null;
      const m = part.match(/(\d+(?:\.\d+)?)/);
      return m ? Number(m[1]) : null;
    }

    const rowData = {
      code:             p.code,
      name:             p.name,
      famiglia:         p.famiglia ?? '',
      classe:           p.classe ?? '',
      sottoclasse:      p.sottoclasse ?? '',
      gruppoOmogeneo:   p.gruppoOmogeneo ?? '',
      dettaglio:        p.dettaglio ?? '',
      misura:           p.misura ?? '',
      taglia:           (!sizeVariants?.length ? (p as any).taglia ?? '' : ''),
      taglie_varianti,
      materiale1:       p.materiale1 ?? '',
      comp1:            extractPercent(compParts[0]) ?? '',
      materiale2:       p.materiale2 ?? '',
      comp2:            extractPercent(compParts[1]) ?? '',
      materiale3:       p.materiale3 ?? '',
      comp3:            extractPercent(compParts[2]) ?? '',
      colore:           p.colore ?? '',
      colore2:          p.colore2 ?? '',
      colore3:          p.colore3 ?? '',
      pantone1:         pantones[0] ?? '',
      pantone2:         pantones[1] ?? '',
      pantone3:         pantones[2] ?? '',
      fantasia:         p.fantasia ?? '',
      lavorazione:      p.lavorazione ?? '',
      produttore:       p.produttore ?? '',
      paese:            p.paese ?? '',
      collezione:       p.collezione ?? '',
      stagione:         p.stagione ?? '',
      tranche:          p.tranche ?? '',
      costoIeSenzaReso: p.costoIeSenzaReso != null ? Number(p.costoIeSenzaReso) : Number(p.costPrice),
      costoIeConReso:   p.costoIeConReso != null ? Number(p.costoIeConReso) : '',
      retailPrice:      Number(p.retailPrice),
      iva:              String(p.iva ?? 22),
      lotSize:          p.lotSize ?? 1,
      isActive:         p.isActive ? 'SI' : 'NO',
      notes:            p.notes ?? '',
    };
    ws.addRow(rowData);
  }

  // Apply dropdowns and formatting to data columns (rows 3 onward, up to 2000)
  const MAX_ROWS = 2000;

  const dropdownCols: Record<string, string> = {
    famiglia:       'Famiglia',
    taglia:         'Taglia',
    materiale1:     'Materiale',
    materiale2:     'Materiale',
    materiale3:     'Materiale',
    colore:         'Colore',
    colore2:        'Colore',
    colore3:        'Colore',
    fantasia:       'Fantasia',
    stagione:       'Stagione',
    iva:            'IVA',
    isActive:       'Attivo',
  };

  const numericCols = ['comp1', 'comp2', 'comp3', 'costoIeSenzaReso', 'costoIeConReso', 'retailPrice', 'lotSize'];

  for (let c = 0; c < COLS.length; c++) {
    const colDef = COLS[c];
    const col = ws.getColumn(c + 1);
    const listName = dropdownCols[colDef.key];

    for (let r = FIRST_DATA_ROW; r <= MAX_ROWS; r++) {
      const cell = ws.getCell(r, c + 1);
      if (listName) {
        cell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [listFormula(listName)],
          showErrorMessage: true,
          errorTitle: 'Valore non valido',
          error: `Scegli un valore dalla lista`,
        };
      }
      if (numericCols.includes(colDef.key)) {
        cell.numFmt = '#,##0.00';
      }
    }

    // Highlight required columns header
    if (colDef.header.includes('*')) {
      ws.getCell(1, c + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2d2d5a' } };
    }
  }

  // Alternating row colors for existing data
  for (let r = FIRST_DATA_ROW; r < FIRST_DATA_ROW + products.length; r++) {
    if (r % 2 === 0) {
      ws.getRow(r).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F9FB' } };
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="moda-prodotti-${date}.xlsx"`,
    },
  });
}
