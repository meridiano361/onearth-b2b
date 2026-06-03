import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { ids } = await req.json() as { ids: string[] };
  if (!Array.isArray(ids)) return NextResponse.json({ error: 'ids required' }, { status: 400 });

  await Promise.all(ids.map((id, i) => prisma.album.update({ where: { id }, data: { ordine: i } })));

  return NextResponse.json({ ok: true });
}
