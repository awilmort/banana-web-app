import type { Metadata } from 'next';
import React from 'react';
import { locales } from '@/lib/i18n-config';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bananaaquapark.com';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const isEn = lang === 'en';

  const title = isEn
    ? 'Eco Travel Journal | Banana Aqua Park Dominican Republic'
    : 'Diario de Ecoviajes | Banana Aqua Park República Dominicana';
  const description = isEn
    ? 'Explore stories about eco tourism in Dominican Republic, local wildlife, sustainability and hidden gems. Beyond Punta Cana, real nature awaits.'
    : 'Explora historias sobre ecoturismo en República Dominicana, fauna local, sostenibilidad y destinos ocultos. Más allá de Punta Cana, te espera la naturaleza real.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${lang}/blog`,
      siteName: 'Banana Aqua Park',
      images: [
        {
          url: `${SITE_URL}/images/home.jpg`,
          width: 1200,
          height: 630,
          alt: isEn
            ? 'Banana Aqua Park – Eco Travel Journal'
            : 'Banana Aqua Park – Diario de Ecoviajes',
        },
      ],
      locale: isEn ? 'en_US' : 'es_DO',
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title, description },
    alternates: {
      canonical: `${SITE_URL}/${lang}/blog`,
      languages: Object.fromEntries(
        locales.map((l) => [l, `${SITE_URL}/${l}/blog`])
      ),
    },
  };
}

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
