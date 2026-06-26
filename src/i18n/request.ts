import { getRequestConfig } from 'next-intl/server';

const VALID_LOCALES = ['it', 'en', 'de', 'fr', 'es'] as const;
type Locale = (typeof VALID_LOCALES)[number];

const messagesMap: Record<Locale, () => Promise<{ default: Record<string, unknown> }>> = {
  it: () => import('../../messages/it.json'),
  en: () => import('../../messages/en.json'),
  de: () => import('../../messages/de.json'),
  fr: () => import('../../messages/fr.json'),
  es: () => import('../../messages/es.json'),
};

// Language selector removed — app is always Italian.
// The cookie 'locale' is ignored to avoid users being stuck in a foreign
// language after the selector was removed from the UI.
export default getRequestConfig(async () => {
  return {
    locale: 'it',
    messages: (await messagesMap['it']()).default,
  };
});
