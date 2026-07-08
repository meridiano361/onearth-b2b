import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

type Params = { params: { id: string } };

// GET /api/jewelry/supporti/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const supporto = await prisma.supportoEspositivo.findUnique({
      where: { id: params.id },
      include: { zone: true },
    });
    if (!supporto) return NextResponse.json({ error: 'Non trovato' }, { status: 404 });
    return NextResponse.json({ data: supporto });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/jewelry/supporti/[id] — aggiorna nome / attivo
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { nome, attivo } = body as { nome?: string; attivo?: boolean };

    const updated = await prisma.supportoEspositivo.update({
      where: { id: params.id },
      data: { ...(nome !== undefined && { nome }), ...(attivo !== undefined && { attivo }) },
      include: { zone: true },
    });
    return NextResponse.json({ data: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/jewelry/supporti/[id] — soft-delete (attivo = false)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  try {
    await prisma.supportoEspositivo.update({
      where: { id: params.id },
      data: { attivo: false },
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
