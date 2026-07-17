import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { cartella } = await req.json();
  if (!cartella?.trim()) return NextResponse.json({ error: 'cartella obbligatoria' }, { status: 400 });
  await prisma.$transaction([
    prisma.document.updateMany({ where: { cartella }, data: { cartella: null } }),
    prisma.album.updateMany({ where: { cartella }, data: { cartella: null } }),
    prisma.collegamento.updateMany({ where: { cartella }, data: { cartella: null } }),
  ]);
  return NextResponse.json({ ok: true });
}
