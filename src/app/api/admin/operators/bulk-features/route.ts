import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const b = body as { ids: string[] | 'ALL'; featureMondiEspositivi: boolean };

  if (typeof b.featureMondiEspositivi !== 'boolean') {
    return NextResponse.json({ error: 'featureMondiEspositivi deve essere boolean' }, { status: 400 });
  }

  const data = { featureMondiEspositivi: b.featureMondiEspositivi };

  try {
    let result;
    if (b.ids === 'ALL') {
      result = await prisma.operator.updateMany({ data });
    } else if (Array.isArray(b.ids) && b.ids.length > 0) {
      result = await prisma.operator.updateMany({ where: { id: { in: b.ids } }, data });
    } else {
      return NextResponse.json({ error: 'ids deve essere "ALL" o un array non vuoto' }, { status: 400 });
    }
    return NextResponse.json({ updated: result.count });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
