import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getPostBySlug, formatPublishedDate, CATEGORY_COLORS, type BlogPost } from '@/lib/blog';
import BlogFAQ from '@/components/blog/BlogFAQ';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bananaaquapark.com';

// ─── JSON-LD BlogPosting schema ────────────────────────────────────────────
function BlogPostingJsonLd({ post, lang }: { post: BlogPost; lang: string }) {
  const isEn = lang === 'en';
  const title = isEn ? post.metaTitleEn : post.metaTitleEs;
  const description = isEn ? post.metaDescriptionEn : post.metaDescriptionEs;
  const postUrl = `${SITE_URL}/${lang}/blog/${post.slug}`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description,
    image: `${SITE_URL}${post.heroImage}`,
    author: {
      '@type': 'Person',
      name: post.author.name,
      jobTitle: post.author.role,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Banana Aqua Park',
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/images/logo.png` },
    },
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    url: postUrl,
    mainEntityOfPage: { '@type': 'WebPage', '@id': postUrl },
    keywords: isEn
      ? 'eco tourism Dominican Republic, sustainable travel DR, beyond Punta Cana, nature hotels Dominican Republic, ecological hotels, aqua park'
      : 'ecoturismo República Dominicana, viaje sostenible DR, más allá de Punta Cana, hoteles naturaleza República Dominicana',
    inLanguage: isEn ? 'en' : 'es',
    wordCount: isEn ? 2000 : 2000,
    timeRequired: `PT${post.readTimeMinutes}M`,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ─── Article content renderer ──────────────────────────────────────────────
// Content is stored as HTML strings in the blog data for full control
function ArticleContent({ html }: { html: string }) {
  return (
    <div
      className="
        prose prose-lg max-w-none
        prose-headings:font-serif
        prose-h1:text-3xl prose-h1:md:text-4xl prose-h1:text-[#1A1A0F]
        prose-h2:text-2xl prose-h2:md:text-3xl prose-h2:mt-16 prose-h2:mb-6 prose-h2:font-bold prose-h2:text-[#2D5016] prose-h2:leading-snug
        prose-h3:text-xl prose-h3:md:text-2xl prose-h3:mt-10 prose-h3:mb-3 prose-h3:font-semibold prose-h3:text-[#1A1A0F]
        prose-p:text-[#3D2B1A] prose-p:text-base prose-p:md:text-lg prose-p:leading-relaxed prose-p:mb-6
        prose-a:text-[#4A7C2F] prose-a:font-medium prose-a:no-underline hover:prose-a:underline
        prose-strong:text-[#1A1A0F]
        prose-ul:text-[#3D2B1A] prose-ul:pl-5 prose-ul:mb-5
        prose-ol:text-[#3D2B1A] prose-ol:pl-5 prose-ol:mb-5
        prose-li:mb-1.5
        prose-blockquote:border-l-4 prose-blockquote:border-[#4A7C2F] prose-blockquote:pl-5 prose-blockquote:italic prose-blockquote:text-[#5A4A3A]
        prose-hr:border-[#C8BFA8] prose-hr:my-14
      "
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────
interface Props {
  params: Promise<{ lang: string; slug: string }>;
}

export default async function BlogPostPage({ params }: Props) {
  const { lang, slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const isEn = lang === 'en';
  const title = isEn ? post.titleEn : post.titleEs;
  const content = isEn ? post.contentEn : post.contentEs;
  const faq = isEn ? (post.faqEn ?? []) : (post.faqEs ?? []);
  const imageAlt = isEn ? post.heroImageAlt : post.heroImageAltEs;
  const dateStr = formatPublishedDate(post.publishedAt, lang);
  const readLabel = isEn ? 'min read' : 'min de lectura';
  const backLabel = isEn ? '← Back to Journal' : '← Volver al Diario';

  return (
    <>
      <BlogPostingJsonLd post={post} lang={lang} />

      <div className="bg-[#F8F4ED] min-h-screen">
        {/* Back link */}
        <div className="max-w-4xl mx-auto px-5 md:px-8 pt-8">
          <Link
            href={`/${lang}/blog`}
            className="inline-flex items-center text-[#4A7C2F] text-sm font-medium hover:underline min-h-[44px]"
          >
            {backLabel}
          </Link>
        </div>

        {/* Hero image */}
        <div className="max-w-5xl mx-auto px-5 md:px-8 mt-6">
          <div className="relative w-full rounded-2xl overflow-hidden" style={{ aspectRatio: '16 / 9' }}>
            <Image
              src={post.heroImage}
              alt={imageAlt}
              fill
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1200px"
              className="object-cover"
            />
          </div>
        </div>

        {/* Article body */}
        <div className="max-w-4xl mx-auto px-5 md:px-8 py-10 md:py-14">
          {/* Category + meta */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${CATEGORY_COLORS[post.category]}`}
            >
              {post.category}
            </span>
            <span className="text-[#8A7468] text-sm">{dateStr}</span>
            <span className="inline-flex items-center gap-1 text-xs text-[#6B5744] font-medium">
              <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {post.readTimeMinutes} {readLabel}
            </span>
          </div>

          {/* Title */}
          <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl text-[#1A1A0F] leading-tight mb-4">
            {title}
          </h1>

          {/* Author */}
          <div className="flex items-center gap-2 mb-10 pb-8 border-b border-[#E8E0D4]">
            <div className="w-9 h-9 rounded-full bg-[#4A7C2F] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {post.author.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1A1A0F]">{post.author.name}</p>
              <p className="text-xs text-[#8A7468]">{post.author.role}</p>
            </div>
          </div>

          {/* Article content */}
          <ArticleContent html={content} />

          {/* FAQ */}
          {faq && faq.length > 0 && (
            <BlogFAQ items={faq} lang={lang} />
          )}
        </div>
      </div>
    </>
  );
}
