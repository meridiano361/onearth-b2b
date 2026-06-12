import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, role } = session.user;

  if (role === 'CUSTOMER') {
    const customer = await prisma.customer.findUnique({ where: { id }, select: { cartData: true } });
    return NextResponse.json({ cartData: customer?.cartData ?? null });
  }

  if (role === 'OPERATOR') {
    const operator = await prisma.operator.findUnique({ where: { id }, select: { cartData: true } });
    return NextResponse.json({ cartData: operator?.cartData ?? null });
  }

  return NextResponse.json({ cartData: null });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { cartData } = body;

  const { id, role } = session.user;

  if (role === 'CUSTOMER') {
    await prisma.customer.update({ where: { id }, data: { cartData } });
    return NextResponse.json({ ok: true });
  }

  if (role === 'OPERATOR') {
    await prisma.operator.update({ where: { id }, data: { cartData } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Role not supported' }, { status: 400 });
}
