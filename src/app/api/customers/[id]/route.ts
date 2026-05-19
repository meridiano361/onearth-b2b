import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const updateSchema = z.object({
  companyName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  isActive: z.boolean().optional(),
  role: z.enum(['ADMIN', 'CUSTOMER']).optional(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  vatNumber: z.string().optional().nullable(),
  newPassword: z.string().min(6).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const data = updateSchema.parse(body);

    const updateData: any = { ...data };
    delete updateData.newPassword;

    if (data.newPassword) {
      updateData.passwordHash = await bcrypt.hash(data.newPassword, 12);
    }
    if (data.email) updateData.email = data.email.toLowerCase().trim();

    const customer = await prisma.customer.update({
      where: { id: params.id },
      data: updateData,
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
    });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Prevent deleting yourself
    if (params.id === session.user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    await prisma.customer.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Customer deleted' });
  } catch (err: any) {
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
