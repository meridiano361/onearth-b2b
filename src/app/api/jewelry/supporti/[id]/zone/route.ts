import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import type { UpsertZoneRequest } from '@/types/jewelry';

type Params = { params: { id: string } };

// PUT /api/jewelry/supporti/[id]/zone
// Sostituisce integralmente le zone di un supporto (upsert per categoria)
export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  try {
    const body: UpsertZoneRequest = await req.json();
    if (!Array.isArray(body.zone)) {
      return NextResponse.json({ error: 'zone[] richiesto' }, { status: 400 });
    }

    // Upsert atomico: per ogni categoria, crea o aggiorna
    const ops = body.zone.map((z) =>
      prisma.zonaPosizionamento.upsert({
        where: { supportoId_categoria: { supportoId: params.id, categoria: z.categoria } },
        update: {
          anchorX:        z.anchorX,
          anchorY:        z.anchorY,
          maxLarghezzaPx: z.maxLarghezzaPx,
          maxAltezzaPx:   z.maxAltezzaPx,
        },
        create: {
          supportoId:     params.id,
          categoria:      z.categoria,
          anchorX:        z.anchorX,
          anchorY:        z.anchorY,
          maxLarghezzaPx: z.maxLarghezzaPx,
          maxAltezzaPx:   z.maxAltezzaPx,
        },
      }),
    );

    const zone = await prisma.$transaction(ops);
    return NextResponse.json({ data: zone });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
