import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bananaaquapark.com';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const isEn = lang === 'en';

  const title = isEn
    ? 'Events & Private Parties | Banana Aqua Park'
    : 'Eventos y Fiestas Privadas | Banana Aqua Park';
  const description = isEn
    ? 'Host your dream event at Banana Aqua Park. Weddings, birthdays, quinceañeras, corporate events and more.'
    : 'Organiza tu evento soñado en Banana Aqua Park. Bodas, cumpleaños, quinceañeras, eventos corporativos y más.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${lang}/events`,
      siteName: 'Banana Aqua Park',
      images: [{ url: `${SITE_URL}/images/events.jpg`, width: 1200, height: 630, alt: title }],
      locale: isEn ? 'en_US' : 'es_DO',
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title, description },
    alternates: {
      canonical: `${SITE_URL}/${lang}/events`,
      languages: {
        es: `${SITE_URL}/es/events`,
        en: `${SITE_URL}/en/events`,
        'x-default': `${SITE_URL}/es/events`,
      },
    },
  };
}

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'EventVenue',
            name: 'Banana Aqua Park',
            url: `${SITE_URL}/es/events`,
            description: 'Premier event venue for weddings, birthdays, corporate events in Dominican Republic',
            address: {
              '@type': 'PostalAddress',
              streetAddress: 'Matachalupe',
              addressLocality: 'Higüey',
              addressCountry: 'DO',
            },
          }),
        }}
      />
      {children}
    </>
  );
}
