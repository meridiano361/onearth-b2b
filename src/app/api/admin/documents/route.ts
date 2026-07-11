import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createSchema = z.object({
  nome:        z.string().min(1),
  tipo:        z.string().min(1),
  cartella:    z.string().optional().nullable(),
  descrizione: z.string().optional(),
  url:         z.string().url(),
  storageKey:  z.string().min(1),
  size:        z.number().positive(),
  mimeType:    z.string().optional(),
  visibile:    z.boolean().default(true),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const docs = await prisma.document.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ data: docs.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() })) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const data = createSchema.parse(body);

  const doc = await prisma.document.create({ data });
  return NextResponse.json({ data: { ...doc, createdAt: doc.createdAt.toISOString() } });
}
