import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  const survey = await prisma.survey.findUnique({
    where: { id: params.id },
    include: {
      questions: { orderBy: { sortOrder: 'asc' } },
      _count: { select: { responses: true } },
    },
  });
  if (!survey) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ survey });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  const body = await req.json() as {
    title?: string;
    description?: string;
    startsAt?: string;
    endsAt?: string;
    status?: string;
  };

  const survey = await prisma.survey.update({
    where: { id: params.id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.startsAt !== undefined && { startsAt: new Date(body.startsAt) }),
      ...(body.endsAt !== undefined && { endsAt: new Date(body.endsAt) }),
      ...(body.status !== undefined && { status: body.status }),
    },
  });

  return NextResponse.json({ survey });
}
