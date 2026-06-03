import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const albums = await prisma.album.findMany({
    where: { visibile: true },
    orderBy: { ordine: 'asc' },
    include: { _count: { select: { foto: true } } },
  });

  return NextResponse.json({
    data: albums.map((a) => ({
      id: a.id,
      nome: a.nome,
      descrizione: a.descrizione,
      copertina: a.copertina,
      nFoto: a._count.foto,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}
