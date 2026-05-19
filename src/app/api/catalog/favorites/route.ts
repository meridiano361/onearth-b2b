import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.json({ productIds: [] });
  }
  const favorites = await prisma.favorite.findMany({
    where: { operatorId: session.user.id },
    select: { productId: true },
  });
  return NextResponse.json({ productIds: favorites.map((f) => f.productId) });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { productId } = await req.json();
  if (!productId) {
    return NextResponse.json({ error: 'Missing productId' }, { status: 400 });
  }
  try {
    await prisma.favorite.create({
      data: { operatorId: session.user.id, productId },
    });
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
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get('productId');
  if (!productId) {
    return NextResponse.json({ error: 'Missing productId' }, { status: 400 });
  }
  await prisma.favorite.deleteMany({
    where: { operatorId: session.user.id, productId },
  });
  return NextResponse.json({ ok: true });
}
