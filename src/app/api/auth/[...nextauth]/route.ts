import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';

const handler = NextAuth(authOptions);

export { handler as GET };

export async function POST(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  const { allowed } = checkRateLimit(`auth:${ip}`, 10, 60_000); // max 10 tentativi/minuto per IP
  if (!allowed) {
    return NextResponse.json(
      { error: 'Troppi tentativi di accesso. Riprova tra un minuto.' },
      { status: 429 }
    );
  }
  return handler(req, ctx);
}
