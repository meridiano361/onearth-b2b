import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireCustomer() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'CUSTOMER') return null;
  return session.user.id;
}

export async function GET() {
  const customerId = await requireCustomer();
  if (!customerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { companyName: true, customerCode: true, email: true },
  });
  if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(customer);
}
