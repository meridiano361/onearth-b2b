import { NextRequest, NextResponse } from 'next/server';
import { requireMondiEspositivi } from '@/lib/featureGuard';
import { prisma } from '@/lib/prisma';

const FORBIDDEN = NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export async function PUT(req: NextRequest, { params }: { params: { orderId: string } }) {
  const operatorId = await requireMondiEspositivi();
  if (!operatorId) return FORBIDDEN;

  const body = await req.json();
  const gruppi: { id: string; posizione: number }[] = body.gruppi ?? [];

  if (!Array.isArray(gruppi)) {
    return NextResponse.json({ error: 'gruppi deve essere un array' }, { status: 400 });
  }

  await prisma.$transaction(
    gruppi.map(({ id, posizione }) =>
      prisma.displayGroup.update({
        where: { id, orderId: params.orderId },
        data: { posizione },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
