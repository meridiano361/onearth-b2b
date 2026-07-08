import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { createAndRunJob } from '@/lib/jewelry/jobs';
import { isCompatibile } from '@/lib/jewelry/matching';
import type { CompositeRequest } from '@/types/jewelry';

// POST /api/jewelry/composite
// Crea ed esegue un job di compositing in modo sincrono.
// Risponde con il job completo (stato: completed o failed).
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  let body: CompositeRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON non valido' }, { status: 400 });
  }

  const { productId, productImageUrl, supportoId, categoria } = body;
  if (!productId || !productImageUrl || !supportoId || !categoria) {
    return NextResponse.json(
      { error: 'productId, productImageUrl, supportoId e categoria sono obbligatori' },
      { status: 400 },
    );
  }

  // Verifica compatibilità categoria ↔ supporto prima di caricare in DB
  // (verifica più profonda avviene dentro createAndRunJob, ma fail-fast qui)
  const { prisma } = await import('@/lib/prisma');
  const supporto = await prisma.supportoEspositivo.findUnique({ where: { id: supportoId } });
  if (!supporto) {
    return NextResponse.json({ error: 'Supporto non trovato' }, { status: 404 });
  }
  if (!isCompatibile(categoria, supporto.tipo as any)) {
    return NextResponse.json(
      { error: `Categoria "${categoria}" non compatibile con supporto tipo "${supporto.tipo}"` },
      { status: 422 },
    );
  }

  try {
    const job = await createAndRunJob({ productId, productImageUrl, supportoId, categoria });
    const status = job.stato === 'failed' ? 500 : 200;
    return NextResponse.json(
      {
        jobId:        job.id,
        stato:        job.stato,
        risultatoUrl: job.risultatoUrl,
        errore:       job.errore,
      },
      { status },
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
