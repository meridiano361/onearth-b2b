import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPreviewFromSession } from '@/lib/preview';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.organizationId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (getPreviewFromSession(session)) {
    return Response.json(
      { error: 'Non puoi modificare dati in modalità anteprima', previewMode: true },
      { status: 403 }
    );
  }

  const { productId } = await params;

  await prisma.favorite.deleteMany({
    where: { operatorId: session.user.id, productId },
  });

  return Response.json({ ok: true });
}
