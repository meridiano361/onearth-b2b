import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return NextResponse.json({ error: 'Push non configurato' }, { status: 503 });

  return NextResponse.json({ key });
}
