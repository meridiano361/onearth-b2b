import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export type ColorBlockRow = { id: number; name: string; sort_order: number };

const COLOR_BLOCKS: ColorBlockRow[] = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  name: String(i + 1),
  sort_order: i + 1,
}));

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ data: COLOR_BLOCKS });
}
