import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { slugify } from '@/lib/utils';
import { normalizeProductClassificationFields } from '@/lib/normalizeClassification';
import { normalizeProductName } from '@/lib/normalizeProductName';
import { syncProductClassification } from '@/lib/syncClassification';
import { translateProduct } from '@/lib/translate';

const productSchema = z.object({
  colorBlockIds: z.array(z.coerce.number().int()).optional(),
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  costPrice: z.coerce.number().positive(),
  retailPrice: z.coerce.number().positive(),
  lotSize: z.coerce.number().int().positive().default(1),
  imageUrl: z.string().optional().nullable(),
  imageUrl2: z.string().optional().nullable(),
  imageUrl3: z.string().optional().nullable(),
  imageUrl4: z.string().optional().nullable(),
  imageUrl5: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  collectionId: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  stock: z.coerce.number().int().optional().nullable(),
  famiglia: z.string().optional().nullable(),
  sottofamiglia: z.string().optional().nullable(),
  colore: z.string().optional().nullable(),
  nomLinea: z.string().optional().nullable(),
  misura: z.string().optional().nullable(),
  produttore: z.string().optional().nullable(),
  gruppoMerceologico: z.string().optional().nullable(),
  classe: z.string().optional().nullable(),
  classe2: z.string().optional().nullable(),
  sottoclasse: z.string().optional().nullable(),
  sottoclasse2: z.string().optional().nullable(),
  gruppoOmogeneo: z.string().optional().nullable(),
  gruppoOmogeneo2: z.string().optional().nullable(),
  stagione: z.string().optional().nullable(),
  temaColore:   z.string().optional().nullable(),
  temaColore2:  z.string().optional().nullable(),
  temaColore3:  z.string().optional().nullable(),
  temaColore4:  z.string().optional().nullable(),
  temaColore5:  z.string().optional().nullable(),
  temaColore6:  z.string().optional().nullable(),
  temaColore7:  z.string().optional().nullable(),
  temaColore8:  z.string().optional().nullable(),
  temaColore9:  z.string().optional().nullable(),
  temaColore10: z.string().optional().nullable(),
  fasciaRicarico: z.string().optional().nullable(),
  fasciaSconto: z.coerce.number().min(0).max(100).optional().nullable(),
  collezione: z.string().optional().nullable(),
  tranche: z.string().optional().nullable(),
  paese: z.string().optional().nullable(),
  iva: z.coerce.number().int().min(0).max(100).default(22),
  conferente: z.string().optional().nullable(),
  materiale1: z.string().optional().nullable(),
  materiale2: z.string().optional().nullable(),
  materiale3: z.string().optional().nullable(),
  composizione: z.string().optional().nullable(),
  certificazione1: z.string().optional().nullable(),
  certificazione2: z.string().optional().nullable(),
  certificazione3: z.string().optional().nullable(),
  fantasia: z.string().optional().nullable(),
  lavorazione: z.string().optional().nullable(),
  dettaglio: z.string().optional().nullable(),
  pantoneColorIds: z.array(z.coerce.number().int()).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const active = searchParams.get('active');
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search');
    const collectionId = searchParams.get('collectionId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const skip = (page - 1) * limit;

    const isAdmin = isAdminRole(session.user.role);

    // ids=id1,id2,... — fetch exact products by ID (ignores active filter)
    const ids = searchParams.get('ids');
    const where: any = {};
    if (ids) {
      where.id = { in: ids.split(',').filter(Boolean) };
    } else {
      if (active === 'true') where.isActive = true;
    }

    // Non-admin users cannot see MODA products
    if (!isAdmin) {
      where.NOT = [{ gruppoMerceologico: { equals: 'Moda', mode: 'insensitive' } }];
    }
    if (categoryId) where.categoryId = categoryId;
    if (collectionId) where.collectionId = collectionId;
    if (search) {
      where.OR = [
        { code:            { contains: search, mode: 'insensitive' } },
        { name:            { contains: search, mode: 'insensitive' } },
        { description:     { contains: search, mode: 'insensitive' } },
        { famiglia:        { contains: search, mode: 'insensitive' } },
        { sottofamiglia:   { contains: search, mode: 'insensitive' } },
        { gruppoOmogeneo:  { contains: search, mode: 'insensitive' } },
        { nomLinea:        { contains: search, mode: 'insensitive' } },
        { notes:           { contains: search, mode: 'insensitive' } },
      ];
    }

    const gruppoMerceologico = searchParams.get('gruppoMerceologico');
    const colore = searchParams.get('colore');
    const stagione = searchParams.get('stagione');
    const temaColore = searchParams.get('temaColore');
    const collezione = searchParams.get('collezione');
    const tranche = searchParams.get('tranche');
    const nomLinea = searchParams.get('nomLinea');

    if (gruppoMerceologico) where.gruppoMerceologico = gruppoMerceologico;
    if (colore) where.colore = colore;
    if (stagione) where.stagione = stagione;
    if (temaColore) where.temaColore = temaColore;
    if (collezione) where.collezione = collezione;
    if (tranche) where.tranche = tranche;
    if (nomLinea) where.nomLinea = nomLinea;

    const famiglia = searchParams.get('famiglia');
    const sottofamiglia = searchParams.get('sottofamiglia');
    const gruppoOmogeneo = searchParams.get('gruppoOmogeneo');
    const classe = searchParams.get('classe');
    const sottoclasse = searchParams.get('sottoclasse');
    const produttore = searchParams.get('produttore');

    if (famiglia) where.famiglia = famiglia;
    if (sottofamiglia) where.sottofamiglia = sottofamiglia;
    if (gruppoOmogeneo) where.gruppoOmogeneo = gruppoOmogeneo;
    if (classe) where.classe = classe;
    if (sottoclasse) where.sottoclasse = sottoclasse;
    if (produttore) where.produttore = produttore;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: {
            include: {
              parent: true,
            },
          },
        },
        orderBy: [{ category: { order: 'asc' } }, { code: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    // Fetch color blocks and pantone entries for all returned products
    const productIds = products.map((p) => p.id);
    type CbLink = { product_id: string; color_block_id: bigint };
    const cbLinks = productIds.length > 0
      ? await prisma.$queryRaw<CbLink[]>`
          SELECT product_id, color_block_id
          FROM product_color_blocks
          WHERE product_id = ANY(${productIds}::text[])
        `
      : [];
    const cbByProductId = new Map<string, number[]>();
    for (const link of cbLinks) {
      const arr = cbByProductId.get(link.product_id) ?? [];
      arr.push(Number(link.color_block_id));
      cbByProductId.set(link.product_id, arr);
    }

    type PpLink = {
      product_id: string; pantone_color_id: bigint; code: string;
      name: string; hex_code: string; system_type: string;
      sort_order: number; is_primary: boolean;
    };
    const ppLinks = productIds.length > 0
      ? await prisma.$queryRaw<PpLink[]>`
          SELECT pp.product_id, pp.pantone_color_id, pc.code, pc.name, pc.hex_code, pc.system_type,
                 pp.sort_order, pp.is_primary
          FROM   product_pantones pp
          JOIN   pantone_colors pc ON pc.id = pp.pantone_color_id
          WHERE  pp.product_id = ANY(${productIds}::text[])
          ORDER  BY pp.sort_order ASC
        `
      : [];
    const ppByProductId = new Map<string, typeof ppLinks>();
    for (const link of ppLinks) {
      const arr = ppByProductId.get(link.product_id) ?? [];
      arr.push(link);
      ppByProductId.set(link.product_id, arr);
    }

    // Serialize Decimals
    const serialized = products.map((p) => ({
      ...p,
      costPrice: Number(p.costPrice),
      retailPrice: Number(p.retailPrice),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      colorBlockIds: cbByProductId.get(p.id) ?? [],
      pantoneColors: (ppByProductId.get(p.id) ?? []).map((pp) => ({
        pantoneColorId: Number(pp.pantone_color_id),
        code: pp.code, name: pp.name, hex_code: pp.hex_code,
        system_type: pp.system_type, sortOrder: pp.sort_order, isPrimary: pp.is_primary,
      })),
    }));

    return NextResponse.json({
      data: serialized,
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('GET /api/products error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = productSchema.parse(body);
    const { colorBlockIds, pantoneColorIds, ...rest } = parsed;
    const data = normalizeProductClassificationFields(rest);

    if (data.gruppoMerceologico?.toLowerCase() === 'moda' && (!pantoneColorIds || pantoneColorIds.length === 0)) {
      return NextResponse.json({ error: 'Il Pantone è obbligatorio per i prodotti MODA' }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        code: data.code.toUpperCase().trim(),
        name: normalizeProductName(data.name, data.nomLinea),
        description: data.description || null,
        costPrice: data.costPrice,
        retailPrice: data.retailPrice,
        lotSize: data.lotSize,
        imageUrl: data.imageUrl || null,
        imageUrl2: data.imageUrl2 || null,
        imageUrl3: data.imageUrl3 || null,
        imageUrl4: data.imageUrl4 || null,
        imageUrl5: data.imageUrl5 || null,
        notes: data.notes || null,
        categoryId: data.categoryId || null,
        collectionId: data.collectionId || null,
        isActive: data.isActive,
        stock: data.stock || null,
        famiglia: data.famiglia || null,
        sottofamiglia: data.sottofamiglia || null,
        colore: data.colore || null,
        nomLinea: data.nomLinea || null,
        misura: data.misura || null,
        produttore: data.produttore || null,
        gruppoMerceologico: data.gruppoMerceologico || null,
        classe: data.classe || null,
        classe2: data.classe2 || null,
        sottoclasse: data.sottoclasse || null,
        sottoclasse2: data.sottoclasse2 || null,
        gruppoOmogeneo: data.gruppoOmogeneo || null,
        gruppoOmogeneo2: data.gruppoOmogeneo2 || null,
        stagione: data.stagione || null,
        temaColore:   data.temaColore   || null,
        temaColore2:  data.temaColore2  || null,
        temaColore3:  data.temaColore3  || null,
        temaColore4:  data.temaColore4  || null,
        temaColore5:  data.temaColore5  || null,
        temaColore6:  data.temaColore6  || null,
        temaColore7:  data.temaColore7  || null,
        temaColore8:  data.temaColore8  || null,
        temaColore9:  data.temaColore9  || null,
        temaColore10: data.temaColore10 || null,
        fasciaRicarico: data.fasciaRicarico || null,
        fasciaSconto: data.fasciaSconto ?? null,
        collezione: data.collezione || null,
        tranche: data.tranche || null,
        paese: data.paese || null,
        iva: data.iva ?? 22,
        conferente: data.conferente || null,
        materiale1: data.materiale1 || null,
        materiale2: data.materiale2 || null,
        materiale3: data.materiale3 || null,
        composizione: data.composizione || null,
        certificazione1: data.certificazione1 || null,
        certificazione2: data.certificazione2 || null,
        certificazione3: data.certificazione3 || null,
        fantasia: data.fantasia || null,
        lavorazione: data.lavorazione || null,
        dettaglio: data.dettaglio || null,
      },
      include: { category: true },
    });

    // Sync color blocks many-to-many
    if (colorBlockIds && colorBlockIds.length > 0) {
      for (const cbId of colorBlockIds) {
        await prisma.$executeRaw`
          INSERT INTO product_color_blocks (product_id, color_block_id)
          VALUES (${product.id}, ${BigInt(cbId)})
        `;
      }
    }

    // Sync pantone many-to-many
    if (pantoneColorIds && pantoneColorIds.length > 0) {
      for (let i = 0; i < pantoneColorIds.length; i++) {
        await prisma.$executeRaw`
          INSERT INTO product_pantones (product_id, pantone_color_id, sort_order, is_primary)
          VALUES (${product.id}, ${BigInt(pantoneColorIds[i])}, ${i}, ${i === 0})
          ON CONFLICT (product_id, pantone_color_id) DO NOTHING
        `;
      }
    }

    void syncProductClassification(data);

    // Auto-translate alla creazione
    const testoPerTrad = data.description || data.name;
    void translateProduct(testoPerTrad).then((trad) =>
      prisma.product.update({ where: { id: product.id }, data: trad })
    ).catch(() => {});

    return NextResponse.json({
      data: {
        ...product,
        costPrice: Number(product.costPrice),
        retailPrice: Number(product.retailPrice),
        fasciaSconto: product.fasciaSconto != null ? Number(product.fasciaSconto) : null,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
      },
    }, { status: 201 });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Product code already exists' }, { status: 409 });
    }
    if (err.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid data', details: err.errors }, { status: 400 });
    }
    console.error('POST /api/products error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
