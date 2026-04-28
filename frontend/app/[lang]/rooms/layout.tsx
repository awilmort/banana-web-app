import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bananaaquapark.com';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const isEn = lang === 'en';

  const title = isEn
    ? 'Rooms & Villas | Banana Ranch Villages'
    : 'Habitaciones y Villas | Banana Ranch Villages';
  const description = isEn
    ? 'Book luxury rooms and private villas at Banana Ranch Villages. Aqua park access included with every stay.'
    : 'Reserva habitaciones de lujo y villas privadas en Banana Ranch Villages. Acceso al aqua park incluido.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${lang}/rooms`,
      siteName: 'Banana Ranch Villages',
      images: [{ url: `${SITE_URL}/images/villa.png`, width: 1200, height: 630, alt: title }],
      locale: isEn ? 'en_US' : 'es_DO',
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title, description },
    alternates: {
      canonical: `${SITE_URL}/${lang}/rooms`,
      languages: {
        es: `${SITE_URL}/es/rooms`,
        en: `${SITE_URL}/en/rooms`,
        'x-default': `${SITE_URL}/es/rooms`,
      },
    },
  };
}

export default function RoomsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'LodgingBusiness',
            name: 'Banana Ranch Villages',
            url: `${SITE_URL}/es/rooms`,
            containsPlace: {
              '@type': 'Accommodation',
              name: 'Villa Banana Ranch',
              description: 'Private villas with aqua park access',
              amenityFeature: [
                { '@type': 'LocationFeatureSpecification', name: 'Pool', value: true },
                { '@type': 'LocationFeatureSpecification', name: 'Air Conditioning', value: true },
              ],
            },
          }),
        }}
      />
      {children}
    </>
  );
}
