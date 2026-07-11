import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const schema = z.object({
  oldName: z.string().min(1),
  newName: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { oldName, newName } = schema.parse(body);

  await prisma.$transaction([
    prisma.document.updateMany({ where: { cartella: oldName }, data: { cartella: newName } }),
    prisma.album.updateMany({ where: { cartella: oldName }, data: { cartella: newName } }),
  ]);

  return NextResponse.json({ ok: true });
}
