import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export type ColorBlockRow = { id: number; name: string; sort_order: number };

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await prisma.$queryRaw<ColorBlockRow[]>`
    SELECT id, name, sort_order
    FROM   color_blocks
    ORDER  BY sort_order ASC, id ASC
  `;

  return NextResponse.json({ data: rows.map((r) => ({ ...r, id: Number(r.id) })) });
}
