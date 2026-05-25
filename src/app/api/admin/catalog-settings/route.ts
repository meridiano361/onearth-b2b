import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const record = await prisma.catalogSettings.findFirst();
  const filtriVisibili = (record?.filtriVisibili as string[]) ?? [];
  return NextResponse.json({ filtriVisibili });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const filtriVisibili: string[] = Array.isArray(body.filtriVisibili) ? body.filtriVisibili : [];

  const existing = await prisma.catalogSettings.findFirst();
  if (existing) {
    await prisma.catalogSettings.update({ where: { id: existing.id }, data: { filtriVisibili } });
  } else {
    await prisma.catalogSettings.create({ data: { filtriVisibili } });
  }

  return NextResponse.json({ filtriVisibili });
}
