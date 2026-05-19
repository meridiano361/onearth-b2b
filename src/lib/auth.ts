import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import type { AppRole } from '@/types';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email e password obbligatorie');
        }

        const email = credentials.email.toLowerCase().trim();

        // Try operator first
        const operator = await prisma.operator.findUnique({
          where: { email },
          include: { organization: true },
        });

        if (operator && operator.attivo) {
          const valid = await bcrypt.compare(credentials.password, operator.passwordHash);
          if (!valid) throw new Error('Email o password non validi');
          return {
            id: operator.id,
            email: operator.email,
            role: 'OPERATOR' as AppRole,
            companyName: operator.organization.nome,
            customerCode: '',
            organizationId: operator.organizationId,
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
        if (!valid) throw new Error('Email o password non validi');

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
      }
      // Allow session.update({ canaleId, canaleName }) from client
      if (trigger === 'update' && session) {
        if (session.canaleId !== undefined) token.canaleId = session.canaleId;
        if (session.canaleName !== undefined) token.canaleName = session.canaleName;
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
        if (token.canaleId) session.user.canaleId = token.canaleId as string;
        if (token.canaleName) session.user.canaleName = token.canaleName as string;
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
    maxAge: 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};
