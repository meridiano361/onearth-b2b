import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN') return null;
  return session;
}

function slugify(nome: string) {
  return nome
    .toLowerCase()
    .replace(/[àáâã]/g, 'a').replace(/[èéê]/g, 'e').replace(/[ìí]/g, 'i')
    .replace(/[òó]/g, 'o').replace(/[ùú]/g, 'u')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const rules = await prisma.notificheConfig.findMany({ orderBy: { evento: 'asc' } });
  return NextResponse.json(rules);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  if (!body.nome?.trim() || !body.evento || !body.canale || !body.destinatari) {
    return NextResponse.json({ error: 'Campi obbligatori mancanti' }, { status: 400 });
  }

  const id = `${slugify(body.nome)}-${Date.now()}`;
  const rule = await prisma.notificheConfig.create({
    data: {
      id,
      nome: body.nome.trim(),
      descrizione: body.descrizione?.trim() || null,
      attiva: body.attiva ?? true,
      canale: body.canale,
      destinatari: body.destinatari,
      evento: body.evento,
      giorniAnticipo: body.giorniAnticipo ? Number(body.giorniAnticipo) : null,
    },
  });
  return NextResponse.json(rule, { status: 201 });
}
