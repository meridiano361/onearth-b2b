import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const conferente = req.nextUrl.searchParams.get('conferente');
  const collezione = req.nextUrl.searchParams.get('collezione');

  if (!conferente || !collezione) return NextResponse.json({ data: null });

  const data = await prisma.condizioniCommerciali.findUnique({
    where: { conferente_collezione: { conferente, collezione } },
  });

  return NextResponse.json({ data });
}
