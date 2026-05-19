import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { slugify } from '@/lib/utils';

const importRowSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  costPrice: z.union([z.number(), z.string()]).transform((v) => {
    const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v;
    if (isNaN(n)) throw new Error('Invalid cost price');
    return n;
  }),
  retailPrice: z.union([z.number(), z.string()]).transform((v) => {
    const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v;
    if (isNaN(n)) throw new Error('Invalid retail price');
    return n;
  }),
  lotSize: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => {
      if (!v) return 1;
      const n = typeof v === 'string' ? parseInt(v) : v;
      return isNaN(n) ? 1 : n;
    }),
  notes: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  collectionId: z.string().optional().nullable(),
  famiglia: z.string().optional().nullable(),
  sottofamiglia: z.string().optional().nullable(),
  colore: z.string().optional().nullable(),
  nomLinea: z.string().optional().nullable(),
  misura: z.string().optional().nullable(),
  produttore: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { rows, collectionId } = body as {
      rows: any[];
      collectionId?: string;
    };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No rows provided' }, { status: 400 });
    }

    let success = 0;
    const errors: Array<{ row: number; message: string; data?: any }> = [];

    // Preload/cache categories
    const categoryCache = new Map<string, string>();

    for (let i = 0; i < rows.length; i++) {
      try {
        const parsed = importRowSchema.parse(rows[i]);

        // Find or create category
        let categoryId: string | null = null;
        if (parsed.category) {
          const catKey = `${parsed.category}-${collectionId || 'global'}`;
          if (categoryCache.has(catKey)) {
            categoryId = categoryCache.get(catKey)!;
          } else {
            const slug = slugify(parsed.category);
            const existing = await prisma.category.findFirst({
              where: { name: parsed.category, collectionId: collectionId || null },
            });
            if (existing) {
              categoryId = existing.id;
            } else {
              const newCat = await prisma.category.create({
                data: {
                  name: parsed.category,
                  slug,
                  collectionId: collectionId || null,
                  order: 99,
                },
              });
              categoryId = newCat.id;
            }
            categoryCache.set(catKey, categoryId);
          }
        }

        const extraFields = {
          famiglia: parsed.famiglia || null,
          sottofamiglia: parsed.sottofamiglia || null,
          colore: parsed.colore || null,
          nomLinea: parsed.nomLinea || null,
          misura: parsed.misura || null,
          produttore: parsed.produttore || null,
        };

        await prisma.product.upsert({
          where: { code: parsed.code.toUpperCase().trim() },
          update: {
            name: parsed.name,
            description: parsed.description || null,
            costPrice: parsed.costPrice,
            retailPrice: parsed.retailPrice,
            lotSize: parsed.lotSize,
            notes: parsed.notes || null,
            imageUrl: parsed.imageUrl || null,
            categoryId,
            collectionId: collectionId || null,
            ...extraFields,
          },
          create: {
            code: parsed.code.toUpperCase().trim(),
            name: parsed.name,
            description: parsed.description || null,
            costPrice: parsed.costPrice,
            retailPrice: parsed.retailPrice,
            lotSize: parsed.lotSize,
            notes: parsed.notes || null,
            imageUrl: parsed.imageUrl || null,
            categoryId,
            collectionId: collectionId || null,
            isActive: true,
            ...extraFields,
          },
        });

        success++;
      } catch (err: any) {
        errors.push({
          row: i + 1,
          message: err.message || 'Unknown error',
          data: rows[i],
        });
      }
    }

    return NextResponse.json({
      success,
      errors,
      total: rows.length,
    });
  } catch (err) {
    console.error('Import error:', err);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
