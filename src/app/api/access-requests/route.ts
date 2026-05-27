import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { sendAccessRequestNotification } from '@/lib/email';

const createSchema = z.object({
  organizzazione: z.string().min(1),
  nome: z.string().min(1),
  cognome: z.string().min(1),
  telefono: z.string().optional(),
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  let record;
  try {
    const body = await req.json();
    const data = createSchema.parse(body);
    record = await prisma.accessRequest.create({ data });
    // Fire-and-forget: email failure must not block the 201 response
    sendAccessRequestNotification(data).catch((err) =>
      console.error('[EMAIL] sendAccessRequestNotification uncaught:', err)
    );
    return NextResponse.json({ data: record }, { status: 201 });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json({ error: 'Dati non validi' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const records = await prisma.accessRequest.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ data: records });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
