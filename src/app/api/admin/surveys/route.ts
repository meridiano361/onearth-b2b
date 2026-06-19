import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  const surveys = await prisma.survey.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { recipients: true, responses: true } },
    },
  });

  return NextResponse.json({ surveys });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  const { title, slug, description, startsAt, endsAt } = await req.json() as {
    title: string; slug: string; description?: string; startsAt: string; endsAt: string;
  };

  if (!title?.trim() || !slug?.trim()) {
    return NextResponse.json({ error: 'Titolo e slug obbligatori' }, { status: 400 });
  }

  try {
    const survey = await prisma.survey.create({
      data: {
        title: title.trim(),
        slug: slug.trim(),
        description: description?.trim() || null,
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        status: 'draft',
      },
    });
    return NextResponse.json({ survey });
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'Slug già in uso' }, { status: 409 });
    }
    throw e;
  }
}
