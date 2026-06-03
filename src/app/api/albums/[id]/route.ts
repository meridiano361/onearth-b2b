import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const album = await prisma.album.findUnique({
    where: { id: params.id, visibile: true },
    include: { foto: { orderBy: { ordine: 'asc' } } },
  });

  if (!album) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    data: {
      id: album.id,
      nome: album.nome,
      descrizione: album.descrizione,
      foto: album.foto.map((f) => ({
        id: f.id,
        url: f.url,
        didascalia: f.didascalia,
        ordine: f.ordine,
      })),
    },
  });
}
