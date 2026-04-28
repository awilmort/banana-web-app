import type { Locale } from './i18n-config';

const dictionaries = {
  en: () => import('../locales/en/translation.json').then((m) => m.default),
  es: () => import('../locales/es/translation.json').then((m) => m.default),
};

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;

export const getDictionary = async (locale: Locale) => {
  return (dictionaries[locale] ?? dictionaries.es)();
};
