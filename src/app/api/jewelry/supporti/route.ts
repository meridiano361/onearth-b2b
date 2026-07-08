import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { uploadStandImage } from '@/lib/jewelry/storage';
import { buildZoneDefault } from '@/lib/jewelry/matching';
import type { TipoSupporto, TonoLegno } from '@/types/jewelry';

// GET /api/jewelry/supporti — lista supporti (con zone)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const onlyAttivi = searchParams.get('attivi') !== 'false';

    const supporti = await prisma.supportoEspositivo.findMany({
      where: onlyAttivi ? { attivo: true } : undefined,
      include: { zone: true },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ data: supporti });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/jewelry/supporti — crea supporto con immagine (multipart/form-data)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const nome = form.get('nome') as string;
    const tipo = form.get('tipo') as TipoSupporto;
    const tono = (form.get('tono') as TonoLegno | null) || null;
    const larghezzaPx = parseInt(form.get('larghezzaPx') as string) || 800;
    const altezzaPx   = parseInt(form.get('altezzaPx')   as string) || 600;
    const file = form.get('immagine') as File | null;

    if (!nome || !tipo) {
      return NextResponse.json({ error: 'nome e tipo sono obbligatori' }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ error: 'immagine è obbligatoria' }, { status: 400 });
    }

    // Crea il record per ottenere l'id prima dell'upload
    const supporto = await prisma.supportoEspositivo.create({
      data: { nome, tipo, tono, larghezzaPx, altezzaPx, immagineUrl: '' },
    });

    // Upload immagine su Supabase Storage
    const buf = Buffer.from(await file.arrayBuffer());
    const immagineUrl = await uploadStandImage(supporto.id, buf, file.type);

    // Aggiorna con l'URL e crea le zone default
    const zoneDefault = buildZoneDefault(supporto.id, tipo);
    const [updated] = await prisma.$transaction([
      prisma.supportoEspositivo.update({
        where: { id: supporto.id },
        data: { immagineUrl },
        include: { zone: true },
      }),
      ...zoneDefault.map((z) =>
        prisma.zonaPosizionamento.create({ data: z as any }),
      ),
    ]);

    return NextResponse.json({ data: updated }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
