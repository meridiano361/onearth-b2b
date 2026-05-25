import { NextRequest, NextResponse } from 'next/server';
import { requireMondiEspositivi } from '@/lib/featureGuard';
import { prisma } from '@/lib/prisma';

const FORBIDDEN = NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export async function GET() {
  const operatorId = await requireMondiEspositivi();
  if (!operatorId) return FORBIDDEN;

  const presets = await prisma.displayGroupPreset.findMany({
    where: { operatorId },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ presets });
}

export async function POST(req: NextRequest) {
  const operatorId = await requireMondiEspositivi();
  if (!operatorId) return FORBIDDEN;

  const body = await req.json();
  const { nome, descrizione, coloreTag, temaTag } = body as Record<string, string | undefined>;

  if (!nome?.trim()) return NextResponse.json({ error: 'nome obbligatorio' }, { status: 400 });

  const preset = await prisma.displayGroupPreset.create({
    data: {
      operatorId,
      nome: nome.trim(),
      descrizione: descrizione?.trim() || null,
      coloreTag: coloreTag || null,
      temaTag: temaTag?.trim() || null,
    },
  });

  return NextResponse.json({ preset }, { status: 201 });
}
