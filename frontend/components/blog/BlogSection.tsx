'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  blogPosts,
  BLOG_CATEGORIES,
  CATEGORY_COLORS,
  formatPublishedDate,
  type BlogPost,
  type BlogCategory,
} from '@/lib/blog';

// ─── JSON-LD schema helper ─────────────────────────────────────────────────
function BlogPostingSchema({ post, lang }: { post: BlogPost; lang: string }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bananaaquapark.com';
  const title = lang === 'en' ? post.titleEn : post.titleEs;
  const description = lang === 'en' ? post.metaDescriptionEn : post.metaDescriptionEs;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description,
    image: `${siteUrl}${post.heroImage}`,
    author: {
      '@type': 'Person',
      name: post.author.name,
      jobTitle: post.author.role,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Banana Aqua Park',
      logo: { '@type': 'ImageObject', url: `${siteUrl}/images/logo.png` },
    },
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    url: `${siteUrl}/${lang}/blog/${post.slug}`,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteUrl}/${lang}/blog/${post.slug}`,
    },
    keywords: lang === 'en'
      ? 'eco tourism Dominican Republic, sustainable travel DR, nature hotels Dominican Republic'
      : 'ecoturismo República Dominicana, viaje sostenible, hoteles naturaleza',
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ─── Category pill ─────────────────────────────────────────────────────────
function CategoryPill({
  category,
  active,
  onClick,
}: {
  category: BlogCategory | 'All';
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={[
        'inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 min-h-[44px] min-w-[44px] cursor-pointer',
        active
          ? 'bg-[#2D5016] text-white shadow-md'
          : 'bg-[#F5F0E8] text-[#3D2B1A] hover:bg-[#E5DDD0]',
      ].join(' ')}
    >
      {category}
    </button>
  );
}

// ─── Read-time badge ───────────────────────────────────────────────────────
function ReadTimeBadge({ minutes, label }: { minutes: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-[#6B5744] font-medium">
      <svg
        aria-hidden="true"
        className="w-3.5 h-3.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      {minutes} {label}
    </span>
  );
}

// ─── Featured hero post ────────────────────────────────────────────────────
function FeaturedPost({ post, lang }: { post: BlogPost; lang: string }) {
  const title = lang === 'en' ? post.titleEn : post.titleEs;
  const excerpt = lang === 'en' ? post.excerptEn : post.excerptEs;
  const imageAlt = lang === 'en' ? post.heroImageAlt : post.heroImageAltEs;
  const dateStr = formatPublishedDate(post.publishedAt, lang);
  const readLabel = lang === 'en' ? 'min read' : 'min de lectura';
  const readMoreLabel = lang === 'en' ? 'Read the full article' : 'Leer el artículo completo';

  return (
    <article
      aria-label={`Featured post: ${title}`}
      className="relative w-full rounded-2xl overflow-hidden bg-[#1A1A0F] group"
    >
      {/* JSON-LD for featured post */}
      <BlogPostingSchema post={post} lang={lang} />

      {/* Hero image – aspect-ratio enforced to prevent CLS */}
      <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
        <Image
          src={post.heroImage}
          alt={imageAlt}
          fill
          priority
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 1400px"
          className="object-cover transition-transform duration-700 group-hover:scale-102"
          style={{ transform: 'scale(1)' }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A0F] via-[#1A1A0F]/60 to-transparent" />
      </div>

      {/* Content overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8 lg:p-10">
        {/* Category */}
        <span
          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3 ${CATEGORY_COLORS[post.category]}`}
        >
          {post.category}
        </span>

        {/* Title */}
        <h2 className="font-serif text-2xl md:text-3xl lg:text-4xl text-white leading-tight mb-3 max-w-3xl">
          {title}
        </h2>

        {/* Excerpt */}
        <p className="text-[#D4C9B8] text-base md:text-lg leading-relaxed mb-4 max-w-2xl hidden sm:block">
          {excerpt}
        </p>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <span className="text-[#B8A99A] text-sm">{post.author.name}</span>
          <span className="text-[#6B5744] text-sm hidden sm:inline">·</span>
          <span className="text-[#B8A99A] text-sm hidden sm:inline">{dateStr}</span>
          <ReadTimeBadge minutes={post.readTimeMinutes} label={readLabel} />
        </div>

        {/* CTA */}
        <Link
          href={`/${lang}/blog/${post.slug}`}
          className="inline-flex items-center gap-2 bg-[#4A7C2F] hover:bg-[#3D6526] text-white font-semibold px-6 py-3 rounded-full transition-colors duration-200 text-sm min-h-[44px]"
          aria-label={readMoreLabel}
        >
          {readMoreLabel}
          <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>
      </div>
    </article>
  );
}

