import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const records = await prisma.appSettings.findMany();
    const result = Object.fromEntries(records.map((r) => [r.chiave, r.valore]));
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json({});
  }
}
