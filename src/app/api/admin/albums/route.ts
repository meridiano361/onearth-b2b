import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) return null;
  return session;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const albums = await prisma.album.findMany({
    orderBy: { ordine: 'asc' },
    include: { _count: { select: { foto: true } } },
  });

  return NextResponse.json({
    data: albums.map((a) => ({
      ...a,
      nFoto: a._count.foto,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const nome = (body.nome ?? '').trim();
  if (!nome) return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 });

  const maxOrdine = await prisma.album.aggregate({ _max: { ordine: true } });
  const album = await prisma.album.create({
    data: {
      nome,
      cartella:    body.cartella?.trim() || null,
      descrizione: body.descrizione?.trim() || null,
      visibile: body.visibile === true,
      ordine: (maxOrdine._max.ordine ?? -1) + 1,
    },
  });

  return NextResponse.json({ data: { ...album, nFoto: 0, createdAt: album.createdAt.toISOString() } }, { status: 201 });
}
