import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

function guard(session: any) {
  return session && isAdminRole(session.user.role);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!guard(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const data = await prisma.collegamento.findMany({ orderBy: { createdAt: 'asc' } });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!guard(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const { nome, url, descrizione, cartella, collezione, visibile } = body;
  if (!nome?.trim() || !url?.trim()) return NextResponse.json({ error: 'nome e url obbligatori' }, { status: 400 });
  const data = await prisma.collegamento.create({
    data: {
      nome: nome.trim(),
      url: url.trim(),
      descrizione: descrizione?.trim() || null,
      cartella: cartella?.trim() || null,
      collezione: collezione || null,
      visibile: visibile !== false,
    },
  });
  return NextResponse.json({ data }, { status: 201 });
}
