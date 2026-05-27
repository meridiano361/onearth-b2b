import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { sendCredenziali } from '@/lib/email';

const createSchema = z.object({
  nome: z.string().min(1),
  cognome: z.string().min(1),
  email: z.string().email(),
  telefono: z.string().optional().nullable(),
  ruolo: z.string().optional().nullable(),
  password: z.string().min(6),
  attivo: z.boolean().default(true),
  inviaMail: z.boolean().default(false),
  noteCliente: z.string().optional().nullable(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const data = createSchema.parse(body);

    const email = data.email.toLowerCase().trim();
    const existing = await prisma.operator.findFirst({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email già in uso' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const operator = await prisma.operator.create({
      data: {
        nome: data.nome.trim(),
        cognome: data.cognome.trim(),
        email,
        telefono: data.telefono ? data.telefono.replace(/\s/g, '') : null,
        ruolo: data.ruolo || null,
        passwordHash,
        organizationId: params.id,
        attivo: data.attivo,
      },
      select: {
        id: true, nome: true, cognome: true, email: true,
        telefono: true, ruolo: true, attivo: true, organizationId: true, createdAt: true,
      },
    });

    let mailInviata = false;
    let mailError: string | undefined;
    if (data.inviaMail) {
      const org = await prisma.organization.findUnique({ where: { id: params.id }, select: { nome: true } });
      const result = await sendCredenziali({
        nome: data.nome.trim(),
        email,
        password: data.password,
        orgNome: org?.nome ?? '',
        noteCliente: data.noteCliente,
      });
      mailInviata = result.sent;
      mailError = result.error;
    }

    return NextResponse.json(
      { data: { ...operator, createdAt: operator.createdAt.toISOString(), mailInviata, mailError } },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Create operator error:', err);
    if (err.name === 'ZodError') {
      return NextResponse.json({ error: 'Dati non validi' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}
