'use client';

import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';

const LOCALES = ['it', 'en', 'de', 'fr', 'es'] as const;

const FLAGS: Record<string, string> = {
  it: '🇮🇹',
  en: '🇬🇧',
  de: '🇩🇪',
  fr: '🇫🇷',
  es: '🇪🇸',
};

function setLocale(newLocale: string) {
  document.cookie = `locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
  window.location.reload();
}

export default function LanguageSelector() {
  const locale = useLocale();

  return (
    <>
      {/* Mobile: compact select */}
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value)}
        className="md:hidden text-xs border border-border rounded px-1.5 py-0.5 bg-white text-primary focus:outline-none focus:border-accent cursor-pointer"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {FLAGS[l]} {l.toUpperCase()}
          </option>
        ))}
      </select>

      {/* Desktop: pill buttons */}
      <div className="hidden md:flex items-center gap-0.5 bg-cream rounded px-1 py-1">
        {LOCALES.map((l) => (
          <button
            key={l}
            onClick={() => setLocale(l)}
            className={cn(
              'text-2xs font-medium px-1.5 py-0.5 rounded transition-colors uppercase tracking-wide',
              l === locale
                ? 'bg-primary text-background'
                : 'text-gray-400 hover:text-primary',
            )}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
    </>
  );
}
