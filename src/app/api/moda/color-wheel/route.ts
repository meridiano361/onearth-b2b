import { NextResponse } from 'next/server';
import { requireModaSession } from '@/lib/modaServer';
import { prisma } from '@/lib/prisma';
import { hexToHsl, getHueFamilyId, HUE_FAMILIES } from '@/lib/colorHarmony';
import { MODA_COLLEZIONE } from '@/lib/modaAccess';

type PantoneRow = {
  product_id: string;
  pantone_color_id: bigint;
  code: string;
  name: string;
  hex_code: string;
  hue_angle: number | null;
  lightness: number | null;
  is_neutral: boolean;
  sort_order: number;
  is_primary: boolean;
};

export async function GET() {
  const session = await requireModaSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Fetch all active Moda products with their primary pantone
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      collezione: MODA_COLLEZIONE,
      gruppoMerceologico: { equals: 'Moda', mode: 'insensitive' },
    },
    select: {
      id: true,
      code: true,
      name: true,
      imageUrl: true,
      colore: true,
      famiglia: true,
      sottofamiglia: true,
      classe: true,
      gruppoOmogeneo: true,
      costPrice: true,
      retailPrice: true,
    },
    orderBy: { code: 'asc' },
  });

  if (products.length === 0) {
    return NextResponse.json({ families: HUE_FAMILIES.map((f) => ({ ...f, products: [] })) });
  }

  const productIds = products.map((p) => p.id);

  const pantoneRows = await prisma.$queryRaw<PantoneRow[]>`
    SELECT pp.product_id, pp.pantone_color_id,
           pc.code, pc.name, pc.hex_code, pc.hue_angle, pc.lightness, pc.is_neutral,
           pp.sort_order, pp.is_primary
    FROM   product_pantones pp
    JOIN   pantone_colors pc ON pc.id = pp.pantone_color_id
    WHERE  pp.product_id = ANY(${productIds}::text[])
    ORDER  BY pp.product_id, pp.sort_order ASC
  `;

  // Build primary pantone map per product
  const primaryByProduct = new Map<string, PantoneRow>();
  for (const row of pantoneRows) {
    const existing = primaryByProduct.get(row.product_id);
    if (!existing || row.is_primary) {
      primaryByProduct.set(row.product_id, row);
    }
  }

  // Assign each product to a hue family
  const familyMap = new Map<string, typeof products[0][]>();
  for (const f of HUE_FAMILIES) familyMap.set(f.id, []);

  const productPantoneInfo: {
    productId: string; hueFamilyId: string;
    hue: number; lightness: number; isNeutral: boolean; hex: string;
  }[] = [];

  for (const product of products) {
    const pantone = primaryByProduct.get(product.id);
    let hueFamilyId = 'neutral';
    let hue = 0;
    let lum = 50;
    let hex = '#9E9E9E';
    let isNeutral = true;

    if (pantone) {
      hex = pantone.hex_code;
      isNeutral = pantone.is_neutral;
      // Use stored hue_angle if available, otherwise compute
      const hsl = hexToHsl(hex);
      hue = pantone.hue_angle != null ? pantone.hue_angle : hsl.h;
      lum = pantone.lightness != null ? pantone.lightness : hsl.l;
      hueFamilyId = getHueFamilyId(hex, isNeutral);
    }

    familyMap.get(hueFamilyId)!.push(product);
    productPantoneInfo.push({ productId: product.id, hueFamilyId, hue, lightness: lum, isNeutral, hex });
  }

  const families = HUE_FAMILIES.map((f) => ({
    ...f,
    products: (familyMap.get(f.id) ?? []).map((p) => {
      const info = productPantoneInfo.find((i) => i.productId === p.id);
      const pantone = primaryByProduct.get(p.id);
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        imageUrl: p.imageUrl,
        colore: p.colore,
        famiglia: p.famiglia,
        costPrice: Number(p.costPrice),
        retailPrice: Number(p.retailPrice),
        primaryPantone: pantone
          ? {
              pantoneColorId: Number(pantone.pantone_color_id),
              code: pantone.code,
              name: pantone.name,
              hex_code: pantone.hex_code,
              hue_angle: info?.hue ?? 0,
              lightness: info?.lightness ?? 50,
              is_neutral: pantone.is_neutral,
            }
          : null,
        hueFamilyId: info?.hueFamilyId ?? 'neutral',
        hue: info?.hue ?? 0,
        lightness: info?.lightness ?? 50,
        isNeutral: info?.isNeutral ?? true,
      };
    }),
  }));

  return NextResponse.json({ families });
}
