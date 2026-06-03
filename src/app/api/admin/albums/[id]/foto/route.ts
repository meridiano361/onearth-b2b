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

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const foto = await prisma.albumFoto.findMany({
    where: { albumId: params.id },
    orderBy: { ordine: 'asc' },
  });

  return NextResponse.json({ data: foto.map((f) => ({ ...f, createdAt: f.createdAt.toISOString() })) });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { url, didascalia } = body;
  if (!url) return NextResponse.json({ error: 'url obbligatorio' }, { status: 400 });

  const max = await prisma.albumFoto.aggregate({ _max: { ordine: true }, where: { albumId: params.id } });
  const foto = await prisma.albumFoto.create({
    data: {
      albumId: params.id,
      url,
      didascalia: didascalia?.trim() || null,
      ordine: (max._max.ordine ?? -1) + 1,
    },
  });

  // If first photo, set as album cover
  const count = await prisma.albumFoto.count({ where: { albumId: params.id } });
  if (count === 1) {
    await prisma.album.update({ where: { id: params.id }, data: { copertina: url } });
  }

  return NextResponse.json({ data: { ...foto, createdAt: foto.createdAt.toISOString() } }, { status: 201 });
}
