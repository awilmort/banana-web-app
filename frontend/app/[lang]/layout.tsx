import type { Metadata } from 'next';
import ThemeRegistry from '@/components/providers/ThemeRegistry';
import I18nProvider from '@/components/providers/I18nProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import ToastWrapper from '@/components/providers/ToastWrapper';
import { locales, type Locale } from '@/lib/i18n-config';

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bananaaquapark.com';

  return {
    alternates: {
      canonical: `${siteUrl}/${lang}`,
      languages: {
        'es': `${siteUrl}/es`,
        'en': `${siteUrl}/en`,
        'x-default': `${siteUrl}/es`,
      },
    },
  };
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale: Locale = (lang === 'en' ? 'en' : 'es');

  return (
    <ThemeRegistry>
      <I18nProvider lang={locale}>
        <AuthProvider>
          <ToastWrapper />
          <Layout>
            {children}
          </Layout>
        </AuthProvider>
      </I18nProvider>
    </ThemeRegistry>
  );
}
