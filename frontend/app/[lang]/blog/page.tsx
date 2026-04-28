import BlogSection from '@/components/blog/BlogSection';

export default async function BlogPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return <BlogSection lang={lang} />;
}
