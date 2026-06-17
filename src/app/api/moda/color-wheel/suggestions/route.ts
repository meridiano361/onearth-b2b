import { NextRequest, NextResponse } from 'next/server';
import { requireModaSession } from '@/lib/modaServer';
import { prisma } from '@/lib/prisma';
import { hexToHsl, getHueFamilyId, getHarmonyType, harmonyScore, generateDisplayGroups } from '@/lib/colorHarmony';
import type { PantoneInfo } from '@/lib/colorHarmony';
import { MODA_COLLEZIONE } from '@/lib/modaAccess';

type PantoneRow = {
  product_id: string;
  hex_code: string;
  hue_angle: number | null;
  lightness: number | null;
  is_neutral: boolean;
  is_primary: boolean;
  code: string;
  name: string;
  sort_order: number;
};

export async function GET(req: NextRequest) {
  const session = await requireModaSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const productId = req.nextUrl.searchParams.get('productId');
  if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 });

  // Load hero product primary pantone
  const heroPantoneRows = await prisma.$queryRaw<PantoneRow[]>`
    SELECT pp.product_id, pc.hex_code, pc.hue_angle, pc.lightness, pc.is_neutral,
           pp.is_primary, pc.code, pc.name, pp.sort_order
    FROM   product_pantones pp
    JOIN   pantone_colors pc ON pc.id = pp.pantone_color_id
    WHERE  pp.product_id = ${productId}
    ORDER  BY pp.sort_order ASC
  `;

  const heroPrimary = heroPantoneRows.find((r) => r.is_primary) ?? heroPantoneRows[0];
  if (!heroPrimary) {
    return NextResponse.json({ suggestions: [], groups: [] });
  }

  const heroHsl = hexToHsl(heroPrimary.hex_code);
  const heroHue = heroPrimary.hue_angle ?? heroHsl.h;
  const heroL = heroPrimary.lightness ?? heroHsl.l;
  const heroNeutral = heroPrimary.is_neutral;

  // Load all other Moda products with their primary pantone
  const allProducts = await prisma.product.findMany({
    where: {
      isActive: true,
      collezione: MODA_COLLEZIONE,
      gruppoMerceologico: { equals: 'Moda', mode: 'insensitive' },
      id: { not: productId },
    },
    select: { id: true, code: true, name: true, imageUrl: true, colore: true, famiglia: true, costPrice: true, retailPrice: true },
  });

  const otherIds = allProducts.map((p) => p.id);
  if (otherIds.length === 0) return NextResponse.json({ suggestions: [], groups: [] });

  const allPantones = await prisma.$queryRaw<PantoneRow[]>`
    SELECT pp.product_id, pc.hex_code, pc.hue_angle, pc.lightness, pc.is_neutral,
           pp.is_primary, pc.code, pc.name, pp.sort_order
    FROM   product_pantones pp
    JOIN   pantone_colors pc ON pc.id = pp.pantone_color_id
    WHERE  pp.product_id = ANY(${otherIds}::text[])
    ORDER  BY pp.product_id, pp.sort_order ASC
  `;

  // Build primary pantone per product
  const primaryMap = new Map<string, PantoneRow>();
  for (const row of allPantones) {
    const ex = primaryMap.get(row.product_id);
    if (!ex || row.is_primary) primaryMap.set(row.product_id, row);
  }

  // Score each product against hero
  type ScoredProduct = {
    id: string; code: string; name: string; imageUrl: string | null;
    colore: string | null; famiglia: string | null;
    costPrice: number; retailPrice: number;
    primaryPantone: { code: string; name: string; hex_code: string };
    harmonyType: string; score: number; hueFamilyId: string;
  };

  const scored: ScoredProduct[] = [];
  const pantoneInfoPool: PantoneInfo[] = [];

  for (const product of allProducts) {
    const pantone = primaryMap.get(product.id);
    if (!pantone) continue;

    const hsl = hexToHsl(pantone.hex_code);
    const hue = pantone.hue_angle ?? hsl.h;
    const lum = pantone.lightness ?? hsl.l;
    const neutral = pantone.is_neutral;

    const type = getHarmonyType(heroHue, hue, heroNeutral, neutral);
    const score = harmonyScore(heroHue, hue, heroNeutral, neutral, heroL, lum);

    if (score >= 60) {
      scored.push({
        id: product.id,
        code: product.code,
        name: product.name,
        imageUrl: product.imageUrl,
        colore: product.colore,
        famiglia: product.famiglia,
        costPrice: Number(product.costPrice),
        retailPrice: Number(product.retailPrice),
        primaryPantone: { code: pantone.code, name: pantone.name, hex_code: pantone.hex_code },
        harmonyType: type,
        score,
        hueFamilyId: getHueFamilyId(pantone.hex_code, neutral),
      });
    }

    pantoneInfoPool.push({ productId: product.id, hue, lightness: lum, isNeutral: neutral, hex: pantone.hex_code });
  }

  scored.sort((a, b) => b.score - a.score);

  // Group by harmony type
  const byType: Record<string, ScoredProduct[]> = {};
  for (const p of scored) {
    if (!byType[p.harmonyType]) byType[p.harmonyType] = [];
    byType[p.harmonyType].push(p);
  }

  const suggestions = Object.entries(byType).map(([type, products]) => ({
    harmonyType: type,
    products: products.slice(0, 8),
  }));

  // Display groups
  const heroInfo: PantoneInfo = { productId, hue: heroHue, lightness: heroL, isNeutral: heroNeutral, hex: heroPrimary.hex_code };
  const groups = generateDisplayGroups(heroInfo, pantoneInfoPool);

  return NextResponse.json({
    hero: {
      productId,
      primaryPantone: {
        code: heroPrimary.code,
        name: heroPrimary.name,
        hex_code: heroPrimary.hex_code,
        hue_angle: heroHue,
        lightness: heroL,
        is_neutral: heroNeutral,
      },
    },
    suggestions,
    groups,
  });
}
