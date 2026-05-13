import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import LoginForm from '@/components/auth/LoginForm';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to ON EARTH B2B ordering platform',
};

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect(session.user.role === 'ADMIN' ? '/admin' : '/catalog');
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel — Brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-between p-16 relative overflow-hidden">
        {/* Texture overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              #C4A882 0px,
              #C4A882 1px,
              transparent 1px,
              transparent 60px
            )`,
          }}
        />

        <div className="relative z-10">
          <div className="mb-2">
            <p className="text-2xs tracking-widest uppercase text-accent font-medium">Meridiano 361</p>
          </div>
          <h1 className="font-display text-5xl text-white font-light leading-tight">
            ON<br />EARTH
          </h1>
          <div className="mt-4 w-12 h-px bg-accent" />
        </div>

        <div className="relative z-10">
          <p className="text-gray-400 text-sm font-light leading-relaxed max-w-xs">
            B2B Collection Preview<br />
            <span className="text-accent">CASA 2027</span>
          </p>
          <p className="mt-6 text-gray-600 text-xs tracking-wider uppercase">
            Showroom Ordering Platform
          </p>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-20 xl:px-32">
        <div className="max-w-sm w-full mx-auto">
          {/* Mobile logo */}
          <div className="lg:hidden mb-12">
            <p className="text-2xs tracking-widest uppercase text-gray-500 font-medium">Meridiano 361</p>
            <h1 className="font-display text-3xl text-primary font-light">ON EARTH</h1>
          </div>

          <div className="mb-10">
            <h2 className="text-2xl font-light text-primary tracking-tight">Welcome back</h2>
            <p className="mt-1.5 text-sm text-gray-500">Sign in to access your showroom portal</p>
          </div>

          <LoginForm />

          <p className="mt-8 text-center text-xs text-gray-400">
            Need access?{' '}
            <span className="text-accent cursor-pointer hover:underline">Contact your sales representative</span>
          </p>
        </div>
      </div>
    </div>
  );
}
