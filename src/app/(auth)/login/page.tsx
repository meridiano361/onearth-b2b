import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import LoginForm from '@/components/auth/LoginForm';
import RequestAccessButton from '@/components/auth/RequestAccessButton';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Accedi',
  description: 'Accedi alla piattaforma ordini B2B ON EARTH',
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
              #ACA39A 0px,
              #ACA39A 1px,
              transparent 1px,
              transparent 60px
            )`,
          }}
        />

        <div className="relative z-10">
          <Link href="/">
            <Image
              src="/logo-on-earth/onearth_solo_bianco.png"
              alt="On Earth"
              height={40}
              width={256}
              className="object-contain"
              priority
            />
          </Link>
          <div className="mt-6 w-12 h-px bg-accent" />
        </div>

        <div className="relative z-10">
          <p className="text-gray-400 text-sm font-light leading-relaxed max-w-xs">
            Collezione <span className="text-accent">CASA 2027</span>
          </p>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-20 xl:px-32">
        <div className="max-w-sm w-full mx-auto">
          {/* Mobile logo */}
          <div className="lg:hidden mb-12">
            <Link href="/">
              <Image
                src="/logo-on-earth/onearth_solo.png"
                alt="On Earth"
                height={32}
                width={205}
                className="object-contain"
                priority
              />
            </Link>
          </div>

          <div className="mb-10">
            <h2 className="text-2xl font-light text-primary tracking-tight">Bentornato</h2>
            <p className="mt-1.5 text-sm text-gray-500">C&apos;è un mondo da scoprire.</p>
          </div>

          <LoginForm />

          <p className="mt-8 text-center text-xs text-gray-400">
            <RequestAccessButton />
          </p>
        </div>
      </div>
    </div>
  );
}
