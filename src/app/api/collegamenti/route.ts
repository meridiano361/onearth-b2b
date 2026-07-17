import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const collezione = req.nextUrl.searchParams.get('collezione');
  const cartella   = req.nextUrl.searchParams.get('cartella');

  const data = await prisma.collegamento.findMany({
    where: {
      visibile: true,
      ...(collezione ? { collezione } : {}),
      ...(cartella   ? { cartella }   : {}),
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true, nome: true, url: true, descrizione: true, cartella: true, collezione: true, createdAt: true },
  });
  return NextResponse.json({ data: data.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })) });
}
