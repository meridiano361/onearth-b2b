import { NextRequest, NextResponse } from 'next/server';
import { requireVisualSession } from '@/lib/modaServer';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireVisualSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const orgId = session.user?.organizationId;
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

  const existing = await prisma.prodottoContinuativo.findFirst({
    where: { id: params.id, organizationId: orgId },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { nome, imageUrl } = await req.json();
  if (imageUrl && imageUrl.length > 30_000) {
    return NextResponse.json({ error: 'Immagine troppo grande (max 20kb)' }, { status: 400 });
  }

  const updated = await prisma.prodottoContinuativo.update({
    where: { id: params.id },
    data: {
      ...(nome?.trim() ? { nome: nome.trim() } : {}),
      ...(imageUrl !== undefined ? { imageUrl: imageUrl ?? null } : {}),
    },
  });
  return NextResponse.json({ data: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireVisualSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const orgId = session.user?.organizationId;
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

  const existing = await prisma.prodottoContinuativo.findFirst({
    where: { id: params.id, organizationId: orgId },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.prodottoContinuativo.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
