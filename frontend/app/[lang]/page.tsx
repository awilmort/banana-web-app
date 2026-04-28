import type { Metadata } from 'next';
import HomePageContent from './_HomePageContent';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bananaaquapark.com';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const isEn = lang === 'en';

  const title = isEn
    ? 'Banana Aqua Park | Tropical Resort & Aqua Park in Dominican Republic'
    : 'Banana Aqua Park | Resort Tropical y Aqua Park en República Dominicana';
  const description = isEn
    ? 'Luxury villas, world-class aqua park, event venue & day passes in Higüey, Dominican Republic. Book your stay today.'
    : 'Villas de lujo, aqua park de clase mundial, eventos y day passes en Higüey, República Dominicana. Reserva hoy.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${lang}`,
      siteName: 'Banana Aqua Park',
      images: [{ url: `${SITE_URL}/images/home.jpg`, width: 1200, height: 630, alt: title }],
      locale: isEn ? 'en_US' : 'es_DO',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${SITE_URL}/images/home.jpg`],
    },
    alternates: {
      canonical: `${SITE_URL}/${lang}`,
      languages: {
        es: `${SITE_URL}/es`,
        en: `${SITE_URL}/en`,
        'x-default': `${SITE_URL}/es`,
      },
    },
  };
}

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': ['LodgingBusiness', 'AmusementPark'],
            name: 'Banana Aqua Park',
            url: SITE_URL,
            logo: `${SITE_URL}/images/home.jpg`,
            address: {
              '@type': 'PostalAddress',
              streetAddress: 'Matachalupe',
              addressLocality: 'Higüey',
              addressCountry: 'DO',
              postalCode: '23000',
            },
            telephone: '+18295999540',
            email: 'info@bananaaquapark.com',
            sameAs: ['https://www.facebook.com/bananaaquapark'],
          }),
        }}
      />
      <HomePageContent />
    </>
  );
}
