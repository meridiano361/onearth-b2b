import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const customerSchema = z.object({
  companyName: z.string().min(1),
  customerCode: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'CUSTOMER']).default('CUSTOMER'),
  isActive: z.boolean().default(true),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  vatNumber: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { customerCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        select: {
          id: true,
          companyName: true,
          customerCode: true,
          email: true,
          isActive: true,
          role: true,
          phone: true,
          address: true,
          city: true,
          country: true,
          vatNumber: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
        orderBy: { companyName: 'asc' },
        skip,
        take: limit,
      }),
      prisma.customer.count({ where }),
    ]);

    return NextResponse.json({
      data: customers.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        orderCount: c._count.orders,
      })),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    });
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
    const data = customerSchema.parse(body);
    const passwordHash = await bcrypt.hash(data.password, 12);

    const customer = await prisma.customer.create({
      data: {
        companyName: data.companyName.trim(),
        customerCode: data.customerCode.toUpperCase().trim(),
        email: data.email.toLowerCase().trim(),
        passwordHash,
        role: data.role,
        isActive: data.isActive,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        country: data.country || null,
        vatNumber: data.vatNumber || null,
      },
      select: {
        id: true,
        companyName: true,
        customerCode: true,
        email: true,
        isActive: true,
        role: true,
        phone: true,
        city: true,
        country: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      data: { ...customer, createdAt: customer.createdAt.toISOString() },
    }, { status: 201 });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Email or customer code already exists' }, { status: 409 });
    }
    if (err.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid data', details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
