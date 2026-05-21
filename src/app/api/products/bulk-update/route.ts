import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { normalizeProductClassificationFields } from '@/lib/normalizeClassification';

const schema = z.object({
  ids: z.array(z.string()).min(1),
  data: z.object({
    // Anagrafica
    produttore:          z.string().optional().nullable(),
    misura:              z.string().optional().nullable(),
    paese:               z.string().optional().nullable(),
    // Classificazione
    gruppoMerceologico:  z.string().optional().nullable(),
    famiglia:            z.string().optional().nullable(),
    classe:              z.string().optional().nullable(),
    sottoclasse:         z.string().optional().nullable(),
    gruppoOmogeneo:      z.string().optional().nullable(),
    nomLinea:            z.string().optional().nullable(),
    stagione:            z.string().optional().nullable(),
    collezione:          z.string().optional().nullable(),
    colore:              z.string().optional().nullable(),
    temaColore:          z.string().optional().nullable(),
    // Prezzi e logistica
    lotSize:             z.coerce.number().int().positive().optional(),
    iva:                 z.coerce.number().int().min(0).max(100).optional(),
    costPrice:           z.coerce.number().positive().optional(),
    retailPrice:         z.coerce.number().positive().optional(),
    fasciaRicarico:      z.string().optional().nullable(),
    fasciaSconto:        z.coerce.number().min(0).max(100).optional().nullable(),
    tranche:             z.string().optional().nullable(),
    // Altri
    notes:               z.string().optional().nullable(),
    isActive:            z.boolean().optional(),
  }),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { ids, data } = schema.parse(body);

    const normalized = normalizeProductClassificationFields(data as Record<string, any>);

    const updateData: Record<string, unknown> = {};
    const strFields = [
      'produttore', 'misura', 'paese',
      'gruppoMerceologico', 'famiglia', 'classe', 'sottoclasse', 'gruppoOmogeneo',
      'nomLinea', 'stagione', 'collezione', 'colore', 'temaColore',
      'fasciaRicarico', 'tranche', 'notes',
    ] as const;
    for (const f of strFields) {
      if (normalized[f] !== undefined) updateData[f] = normalized[f] || null;
    }
    if (normalized.lotSize !== undefined) updateData.lotSize = normalized.lotSize;
    if (normalized.iva !== undefined) updateData.iva = normalized.iva;
    if (normalized.costPrice !== undefined) updateData.costPrice = normalized.costPrice;
    if (normalized.retailPrice !== undefined) updateData.retailPrice = normalized.retailPrice;
    if (normalized.fasciaSconto !== undefined) updateData.fasciaSconto = normalized.fasciaSconto ?? null;
    if (normalized.isActive !== undefined) updateData.isActive = normalized.isActive;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { count } = await prisma.product.updateMany({
      where: { id: { in: ids } },
      data: updateData,
    });

    return NextResponse.json({ updated: count });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid data', details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
