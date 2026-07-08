import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { getJob } from '@/lib/jewelry/jobs';

type Params = { params: { id: string } };

// GET /api/jewelry/jobs/[id] — polling stato job
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  try {
    const job = await getJob(params.id);
    if (!job) return NextResponse.json({ error: 'Job non trovato' }, { status: 404 });
    return NextResponse.json({ data: job });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
