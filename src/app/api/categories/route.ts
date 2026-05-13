import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { slugify } from '@/lib/utils';

const categorySchema = z.object({
  name: z.string().min(1),
  parentId: z.string().optional().nullable(),
  order: z.number().int().optional().default(0),
  collectionId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const collectionId = searchParams.get('collectionId');

    const where: any = {};
    if (collectionId) where.collectionId = collectionId;

    const categories = await prisma.category.findMany({
      where,
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      include: {
        children: {
          orderBy: [{ order: 'asc' }, { name: 'asc' }],
          include: {
            children: {
              orderBy: [{ order: 'asc' }, { name: 'asc' }],
            },
          },
        },
      },
    });

    return NextResponse.json({ data: categories });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const data = categorySchema.parse(body);

    const slug = slugify(data.name);

    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug,
        parentId: data.parentId || null,
        order: data.order,
        collectionId: data.collectionId || null,
      },
    });

    return NextResponse.json({ data: category }, { status: 201 });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid data', details: err.errors }, { status: 400 });
    }
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Category with this slug already exists in this collection' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
