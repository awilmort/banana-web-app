import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bananaaquapark.com';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const isEn = lang === 'en';

  const title = isEn
    ? 'Photo Gallery | Banana Ranch Villages'
    : 'Galería de Fotos | Banana Ranch Villages';
  const description = isEn
    ? 'Browse photos of Banana Ranch Villages resort, aqua park, villas, pools and event spaces in Dominican Republic.'
    : 'Explora fotos de Banana Ranch Villages: aqua park, villas privadas, piscinas y espacios para eventos.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${lang}/gallery`,
      siteName: 'Banana Ranch Villages',
      images: [{ url: `${SITE_URL}/images/gallery.jpg`, width: 1200, height: 630, alt: title }],
      locale: isEn ? 'en_US' : 'es_DO',
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title, description },
    alternates: {
      canonical: `${SITE_URL}/${lang}/gallery`,
      languages: {
        es: `${SITE_URL}/es/gallery`,
        en: `${SITE_URL}/en/gallery`,
        'x-default': `${SITE_URL}/es/gallery`,
      },
    },
  };
}

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
