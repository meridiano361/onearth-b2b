import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

function guard(session: any) {
  return session && isAdminRole(session.user.role);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!guard(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const data: any = {};
  if (typeof body.nome === 'string') data.nome = body.nome.trim();
  if (typeof body.url === 'string') data.url = body.url.trim();
  if ('descrizione' in body) data.descrizione = body.descrizione?.trim() || null;
  if ('cartella' in body) data.cartella = body.cartella?.trim() || null;
  if ('collezione' in body) data.collezione = body.collezione || null;
  if (typeof body.visibile === 'boolean') data.visibile = body.visibile;
  const updated = await prisma.collegamento.update({ where: { id: params.id }, data });
  return NextResponse.json({ data: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!guard(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await prisma.collegamento.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
