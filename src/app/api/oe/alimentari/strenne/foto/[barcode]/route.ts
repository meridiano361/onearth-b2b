import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isMeridiano361Org } from '@/lib/modaServer';
import { prisma } from '@/lib/prisma';

async function requireM361() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const ok = await isMeridiano361Org(session.user.role, session.user.organizationId);
  return ok ? session : null;
}

export async function PATCH(req: NextRequest, { params }: { params: { barcode: string } }) {
  if (!await requireM361()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const data: { fotoUrl?: string; nome?: string; cestoCodice?: string } = {};
  if (body.fotoUrl !== undefined) data.fotoUrl = body.fotoUrl;
  if (body.nome !== undefined) data.nome = body.nome;
  if (body.cestoCodice !== undefined) data.cestoCodice = body.cestoCodice;
  const row = await prisma.oeStrennaFoto.upsert({
    where: { barcode: params.barcode },
    update: data,
    create: { barcode: params.barcode, fotoUrl: data.fotoUrl ?? '', nome: data.nome ?? '', cestoCodice: data.cestoCodice ?? '' },
  });
  return NextResponse.json(row);
}
