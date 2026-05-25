import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const SINGLETON_ID = 'singleton';

export async function GET() {
  try {
    const record = await prisma.catalogSettings.findUnique({ where: { id: SINGLETON_ID } });
    const filtriVisibili = Array.isArray(record?.filtriVisibili) ? (record!.filtriVisibili as string[]) : [];
    return NextResponse.json({ filtriVisibili });
  } catch (error) {
    console.error('[GET /api/admin/catalog-settings]', error);
    return NextResponse.json({ filtriVisibili: [] });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const filtriVisibili: string[] =
    body !== null && typeof body === 'object' && Array.isArray((body as any).filtriVisibili)
      ? (body as any).filtriVisibili
      : [];

  try {
    await prisma.catalogSettings.upsert({
      where: { id: SINGLETON_ID },
      update: { filtriVisibili },
      create: { id: SINGLETON_ID, filtriVisibili },
    });
    return NextResponse.json({ filtriVisibili });
  } catch (error) {
    console.error('[PUT /api/admin/catalog-settings]', error);
    return NextResponse.json({ error: 'Database error', detail: String(error) }, { status: 500 });
  }
}
