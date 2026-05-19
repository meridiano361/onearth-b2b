import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const schema = z.object({
  ids: z.array(z.string()).min(1),
  data: z.object({
    gruppoMerceologico: z.string().optional().nullable(),
    famiglia: z.string().optional().nullable(),
    classe: z.string().optional().nullable(),
    produttore: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
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

    // Only include fields that were explicitly provided
    const updateData: Record<string, unknown> = {};
    if (data.gruppoMerceologico !== undefined) updateData.gruppoMerceologico = data.gruppoMerceologico || null;
    if (data.famiglia !== undefined) updateData.famiglia = data.famiglia || null;
    if (data.classe !== undefined) updateData.classe = data.classe || null;
    if (data.produttore !== undefined) updateData.produttore = data.produttore || null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

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
