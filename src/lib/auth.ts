import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import type { AppRole } from '@/types';
import { checkRateLimit } from '@/lib/rateLimit';
import { securityLog } from '@/lib/securityLog';

function detectDevice(ua: string | undefined): string {
  if (!ua) return 'desktop';
  if (/ipad|tablet|android(?!.*mobile)/i.test(ua)) return 'tablet';
  if (/mobile|android|iphone|ipod/i.test(ua)) return 'mobile';
  return 'desktop';
}

async function repairOperatorOrg(token: any) {
  if (token.role !== 'OPERATOR' || token.organizationId) return;
  const op = await prisma.operator.findUnique({ where: { id: token.id }, select: { organizationId: true } });
  if (op?.organizationId) token.organizationId = op.organizationId;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email e password obbligatorie');
        }

        const email = credentials.email.toLowerCase().trim();
        const ip =
          (req as any)?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ??
          (req as any)?.headers?.['x-real-ip'] ??
          'unknown';

        const ipCheck = checkRateLimit(`login:ip:${ip}`, 30, 15 * 60 * 1000);
        const emailCheck = checkRateLimit(`login:email:${email}`, 10, 15 * 60 * 1000);
        if (!ipCheck.allowed || !emailCheck.allowed) {
          securityLog('rate_limit_hit', { event_detail: 'login', email, ip });
          throw new Error('Troppi tentativi. Riprova tra qualche minuto.');
        }

        // Try operator first
        const operator = await prisma.operator.findFirst({
          where: { email },
          include: { organization: true },
        });

        if (operator && operator.attivo) {
          const valid = await bcrypt.compare(credentials.password, operator.passwordHash);
          if (!valid) {
            securityLog('login_failed', { email, ip, reason: 'wrong_password', userType: 'operator' });
            throw new Error('Email o password non validi');
          }
          securityLog('login_success', { email, ip, userType: 'operator', id: operator.id });
          const ua = (req as any)?.headers?.['user-agent'] ?? undefined;
          prisma.accessLog.create({
            data: {
              operatorId: operator.id,
              ipAddress: ip !== 'unknown' ? ip : undefined,
              userAgent: ua ? String(ua).slice(0, 500) : undefined,
              dispositivo: detectDevice(ua),
            },
          }).catch(() => {});
          return {
            id: operator.id,
            email: operator.email,
            role: 'OPERATOR' as AppRole,
            companyName: operator.organization.nome,
            customerCode: '',
            organizationId: operator.organizationId,
            featureMondiEspositivi: operator.featureMondiEspositivi,
          };
        }

        // Fall back to Customer model (also covers inactive-operator case)
        const customer = await prisma.customer.findUnique({ where: { email } });
        if (!customer) {
          if (operator && !operator.attivo) throw new Error('Account disabilitato. Contatta il supporto.');
          throw new Error('Email o password non validi');
        }
        if (!customer.isActive) throw new Error('Account disabilitato. Contatta il supporto.');

        const valid = await bcrypt.compare(credentials.password, customer.passwordHash);
        if (!valid) {
          securityLog('login_failed', { email, ip, reason: 'wrong_password', userType: 'customer' });
          throw new Error('Email o password non validi');
        }
        securityLog('login_success', { email, ip, userType: 'customer', id: customer.id });
        return {
          id: customer.id,
          email: customer.email,
          role: customer.role as AppRole,
          companyName: customer.companyName,
          customerCode: customer.customerCode,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.companyName = user.companyName;
        token.customerCode = user.customerCode;
        if (user.organizationId) token.organizationId = user.organizationId;
        if (user.featureMondiEspositivi !== undefined) token.featureMondiEspositivi = user.featureMondiEspositivi;
      }
      // Repair old OPERATOR sessions missing organizationId
      await repairOperatorOrg(token);
      // Allow session.update({ destinazioneId, destinazioneName }) from client
      if (trigger === 'update' && session) {
        if (session.destinazioneId !== undefined) token.destinazioneId = session.destinazioneId;
        if (session.destinazioneName !== undefined) token.destinazioneName = session.destinazioneName;
        // legacy field names (kept for existing sessions)
        if (session.canaleId !== undefined) token.destinazioneId = session.canaleId;
        if (session.canaleName !== undefined) token.destinazioneName = session.canaleName;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as AppRole;
        session.user.companyName = token.companyName as string;
        session.user.customerCode = token.customerCode as string;
        if (token.organizationId) session.user.organizationId = token.organizationId as string;
        if (token.destinazioneId) session.user.destinazioneId = token.destinazioneId as string;
        if (token.destinazioneName) session.user.destinazioneName = token.destinazioneName as string;
        // legacy fallback
        if (token.canaleId && !token.destinazioneId) session.user.destinazioneId = token.canaleId as string;
        if (token.canaleName && !token.destinazioneName) session.user.destinazioneName = token.canaleName as string;
        if (token.featureMondiEspositivi !== undefined) session.user.featureMondiEspositivi = token.featureMondiEspositivi as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};
