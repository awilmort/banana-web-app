import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bananaaquapark.com';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const isEn = lang === 'en';

  const title = isEn
    ? 'Day Pass – Aqua Park | Banana Aqua Park'
    : 'Day Pass – Aqua Park | Banana Aqua Park';
  const description = isEn
    ? 'Spend a full day at Banana Aqua Park. Day passes include all water attractions, pool access and amenities.'
    : 'Pasa el día en el aqua park de Banana Aqua Park. El day pass incluye todas las atracciones acuáticas y amenidades.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${lang}/daypass`,
      siteName: 'Banana Aqua Park',
      images: [{ url: `${SITE_URL}/images/aquapark.jpg`, width: 1200, height: 630, alt: title }],
      locale: isEn ? 'en_US' : 'es_DO',
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title, description },
    alternates: {
      canonical: `${SITE_URL}/${lang}/daypass`,
      languages: {
        es: `${SITE_URL}/es/daypass`,
        en: `${SITE_URL}/en/daypass`,
        'x-default': `${SITE_URL}/es/daypass`,
      },
    },
  };
}

export default function DaypassLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'AmusementPark',
            name: 'Banana Aqua Park',
            url: `${SITE_URL}/es/daypass`,
            description: 'Water park with slides, pools and attractions in Higüey, Dominican Republic',
            offers: {
              '@type': 'Offer',
              name: 'Day Pass',
              priceCurrency: 'DOP',
              availability: 'https://schema.org/InStock',
              url: `${SITE_URL}/es/daypass`,
            },
          }),
        }}
      />
      {children}
    </>
  );
}
