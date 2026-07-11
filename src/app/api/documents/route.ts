import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const tipo     = req.nextUrl.searchParams.get('tipo');
  const cartella = req.nextUrl.searchParams.get('cartella');
  const docs = await prisma.document.findMany({
    where: {
      visibile: true,
      ...(tipo     ? { tipo }     : {}),
      ...(cartella ? { cartella } : {}),
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, nome: true, tipo: true, cartella: true, descrizione: true, url: true, size: true, mimeType: true, createdAt: true },
  });
  return NextResponse.json({ data: docs.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() })) });
}
