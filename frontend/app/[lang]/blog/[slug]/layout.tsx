import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { blogPosts, getPostBySlug } from '@/lib/blog';
import { locales } from '@/lib/i18n-config';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bananaaquapark.com';

interface Props {
  params: Promise<{ lang: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  const isEn = lang === 'en';
  const title = isEn ? post.metaTitleEn : post.metaTitleEs;
  const description = isEn ? post.metaDescriptionEn : post.metaDescriptionEs;
  const imageAlt = isEn ? post.heroImageAlt : post.heroImageAltEs;
  const postUrl = `${SITE_URL}/${lang}/blog/${slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: postUrl,
      siteName: 'Banana Aqua Park',
      images: [
        {
          url: `${SITE_URL}${post.heroImage}`,
          width: 1200,
          height: 630,
          alt: imageAlt,
        },
      ],
      locale: isEn ? 'en_US' : 'es_DO',
      type: 'article',
      publishedTime: post.publishedAt,
      authors: [post.author.name],
      tags: [post.category],
    },
    twitter: { card: 'summary_large_image', title, description },
    alternates: {
      canonical: postUrl,
      languages: Object.fromEntries(
        locales.map((l) => [l, `${SITE_URL}/${l}/blog/${slug}`])
      ),
    },
  };
}

export async function generateStaticParams() {
  return locales.flatMap((lang) =>
    blogPosts.map((post) => ({ lang, slug: post.slug }))
  );
}

export default function BlogPostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
