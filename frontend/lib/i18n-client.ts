'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslations from '../locales/en/translation.json';
import esTranslations from '../locales/es/translation.json';

// Initialize i18n synchronously so it is available during SSR/SSG pre-rendering.
// Using useSuspense: false prevents components from suspending when the instance
// is present but the language change is pending.
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: enTranslations },
      es: { translation: esTranslations },
    },
    lng: 'es',
    fallbackLng: 'es',
    supportedLngs: ['en', 'es'],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export async function initI18n(locale: string) {
  if (i18n.language !== locale) {
    await i18n.changeLanguage(locale);
  }
}

export default i18n;
