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

function orgCanAccessVisual(orgNome: string): boolean {
  const n = orgNome.toLowerCase().replace(/[\s_-]/g, '');
  return n.includes('meridiano361') || n.includes('bottegasolidale');
}

const FULL_MODA_EMAILS = new Set([
  'roberta.beltrami@giusteterre.it',
  'sara.fidone@pacesviluppo.org',
  'verbania@raggioverde.com',
]);

async function computeCanAccessVisual(token: any) {
  if (token.role !== 'OPERATOR') return;
  if (token.canAccessVisual !== undefined) return;
  if (token.email && FULL_MODA_EMAILS.has(token.email as string)) { token.canAccessVisual = true; return; }
  if (!token.organizationId) return;
  const org = await prisma.organization.findUnique({
    where: { id: token.organizationId as string },
    select: { nome: true },
  });
  if (org?.nome) token.canAccessVisual = orgCanAccessVisual(org.nome);
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

        // Try operator first — iterate all active operators with this email
        // (multiple records can share the same email after bulk imports)
        const operators = await prisma.operator.findMany({
          where: { email, attivo: true },
          include: { organization: true },
          orderBy: { createdAt: 'desc' },
        });

        for (const operator of operators) {
          const valid = await bcrypt.compare(credentials.password, operator.passwordHash);
          if (!valid) continue;
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
            email,
            role: 'OPERATOR' as AppRole,
            companyName: operator.organization.nome,
            customerCode: '',
            organizationId: operator.organizationId,
            featureMondiEspositivi: operator.featureMondiEspositivi,
            orgNome: operator.organization.nome,
          } as any;
        }

        // No operator matched — check if any inactive operator has this email
        const inactiveOperator = await prisma.operator.findFirst({ where: { email, attivo: false } });

        // Fall back to Customer model (also covers inactive-operator case)
        const customer = await prisma.customer.findUnique({ where: { email } });
        if (!customer) {
          if (inactiveOperator) throw new Error('Account disabilitato. Contatta il supporto.');
          securityLog('login_failed', { email, ip, reason: 'wrong_password', userType: 'operator' });
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
          email,
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
        token.email = user.email;
        token.role = user.role;
        token.companyName = user.companyName;
        token.customerCode = user.customerCode;
        if (user.organizationId) token.organizationId = user.organizationId;
        if (user.featureMondiEspositivi !== undefined) token.featureMondiEspositivi = user.featureMondiEspositivi;
        // canAccessVisual: meridiano361/bottega solidale orgs + 3 specific operators
        if ((user as any).orgNome) token.canAccessVisual = orgCanAccessVisual((user as any).orgNome);
        if (email && FULL_MODA_EMAILS.has(email)) token.canAccessVisual = true;
      }
      // Repair old OPERATOR sessions missing organizationId
      await repairOperatorOrg(token);
      // Compute canAccessVisual for sessions that don't have it yet
      await computeCanAccessVisual(token);
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
        session.user.email = (token.email as string) ?? session.user.email;
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
        if (token.canAccessVisual !== undefined) (session.user as any).canAccessVisual = token.canAccessVisual as boolean;
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
