import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
    if (!nome) {
      return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 });
    }

    const existing = await prisma.organization.findFirst({
      where: { nome: { equals: nome, mode: 'insensitive' } },
    });
    if (existing) {
      return NextResponse.json({ error: 'Organizzazione già esistente' }, { status: 409 });
    }

    const org = await prisma.organization.create({ data: { nome } });
    return NextResponse.json(
      { data: { ...org, createdAt: org.createdAt.toISOString() } },
      { status: 201 }
    );
  } catch (err) {
    console.error('Create org error:', err);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}
