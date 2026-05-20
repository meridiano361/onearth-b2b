import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { getPreviewFromSession } from '@/lib/preview';
import prisma from '@/lib/prisma';

const PREVIEW_WRITE_BLOCKED = NextResponse.json(
  { error: 'Non puoi modificare dati in modalità anteprima', previewMode: true },
  { status: 403 }
);

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ productIds: [] });

  const preview = getPreviewFromSession(session);
  const operatorId = preview?.operatorId ?? session.user.id;

  // In preview mode the admin doesn't need organizationId in their session
  if (!preview && !session.user.organizationId) {
    return NextResponse.json({ productIds: [] });
  }

  const favorites = await prisma.favorite.findMany({
    where: { operatorId },
    select: { productId: true },
  });
  return NextResponse.json({ productIds: favorites.map((f) => f.productId) });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (getPreviewFromSession(session)) return PREVIEW_WRITE_BLOCKED;

  const { productId } = await req.json();
  if (!productId) return NextResponse.json({ error: 'Missing productId' }, { status: 400 });

  try {
    await prisma.favorite.create({ data: { operatorId: session.user.id, productId } });
  } catch {
    // already exists — ignore
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (getPreviewFromSession(session)) return PREVIEW_WRITE_BLOCKED;

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get('productId');
  if (!productId) return NextResponse.json({ error: 'Missing productId' }, { status: 400 });

  await prisma.favorite.deleteMany({ where: { operatorId: session.user.id, productId } });
  return NextResponse.json({ ok: true });
}
