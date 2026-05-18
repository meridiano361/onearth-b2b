import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { status } = await req.json();
    if (!status) return NextResponse.json({ error: 'Status obbligatorio' }, { status: 400 });

    const record = await prisma.accessRequest.update({
      where: { id: params.id },
      data: { status },
    });

    return NextResponse.json({ data: record });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
