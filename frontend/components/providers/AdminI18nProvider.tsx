'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n, { initI18n } from '@/lib/i18n-client';

interface AdminLangContextValue {
  lang: string;
  setLang: (lang: string) => Promise<void>;
}

const AdminLangContext = createContext<AdminLangContextValue>({
  lang: 'es',
  setLang: async () => {},
});

export const useAdminLang = () => useContext(AdminLangContext);

/** Read the NEXT_LOCALE cookie on the client side. */
function getLocaleCookie(): string {
  if (typeof document === 'undefined') return 'es';
  const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
  const value = match ? match[1] : 'es';
  return value === 'en' || value === 'es' ? value : 'es';
}

/**
 * AdminI18nProvider
 *
 * Initialises i18next with the locale stored in the NEXT_LOCALE cookie
 * (set by LanguageSwitcher). Admin routes have no [lang] URL segment so
 * locale comes from this cookie rather than the pathname.
 */
export default function AdminI18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<string>('es');

  useEffect(() => {
    const locale = getLocaleCookie();
    initI18n(locale).then(() => setLangState(locale));
  }, []);

  const setLang = async (newLang: string) => {
    document.cookie = `NEXT_LOCALE=${newLang}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    await initI18n(newLang);
    setLangState(newLang);
  };

  return (
    <AdminLangContext.Provider value={{ lang, setLang }}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </AdminLangContext.Provider>
  );
}
