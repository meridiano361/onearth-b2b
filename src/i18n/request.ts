import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

const VALID_LOCALES = ['it', 'en', 'de', 'fr', 'es'] as const;
type Locale = (typeof VALID_LOCALES)[number];

const messagesMap: Record<Locale, () => Promise<{ default: Record<string, unknown> }>> = {
  it: () => import('../../messages/it.json'),
  en: () => import('../../messages/en.json'),
  de: () => import('../../messages/de.json'),
  fr: () => import('../../messages/fr.json'),
  es: () => import('../../messages/es.json'),
};

export default getRequestConfig(async () => {
  const cookieStore = cookies();
  const raw = (cookieStore as ReturnType<typeof cookies>).get('locale')?.value ?? 'it';
  const locale: Locale = (VALID_LOCALES as readonly string[]).includes(raw)
    ? (raw as Locale)
    : 'it';

  return {
    locale,
    messages: (await messagesMap[locale]()).default,
  };
});
