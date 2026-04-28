'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { initI18n } from '@/lib/i18n-client';
import i18n from '@/lib/i18n-client';
import { I18nextProvider } from 'react-i18next';

interface I18nProviderProps {
  lang: string;
  children: React.ReactNode;
}

const I18nContext = createContext<{ lang: string }>({ lang: 'es' });
export const useLang = () => useContext(I18nContext);

export default function I18nProvider({ lang, children }: I18nProviderProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initI18n(lang).then(() => setReady(true));
  }, [lang]);

  // When language changes after mount (e.g. navigating from /en/ to /es/)
  useEffect(() => {
    if (ready && i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [lang, ready]);

  if (!ready) {
    // Render children anyway to avoid layout shift — translations will hydrate
    return (
      <I18nContext.Provider value={{ lang }}>
        <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
      </I18nContext.Provider>
    );
  }

  return (
    <I18nContext.Provider value={{ lang }}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </I18nContext.Provider>
  );
}
