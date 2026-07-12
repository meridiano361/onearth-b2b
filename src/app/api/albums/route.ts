import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const collezione = req.nextUrl.searchParams.get('collezione');

  const albums = await prisma.album.findMany({
    where: {
      visibile: true,
      ...(collezione ? { collezione } : {}),
    },
    orderBy: { ordine: 'asc' },
    include: { _count: { select: { foto: true } } },
  });

  return NextResponse.json({
    data: albums.map((a) => ({
      id: a.id,
      nome: a.nome,
      cartella: a.cartella,
      collezione: a.collezione,
      descrizione: a.descrizione,
      copertina: a.copertina,
      nFoto: a._count.foto,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}
