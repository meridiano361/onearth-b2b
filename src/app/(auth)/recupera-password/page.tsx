import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: { absolute: 'Recupera password | OE B2B' },
};

export default function RecuperaPasswordPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-sm w-full mx-auto text-center">
        <Link href="/" className="inline-block mb-12">
          <Image
            src="/logo-on-earth/onearth_solo.png"
            alt="On Earth"
            width={200}
            height={32}
            className="object-contain mx-auto"
            priority
          />
        </Link>

        <h2 className="text-2xl font-light text-primary tracking-tight mb-3">
          Password dimenticata?
        </h2>
        <p className="text-sm text-gray-400 leading-relaxed mb-8">
          Contatta il tuo responsabile o scrivi a{' '}
          <a href="mailto:info@on-earth.it" className="text-accent hover:underline">
            info@on-earth.it
          </a>{' '}
          per ricevere le nuove credenziali di accesso.
        </p>

        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline transition-colors"
        >
          <ArrowLeft size={12} />
          Torna al login
        </Link>
      </div>
    </div>
  );
}
