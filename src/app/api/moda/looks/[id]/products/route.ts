import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const MODA_EMAIL = 'e.mazzolari@meridiano361.it';

async function requireModaAuth() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.email !== MODA_EMAIL) return null;
  return session;
}

// Add a product to a look
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireModaAuth();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { productId, note } = body;
  if (!productId) return NextResponse.json({ error: 'productId obbligatorio' }, { status: 400 });

  const max = await prisma.lookProdotto.aggregate({ _max: { ordine: true }, where: { lookId: params.id } });

  const entry = await prisma.lookProdotto.upsert({
    where: { lookId_productId: { lookId: params.id, productId } },
    create: { lookId: params.id, productId, note: note || null, ordine: (max._max.ordine ?? 0) + 1 },
    update: { note: note || null },
    include: {
      product: {
        select: {
          id: true, code: true, name: true, imageUrl: true,
          costPrice: true, retailPrice: true, lotSize: true, iva: true,
        },
      },
    },
  });

  return NextResponse.json({ data: entry }, { status: 201 });
}

// Remove a product from a look
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireModaAuth();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get('productId');
  if (!productId) return NextResponse.json({ error: 'productId mancante' }, { status: 400 });

  await prisma.lookProdotto.deleteMany({ where: { lookId: params.id, productId } });
  return NextResponse.json({ ok: true });
}
