import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const role = session.user.role;
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const templates = await prisma.catalogTemplate.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, nome: true, configurazione: true, createdAt: true },
  });

  return NextResponse.json({
    data: templates.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { nome, configurazione } = body;

  if (!nome?.trim()) {
    return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 });
  }
  if (!configurazione || typeof configurazione !== 'object') {
    return NextResponse.json({ error: 'Configurazione non valida' }, { status: 400 });
  }

  const template = await prisma.catalogTemplate.create({
    data: { nome: nome.trim(), configurazione },
  });

  return NextResponse.json({ data: { ...template, createdAt: template.createdAt.toISOString() } }, { status: 201 });
}
