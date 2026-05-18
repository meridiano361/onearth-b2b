import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { generateDefaultPassword } from '@/lib/password';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      select: { companyName: true },
    });
    if (!customer) return NextResponse.json({ error: 'Non trovato' }, { status: 404 });

    const password = generateDefaultPassword(customer.companyName);
    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.customer.update({
      where: { id: params.id },
      data: { passwordHash },
    });

    // Return plain password for one-time admin display only
    return NextResponse.json({ data: { password } });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
