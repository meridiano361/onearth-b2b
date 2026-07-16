import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canAccessVisual, canAccessFullModa } from '@/lib/modaServer';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = session.user.role;
  const organizationId = session.user.organizationId;
  const email = session.user.email;

  const [visual, fullModa] = await Promise.all([
    canAccessVisual(role, organizationId, email),
    canAccessFullModa(role, organizationId, email),
  ]);

  return NextResponse.json({ canAccessVisual: visual, canAccessFullModa: fullModa });
}
