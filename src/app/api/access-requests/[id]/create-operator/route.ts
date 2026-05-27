import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { sendCredenziali } from '@/lib/email';

const schema = z.object({
  organizationId: z.string().optional(),
  nuovaOrganizzazione: z.object({ nome: z.string().min(1) }).optional(),
  nome: z.string().min(1),
  cognome: z.string().min(1),
  email: z.string().email(),
  telefono: z.string().optional().nullable(),
  password: z.string().min(6),
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
    const data = schema.parse(body);

    if (!data.organizationId && !data.nuovaOrganizzazione) {
      return NextResponse.json({ error: 'Specificare organizationId oppure nuovaOrganizzazione' }, { status: 400 });
    }

    const request = await prisma.accessRequest.findUnique({ where: { id: params.id } });
    if (!request) return NextResponse.json({ error: 'Richiesta non trovata' }, { status: 404 });

    const email = data.email.toLowerCase().trim();

    // Resolve organization
    let org: { id: string; nome: string };
    if (data.organizationId) {
      const found = await prisma.organization.findUnique({ where: { id: data.organizationId } });
      if (!found) return NextResponse.json({ error: 'Organizzazione non trovata' }, { status: 404 });
      org = found;
    } else {
      const nome = data.nuovaOrganizzazione!.nome.trim();
      const existing = await prisma.organization.findFirst({
        where: { nome: { equals: nome, mode: 'insensitive' } },
      });
      org = existing ?? await prisma.organization.create({ data: { nome } });
    }

    // Check email uniqueness
    const existingOp = await prisma.operator.findFirst({ where: { email } });
    if (existingOp) {
      return NextResponse.json({ error: `L'email ${email} è già in uso da un altro operatore` }, { status: 409 });
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

    let mailInviata = false;
    if (data.inviaMail) {
      const result = await sendCredenziali({
        nome: data.nome.trim(),
        email,
        password: data.password,
        orgNome: org.nome,
        noteCliente: data.noteCliente,
      });
      mailInviata = result.sent;
    }

    await prisma.accessRequest.update({
      where: { id: params.id },
      data: {
        status: 'gestita',
        mailCredenzialiInviata: mailInviata,
        approvataDa: session.user.email,
        approvataAt: new Date(),
      },
    });

    return NextResponse.json(
      { data: { operator, orgNome: org.nome, mailInviata } },
      { status: 201 }
    );
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json({ error: 'Dati non validi', details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || 'Errore interno' }, { status: 500 });
  }
}
