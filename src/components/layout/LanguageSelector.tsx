'use client';

import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';

const LOCALES = ['it', 'en', 'de', 'fr', 'es'] as const;

export default function LanguageSelector() {
  const locale = useLocale();

  function setLocale(newLocale: string) {
    document.cookie = `locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    window.location.reload();
  }

  return (
    <div className="flex items-center gap-0.5 bg-cream rounded px-1 py-1">
      {LOCALES.map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className={cn(
            'text-2xs font-medium px-1.5 py-0.5 rounded transition-colors uppercase tracking-wide',
            l === locale
              ? 'bg-primary text-background'
              : 'text-gray-400 hover:text-primary'
          )}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
