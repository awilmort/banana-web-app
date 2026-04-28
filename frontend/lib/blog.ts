import { POST_1_EN, POST_1_ES, POST_1_FAQ_EN, POST_1_FAQ_ES } from './blogContent';
import type { FAQItem } from '@/components/blog/BlogFAQ';

export type BlogCategory =
  | 'Eco Travel'
  | 'Local Wildlife'
  | 'Sustainability'
  | 'Hidden Gems'
  | 'Food & Culture';

export interface BlogAuthor {
  name: string;
  role: string;
}

export interface BlogPost {
  slug: string;
  category: BlogCategory;
  titleEn: string;
  titleEs: string;
  excerptEn: string;
  excerptEs: string;
  contentEn: string;
  contentEs: string;
  author: BlogAuthor;
  publishedAt: string; // ISO date string
  readTimeMinutes: number;
  heroImage: string;
  heroImageAlt: string;
  heroImageAltEs: string;
  metaTitleEn: string;
  metaTitleEs: string;
  metaDescriptionEn: string;
  metaDescriptionEs: string;
  faqEn?: FAQItem[];
  faqEs?: FAQItem[];
}

export const BLOG_CATEGORIES: BlogCategory[] = [
  'Eco Travel',
  'Local Wildlife',
  'Sustainability',
  'Hidden Gems',
  'Food & Culture',
];

// ─── Blog Posts ────────────────────────────────────────────────────────────
export const blogPosts: BlogPost[] = [
  {
    slug: '5-reasons-beyond-punta-cana-eco-tourism-dominican-republic',
    category: 'Eco Travel',
    titleEn:
      '5 Reasons to Explore Beyond Punta Cana and Experience Real Dominican Nature',
    titleEs:
      '5 Razones para Explorar Más Allá de Punta Cana y Vivir la Naturaleza Dominicana Real',
    excerptEn:
      'The Dominican Republic is far more than its famous resort beaches. Discover why thousands of travelers are trading the all-inclusive bubble for raw tropical nature, hidden rivers, and authentic local life.',
    excerptEs:
      'La República Dominicana es mucho más que sus famosas playas de resort. Descubre por qué miles de viajeros están cambiando la burbuja todo-incluido por naturaleza tropical auténtica, ríos ocultos y vida local genuina.',
    author: { name: 'The Banana Team', role: 'Eco Travel Guides' },
    publishedAt: '2026-04-27',
    readTimeMinutes: 9,
    heroImage: '/images/home.jpg',
    heroImageAlt:
      'Lush tropical forest and natural pools at Banana Aqua Park, Dominican Republic',
    heroImageAltEs:
      'Bosque tropical exuberante y piscinas naturales en Banana Aqua Park, República Dominicana',
    metaTitleEn:
      '5 Reasons to Explore Eco Tourism in Dominican Republic | Banana Aqua Park',
    metaTitleEs:
      '5 Razones para el Ecoturismo en República Dominicana | Banana Aqua Park',
    metaDescriptionEn:
      'Discover eco tourism in Dominican Republic beyond Punta Cana. Sustainable travel, nature hotels & real DR experiences await. Book your stay today.',
    metaDescriptionEs:
      'Descubre el ecoturismo en República Dominicana más allá de Punta Cana. Viaje sostenible, hoteles naturaleza y experiencias auténticas. Reserva hoy.',
    contentEn: POST_1_EN,
    contentEs: POST_1_ES,
    faqEn: POST_1_FAQ_EN,
    faqEs: POST_1_FAQ_ES,
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────
export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

export function getPostsByCategory(category: BlogCategory): BlogPost[] {
  return blogPosts.filter((p) => p.category === category);
}

export function formatPublishedDate(isoDate: string, locale: string): string {
  return new Date(isoDate).toLocaleDateString(
    locale === 'en' ? 'en-US' : 'es-DO',
    { year: 'numeric', month: 'long', day: 'numeric' }
  );
}

export const CATEGORY_COLORS: Record<BlogCategory, string> = {
  'Eco Travel': 'bg-emerald-700 text-white',
  'Local Wildlife': 'bg-amber-700 text-white',
  Sustainability: 'bg-green-800 text-white',
  'Hidden Gems': 'bg-stone-700 text-white',
  'Food & Culture': 'bg-orange-700 text-white',
};
