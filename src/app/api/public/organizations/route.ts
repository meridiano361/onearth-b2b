import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const orgs = await prisma.organization.findMany({
    orderBy: { nome: 'asc' },
    select: { id: true, nome: true },
  });
  return NextResponse.json({ data: orgs });
}
