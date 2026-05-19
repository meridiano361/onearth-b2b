import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { generateDefaultPassword } from '@/lib/password';

/** Tries codes like "ILF001", "ILF002", … until one is free. */
async function generateUniqueCode(organizzazione: string): Promise<string> {
  const prefix = organizzazione
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3)
    .padEnd(3, 'X');

  for (let i = 1; i <= 999; i++) {
    const code = `${prefix}${String(i).padStart(3, '0')}`;
    const exists = await prisma.customer.findUnique({
      where: { customerCode: code },
      select: { id: true },
    });
    if (!exists) return code;
  }
  throw new Error('Impossibile generare un codice cliente univoco');
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const request = await prisma.accessRequest.findUnique({
      where: { id: params.id },
    });
    if (!request) return NextResponse.json({ error: 'Richiesta non trovata' }, { status: 404 });

    // Check email not already registered
    const existing = await prisma.customer.findUnique({
      where: { email: request.email.toLowerCase() },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: `L'email ${request.email} è già associata a un account` },
        { status: 409 }
      );
    }

    const password = generateDefaultPassword(request.organizzazione);
    const passwordHash = await bcrypt.hash(password, 12);
    const customerCode = await generateUniqueCode(request.organizzazione);

    const customer = await prisma.customer.create({
      data: {
        companyName: request.organizzazione,
        customerCode,
        email: request.email.toLowerCase(),
        passwordHash,
        role: 'CUSTOMER',
        isActive: true,
      },
      select: { id: true, companyName: true, customerCode: true, email: true },
    });

    await prisma.accessRequest.update({
      where: { id: params.id },
      data: { status: 'gestita' },
    });

    // Return plain password for one-time admin display only
    return NextResponse.json({
      data: {
        password,
        customerCode: customer.customerCode,
        companyName: customer.companyName,
        email: customer.email,
      },
    }, { status: 201 });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Email o codice cliente già esistente' }, { status: 409 });
    }
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