// ─── Blog card ─────────────────────────────────────────────────────────────
function BlogCard({ post, lang }: { post: BlogPost; lang: string }) {
  const title = lang === 'en' ? post.titleEn : post.titleEs;
  const excerpt = lang === 'en' ? post.excerptEn : post.excerptEs;
  const imageAlt = lang === 'en' ? post.heroImageAlt : post.heroImageAltEs;
  const dateStr = formatPublishedDate(post.publishedAt, lang);
  const readLabel = lang === 'en' ? 'min read' : 'min de lectura';

  return (
    <article className="group flex flex-col rounded-xl overflow-hidden bg-white border border-[#E8E0D4] hover:-translate-y-1 transition-transform duration-300">
      {/* Card image */}
      <Link
        href={`/${lang}/blog/${post.slug}`}
        tabIndex={-1}
        aria-hidden="true"
        className="block relative flex-shrink-0"
        style={{ aspectRatio: '16 / 9' }}
      >
        <Image
          src={post.heroImage}
          alt={imageAlt}
          fill
          loading="lazy"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-102"
          style={{ transform: 'scale(1)' }}
        />
      </Link>

      {/* Card body */}
      <div className="flex flex-col flex-1 p-5">
        {/* Category */}
        <span
          className={`self-start inline-block px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide mb-3 ${CATEGORY_COLORS[post.category]}`}
        >
          {post.category}
        </span>

        {/* Title */}
        <h2 className="font-serif text-lg md:text-xl text-[#1A1A0F] leading-snug mb-2 flex-1">
          <Link
            href={`/${lang}/blog/${post.slug}`}
            className="hover:text-[#4A7C2F] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-[#4A7C2F] focus-visible:outline-offset-2 rounded"
          >
            {title}
          </Link>
        </h2>

        {/* Excerpt */}
        <p className="text-[#5A4A3A] text-base leading-relaxed mb-4 line-clamp-3">{excerpt}</p>

        {/* Meta */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-[#EDE7DA]">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-[#3D2B1A]">{post.author.name}</span>
            <span className="text-xs text-[#8A7468]">{dateStr}</span>
          </div>
          <ReadTimeBadge minutes={post.readTimeMinutes} label={readLabel} />
        </div>
      </div>
    </article>
  );
}

// ─── Blog Section (main export) ────────────────────────────────────────────
interface BlogSectionProps {
  lang: string;
}

export default function BlogSection({ lang }: BlogSectionProps) {
  const [activeCategory, setActiveCategory] = useState<BlogCategory | 'All'>('All');

  const isEn = lang === 'en';
  const sectionHeading = isEn ? 'Explore our journal' : 'Explora nuestro diario';
  const sectionSubheading = isEn
    ? 'Stories, tips, and inspiration from the heart of the Dominican Republic'
    : 'Historias, consejos e inspiración desde el corazón de la República Dominicana';
  const allLabel = isEn ? 'All' : 'Todos';
  const noPostsLabel = isEn
    ? 'No articles in this category yet — check back soon!'
    : '¡Aún no hay artículos en esta categoría — vuelve pronto!';

  const filtered = activeCategory === 'All'
    ? blogPosts
    : blogPosts.filter((p) => p.category === activeCategory);

  const [featuredPost, ...restPosts] = filtered;

  return (
    <section
      aria-labelledby="blog-section-heading"
      className="bg-[#F8F4ED] py-16 md:py-20 lg:py-24"
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-12">

        {/* Section header */}
        <header className="mb-10 md:mb-12">
          <h1
            id="blog-section-heading"
            className="font-serif text-3xl md:text-4xl lg:text-5xl text-[#1A1A0F] mb-3"
          >
            {sectionHeading}
          </h1>
          <p className="text-[#5A4A3A] text-base md:text-lg max-w-2xl">
            {sectionSubheading}
          </p>
        </header>

        {/* Category filter bar */}
        <nav aria-label="Blog categories" className="mb-10 md:mb-12">
          <ul className="flex flex-wrap gap-2.5" role="list">
            <li>
              <CategoryPill
                category="All"
                active={activeCategory === 'All'}
                onClick={() => setActiveCategory('All')}
              />
            </li>
            {BLOG_CATEGORIES.map((cat) => (
              <li key={cat}>
                <CategoryPill
                  category={cat}
                  active={activeCategory === cat}
                  onClick={() => setActiveCategory(cat)}
                />
              </li>
            ))}
          </ul>
        </nav>

        {filtered.length === 0 ? (
          <p className="text-[#5A4A3A] text-base py-10 text-center">{noPostsLabel}</p>
        ) : (
          <>
            {/* Featured post — full-width hero */}
            {featuredPost && (
              <div className="mb-10 md:mb-12">
                <FeaturedPost post={featuredPost} lang={lang} />
              </div>
            )}

            {/* Card grid */}
            {restPosts.length > 0 && (
              <div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
                role="list"
                aria-label={isEn ? 'More articles' : 'Más artículos'}
              >
                {restPosts.map((post) => (
                  <div key={post.slug} role="listitem">
                    <BlogCard post={post} lang={lang} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
