import { NextRequest, NextResponse } from 'next/server';
import { requireVisualSession } from '@/lib/modaServer';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await requireVisualSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const orgId = session.user?.organizationId;
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

  const items = await prisma.prodottoContinuativo.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json({ data: items });
}

export async function POST(req: NextRequest) {
  const session = await requireVisualSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const orgId = session.user?.organizationId;
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

  const { nome, imageUrl } = await req.json();
  if (!nome?.trim()) return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 });

  if (imageUrl && imageUrl.length > 30_000) {
    return NextResponse.json({ error: 'Immagine troppo grande (max 20kb)' }, { status: 400 });
  }

  const item = await prisma.prodottoContinuativo.create({
    data: { nome: nome.trim(), imageUrl: imageUrl ?? null, organizationId: orgId },
  });
  return NextResponse.json({ data: item }, { status: 201 });
}
