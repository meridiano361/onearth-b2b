import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'COMMERCIALE', 'MAGAZZINO'] as const;

function requireSuperAdmin(role: string) {
  return role === 'SUPER_ADMIN';
}

const createSchema = z.object({
  companyName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'COMMERCIALE', 'MAGAZZINO']),
  isActive: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !requireSuperAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await prisma.customer.findMany({
    where: { role: { in: ADMIN_ROLES as unknown as any[] } },
    select: {
      id: true,
      companyName: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      customerCode: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ data: users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !requireSuperAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const data = createSchema.parse(body);

  const existing = await prisma.customer.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existing) return NextResponse.json({ error: 'Email già in uso' }, { status: 409 });

  const passwordHash = await bcrypt.hash(data.password, 10);
  const count = await prisma.customer.count({ where: { role: { in: ADMIN_ROLES as unknown as any[] } } });
  const customerCode = `STAFF-${String(count + 1).padStart(3, '0')}`;

  const user = await prisma.customer.create({
    data: {
      companyName: data.companyName,
      email: data.email.toLowerCase(),
      passwordHash,
      role: data.role as any,
      isActive: data.isActive,
      customerCode,
    },
    select: { id: true, companyName: true, email: true, role: true, isActive: true, createdAt: true, customerCode: true },
  });

  return NextResponse.json({ data: { ...user, createdAt: user.createdAt.toISOString() } }, { status: 201 });
}
