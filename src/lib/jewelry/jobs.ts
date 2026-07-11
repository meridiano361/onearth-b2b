import { prisma } from '@/lib/prisma';
import type { CategoriaGioiello } from '@/types/jewelry';
import { runCompositing } from './compositing';

// Crea il job, lo esegue in modo sincrono e aggiorna il record.
// L'approccio sincrono è corretto per Vercel Fluid Compute (timeout 300s).
// Per job pesanti futuri: separare create() da run() e gestire con una queue.
export async function createAndRunJob(params: {
  productId: string;
  productImageUrl: string;
  supportoId: string;
  categoria: CategoriaGioiello;
}) {
  const { productId, productImageUrl, supportoId, categoria } = params;

  // 1. Verifica compatibilità supporto + categoria
  const supporto = await prisma.supportoEspositivo.findUnique({
    where: { id: supportoId },
    include: { zone: true },
  });
  if (!supporto || !supporto.attivo) throw new Error('Supporto non trovato o inattivo');

  const zona = supporto.zone.find((z) => z.categoria === categoria);
  if (!zona) {
    throw new Error(
      `Nessuna zona configurata per categoria "${categoria}" su questo supporto`,
    );
  }

  // 2. Crea il job in stato pending
  const job = await prisma.compositingJob.create({
    data: { productId, productImageUrl, supportoId, categoria, stato: 'pending' },
  });

  // 3. Marca come processing
  await prisma.compositingJob.update({ where: { id: job.id }, data: { stato: 'processing' } });

  try {
    // 4. Esegui compositing
    const { risultatoUrl } = await runCompositing({
      productId,
      productImageUrl,
      supporto: {
        ...supporto,
        immagineUrl:  supporto.immagineUrl,
        tono:         supporto.tono as any,
        tipo:         supporto.tipo as any,
        createdAt:    supporto.createdAt.toISOString(),
        retailPrice:  supporto.retailPrice  != null ? Number(supporto.retailPrice)  : null,
        costPrice:    supporto.costPrice    != null ? Number(supporto.costPrice)    : null,
        misura:       supporto.misura       ?? null,
        note:         supporto.note         ?? null,
        linkAcquisto: supporto.linkAcquisto ?? null,
      },
      zona: {
        ...zona,
        categoria: zona.categoria as any,
      },
    });

    // 5. Aggiorna con risultato
    const updated = await prisma.compositingJob.update({
      where: { id: job.id },
      data: { stato: 'completed', risultatoUrl },
    });
    return updated;
  } catch (err: any) {
    // 6. Marca come failed
    const failed = await prisma.compositingJob.update({
      where: { id: job.id },
      data: { stato: 'failed', errore: err.message ?? 'Errore sconosciuto' },
    });
    return failed;
  }
}

export async function getJob(id: string) {
  return prisma.compositingJob.findUnique({
    where: { id },
    include: { supporto: true },
  });
}

export async function listJobs(productId?: string) {
  return prisma.compositingJob.findMany({
    where: productId ? { productId } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}
