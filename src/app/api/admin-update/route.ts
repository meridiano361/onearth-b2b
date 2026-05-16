import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');

  if (!process.env.SETUP_SECRET || secret !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const newHash = await bcrypt.hash('Oe2026!', 12);

    // Find admin by role, update email + password regardless of current email
    const updated = await prisma.customer.updateMany({
      where: { role: 'ADMIN' },
      data: {
        email: 'e.mazzolari@meridiano361.it',
        passwordHash: newHash,
      },
    });

    if (updated.count === 0) {
      // No admin found — create one
      await prisma.customer.create({
        data: {
          companyName: 'Meridiano 361',
          customerCode: 'ADMIN001',
          email: 'e.mazzolari@meridiano361.it',
          passwordHash: newHash,
          role: 'ADMIN',
          isActive: true,
        },
      });
      return NextResponse.json({ ok: true, action: 'created', email: 'e.mazzolari@meridiano361.it' });
    }

    return NextResponse.json({ ok: true, action: 'updated', count: updated.count, email: 'e.mazzolari@meridiano361.it' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
