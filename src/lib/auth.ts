import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

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
          throw new Error('Email and password are required');
        }

        const customer = await prisma.customer.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });

        if (!customer) {
          throw new Error('Invalid email or password');
        }

        if (!customer.isActive) {
          throw new Error('Account is disabled. Please contact support.');
        }

        const isValid = await bcrypt.compare(credentials.password, customer.passwordHash);

        if (!isValid) {
          throw new Error('Invalid email or password');
        }

        return {
          id: customer.id,
          email: customer.email,
          role: customer.role as 'ADMIN' | 'CUSTOMER',
          companyName: customer.companyName,
          customerCode: customer.customerCode,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.companyName = user.companyName;
        token.customerCode = user.customerCode;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as 'ADMIN' | 'CUSTOMER';
        session.user.companyName = token.companyName as string;
        session.user.customerCode = token.customerCode as string;
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
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
};
