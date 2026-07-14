import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const schema = z.object({
  conferente:         z.string().min(1).optional(),
  collezione:         z.string().min(1).optional(),
  scontoConReso:      z.coerce.number().min(0).max(100).optional().nullable(),
  percentualeReso:    z.coerce.number().min(0).max(100).optional().nullable(),
  noteReso:           z.string().optional().nullable(),
  scontoSenzaReso:    z.coerce.number().min(0).max(100).optional().nullable(),
  extraScontoVolume:  z.array(z.object({ soglia: z.coerce.number(), extra: z.coerce.number() })).optional().nullable(),
  importoMinimoIe:    z.coerce.number().min(0).optional().nullable(),
  consegna:           z.string().optional().nullable(),
  pagamentoGg:        z.coerce.number().int().min(0).optional().nullable(),
  condizioniRiordini: z.string().optional().nullable(),
  note:               z.string().optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const body = schema.parse(await req.json());
    const record = await prisma.condizioniCommerciali.update({
      where: { id: params.id },
      data: body as any,
    });
    return NextResponse.json({ data: record });
  } catch (err: any) {
    if (err.code === 'P2025') return NextResponse.json({ error: 'Non trovato' }, { status: 404 });
    if (err.code === 'P2002') return NextResponse.json({ error: 'Già presente per questo conferente+collezione' }, { status: 409 });
    if (err.name === 'ZodError') return NextResponse.json({ error: 'Dati non validi', details: err.errors }, { status: 400 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    await prisma.condizioniCommerciali.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err.code === 'P2025') return NextResponse.json({ error: 'Non trovato' }, { status: 404 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
