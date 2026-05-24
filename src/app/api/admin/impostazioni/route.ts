import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const record = await prisma.appSettings.findUnique({ where: { chiave: 'catalogo.font' } });
    return NextResponse.json({ catalogFont: record?.valore ?? 'inter' });
  } catch {
    return NextResponse.json({ catalogFont: 'inter' });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const allowed = ['inter', 'playfair', 'montserrat', 'lato'];
  const catalogFont = allowed.includes(body.catalogFont) ? body.catalogFont : 'inter';

  await prisma.appSettings.upsert({
    where: { chiave: 'catalogo.font' },
    update: { valore: catalogFont },
    create: { chiave: 'catalogo.font', valore: catalogFont },
  });

  return NextResponse.json({ catalogFont });
}
