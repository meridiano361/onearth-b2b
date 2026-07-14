import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canAccessVisual, canAccessFullModa } from '@/lib/modaServer';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = session.user.role;
  const organizationId = session.user.organizationId;

  const [visual, fullModa] = await Promise.all([
    canAccessVisual(role, organizationId),
    canAccessFullModa(role, organizationId),
  ]);

  return NextResponse.json({ canAccessVisual: visual, canAccessFullModa: fullModa });
}
