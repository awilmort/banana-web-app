import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bananaaquapark.com';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const isEn = lang === 'en';

  const title = isEn
    ? 'Afternoon Pass – Aqua Park | Banana Aqua Park'
    : 'PasaTarde – Aqua Park | Banana Aqua Park';
  const description = isEn
    ? 'Enjoy Banana Aqua Park from 1:30 PM to 5:00 PM. Afternoon passes include all water attractions, pool access and amenities.'
    : 'Disfruta el Banana Aqua Park de 1:30 PM a 5:00 PM. El PasaTarde incluye todas las atracciones acuáticas y amenidades.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${lang}/pasatarde`,
      siteName: 'Banana Aqua Park',
      images: [{ url: `${SITE_URL}/images/aquapark.jpg`, width: 1200, height: 630, alt: title }],
      locale: isEn ? 'en_US' : 'es_DO',
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default function PasaTardeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
