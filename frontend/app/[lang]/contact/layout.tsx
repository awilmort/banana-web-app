import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bananaaquapark.com';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const isEn = lang === 'en';

  const title = isEn
    ? 'Contact Us | Banana Aqua Park'
    : 'Contáctanos | Banana Aqua Park';
  const description = isEn
    ? 'Get in touch with Banana Aqua Park. Reservations, events, general inquiries – we\'re here to help.'
    : 'Contáctanos en Banana Aqua Park. Reservaciones, eventos, consultas generales, estamos aquí para ayudarte.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${lang}/contact`,
      siteName: 'Banana Aqua Park',
      locale: isEn ? 'en_US' : 'es_DO',
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title, description },
    alternates: {
      canonical: `${SITE_URL}/${lang}/contact`,
      languages: {
        es: `${SITE_URL}/es/contact`,
        en: `${SITE_URL}/en/contact`,
        'x-default': `${SITE_URL}/es/contact`,
      },
    },
  };
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ContactPage',
            name: 'Contact Banana Aqua Park',
            url: `${SITE_URL}/es/contact`,
            mainEntity: {
              '@type': 'Organization',
              name: 'Banana Aqua Park',
              telephone: '+18295999540',
              email: 'info@bananaaquapark.com',
              address: {
                '@type': 'PostalAddress',
                streetAddress: 'Matachalupe',
                addressLocality: 'Higüey',
                addressCountry: 'DO',
              },
            },
          }),
        }}
      />
      {children}
    </>
  );
}
