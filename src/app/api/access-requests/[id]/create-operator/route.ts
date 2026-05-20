import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const schema = z.object({
  orgNome: z.string().min(1),
  nome: z.string().min(1),
  cognome: z.string().min(1),
  email: z.string().email(),
  telefono: z.string().optional().nullable(),
  password: z.string().min(6),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const data = schema.parse(body);

    const request = await prisma.accessRequest.findUnique({ where: { id: params.id } });
    if (!request) return NextResponse.json({ error: 'Richiesta non trovata' }, { status: 404 });

    const email = data.email.toLowerCase().trim();

    // Find or create organization
    let org = await prisma.organization.findFirst({
      where: { nome: { equals: data.orgNome.trim(), mode: 'insensitive' } },
    });
    if (!org) {
      org = await prisma.organization.create({ data: { nome: data.orgNome.trim() } });
    }

    // Check email not already in use
    const existing = await prisma.operator.findFirst({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: `L'email ${email} è già in uso` }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const operator = await prisma.operator.create({
      data: {
        nome: data.nome.trim(),
        cognome: data.cognome.trim(),
        email,
        telefono: data.telefono ? data.telefono.replace(/\s/g, '') : null,
        passwordHash,
        organizationId: org.id,
        attivo: true,
      },
      select: { id: true, nome: true, cognome: true, email: true },
    });

    await prisma.accessRequest.update({
      where: { id: params.id },
      data: { status: 'gestita' },
    });

    return NextResponse.json(
      { data: { operator, password: data.password, orgNome: org.nome } },
      { status: 201 }
    );
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json({ error: 'Dati non validi' }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || 'Errore interno' }, { status: 500 });
  }
}
