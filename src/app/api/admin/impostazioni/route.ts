import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

const SINGLETON_ID = 'singleton';

export async function GET() {
  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: SINGLETON_ID } });
    return NextResponse.json({
      catalogFont: settings?.catalogFont ?? 'inter',
    });
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

  const settings = await prisma.appSettings.upsert({
    where: { id: SINGLETON_ID },
    update: { catalogFont },
    create: { id: SINGLETON_ID, catalogFont },
  });

  return NextResponse.json({ catalogFont: settings.catalogFont });
}
