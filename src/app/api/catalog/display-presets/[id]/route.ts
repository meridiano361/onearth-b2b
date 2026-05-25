import { NextRequest, NextResponse } from 'next/server';
import { requireMondiEspositivi } from '@/lib/featureGuard';
import { prisma } from '@/lib/prisma';

const FORBIDDEN = NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const operatorId = await requireMondiEspositivi();
  if (!operatorId) return FORBIDDEN;

  await prisma.displayGroupPreset.deleteMany({
    where: { id: params.id, operatorId },
  });

  return NextResponse.json({ ok: true });
}
