import { NextRequest, NextResponse } from 'next/server';
import { requireModaSession } from '@/lib/modaServer';
import { prisma } from '@/lib/prisma';
import { MODA_COLLEZIONE } from '@/lib/modaAccess';
import { hexToHsl, getHueFamilyId, isColorNeutral, getHarmonyType, harmonyScore, generateDisplayGroups } from '@/lib/colorHarmony';
import type { PantoneInfo } from '@/lib/colorHarmony';


type PantoneRow = {
  product_id: string;
  hex_code: string;
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

  // Load hero product (full data for focused view)
  const heroProduct = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true, code: true, name: true,
      imageUrl: true, imageUrl2: true, imageUrl3: true, imageUrl4: true, imageUrl5: true,
      famiglia: true, sottofamiglia: true, classe: true, sottoclasse: true, gruppoOmogeneo: true,
    },
  });

  // Load hero product primary pantone
  const heroPantoneRows = await prisma.$queryRaw<PantoneRow[]>`
    SELECT pp.product_id, pc.hex_code,
           pp.is_primary, pc.code, pc.name, pp.sort_order
    FROM   product_pantones pp
    JOIN   pantone_colors pc ON pc.id = pp.pantone_color_id
    WHERE  pp.product_id = ${productId}
    ORDER  BY pp.sort_order ASC
  `;

  const heroPrimary = heroPantoneRows.find((r) => r.is_primary) ?? heroPantoneRows[0];
  if (!heroPrimary) {
    return NextResponse.json({
      hero: heroProduct ? {
        productId,
        code: heroProduct.code,
        name: heroProduct.name,
        imageUrl: heroProduct.imageUrl ?? heroProduct.imageUrl2 ?? heroProduct.imageUrl3 ?? null,
        famiglia: heroProduct.famiglia,
        sottofamiglia: heroProduct.sottofamiglia,
        classe: heroProduct.classe,
        sottoclasse: heroProduct.sottoclasse,
        gruppoOmogeneo: heroProduct.gruppoOmogeneo,
        primaryPantone: null,
      } : null,
      suggestions: [],
      groups: [],
      allScored: [],
    });
  }

  const heroHsl = hexToHsl(heroPrimary.hex_code);
  const heroHue = heroHsl.h;
  const heroL = heroHsl.l;
  const heroNeutral = isColorNeutral(heroHsl);

  // Load all other Moda products with taxonomy fields
  const allProducts = await prisma.product.findMany({
    where: {
      isActive: true,
      collezione: MODA_COLLEZIONE,
      gruppoMerceologico: { equals: 'Moda', mode: 'insensitive' },
      id: { not: productId },
    },
    select: {
      id: true, code: true, name: true,
      imageUrl: true, imageUrl2: true, imageUrl3: true, imageUrl4: true, imageUrl5: true,
      colore: true, famiglia: true, sottofamiglia: true,
      classe: true, sottoclasse: true, gruppoOmogeneo: true,
      costPrice: true, retailPrice: true,
    },
  });

  const otherIds = allProducts.map((p) => p.id);
  if (otherIds.length === 0) {
    return NextResponse.json({
      hero: {
        productId,
        code: heroProduct?.code ?? '',
        name: heroProduct?.name ?? '',
        imageUrl: heroProduct?.imageUrl ?? null,
        famiglia: heroProduct?.famiglia ?? null,
        sottofamiglia: heroProduct?.sottofamiglia ?? null,
        classe: heroProduct?.classe ?? null,
        sottoclasse: heroProduct?.sottoclasse ?? null,
        gruppoOmogeneo: heroProduct?.gruppoOmogeneo ?? null,
        primaryPantone: {
          code: heroPrimary.code, name: heroPrimary.name, hex_code: heroPrimary.hex_code,
          hue_angle: heroHue, lightness: heroL, is_neutral: heroNeutral,
        },
      },
      suggestions: [],
      groups: [],
      allScored: [],
    });
  }

  const allPantones = await prisma.$queryRaw<PantoneRow[]>`
    SELECT pp.product_id, pc.hex_code,
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

  type ScoredProduct = {
    id: string; code: string; name: string; imageUrl: string | null;
    colore: string | null; famiglia: string | null; sottofamiglia: string | null;
    classe: string | null; sottoclasse: string | null; gruppoOmogeneo: string | null;
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
    const hue = hsl.h;
    const lum = hsl.l;
    const neutral = isColorNeutral(hsl);

    const type = getHarmonyType(heroHue, hue, heroNeutral, neutral);
    const score = harmonyScore(heroHue, hue, heroNeutral, neutral, heroL, lum);

    if (score >= 60) {
      scored.push({
        id: product.id,
        code: product.code,
        name: product.name,
        imageUrl: product.imageUrl ?? product.imageUrl2 ?? product.imageUrl3 ?? product.imageUrl4 ?? product.imageUrl5 ?? null,
        colore: product.colore,
        famiglia: product.famiglia,
        sottofamiglia: product.sottofamiglia,
        classe: product.classe,
        sottoclasse: product.sottoclasse,
        gruppoOmogeneo: product.gruppoOmogeneo,
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

  // Group by harmony type (top 8 each — used by original suggestion pills)
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
      code: heroProduct?.code ?? '',
      name: heroProduct?.name ?? '',
      imageUrl: heroProduct?.imageUrl ?? heroProduct?.imageUrl2 ?? heroProduct?.imageUrl3 ?? heroProduct?.imageUrl4 ?? heroProduct?.imageUrl5 ?? null,
      famiglia: heroProduct?.famiglia ?? null,
      sottofamiglia: heroProduct?.sottofamiglia ?? null,
      classe: heroProduct?.classe ?? null,
      sottoclasse: heroProduct?.sottoclasse ?? null,
      gruppoOmogeneo: heroProduct?.gruppoOmogeneo ?? null,
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
    allScored: scored, // all scored products with taxonomy, no slice limit
  });
}
