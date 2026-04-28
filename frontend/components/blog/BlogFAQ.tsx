'use client';

import { useState } from 'react';

export interface FAQItem {
  question: string;
  answer: string;
}

interface BlogFAQProps {
  items: FAQItem[];
  titleEn?: string;
  titleEs?: string;
  lang: string;
}

export default function BlogFAQ({ items, lang }: BlogFAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const title =
    lang === 'en'
      ? 'Frequently Asked Questions About Eco Tourism in Dominican Republic'
      : 'Preguntas Frecuentes Sobre el Ecoturismo en la República Dominicana';

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  return (
    <section className="my-14" aria-label="FAQ">
      {/* Section divider */}
      <hr style={{ border: 'none', borderTop: '1px solid #C8BFA8', marginBottom: '3rem' }} />

      <h2
        className="font-serif mb-8"
        style={{ fontSize: '1.7rem', color: '#2D5016', fontWeight: 700, lineHeight: 1.3 }}
      >
        {title}
      </h2>

      <div className="divide-y divide-[#E8E0D4]">
        {items.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={i}>
              <button
                onClick={() => toggle(i)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between gap-4 py-5 text-left group"
              >
                <span
                  className="font-semibold text-base md:text-lg leading-snug group-hover:text-[#4A7C2F] transition-colors"
                  style={{ color: isOpen ? '#4A7C2F' : '#1A1A0F' }}
                >
                  {item.question}
                </span>
                <span
                  className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full border-2 transition-all duration-200"
                  style={{
                    borderColor: isOpen ? '#4A7C2F' : '#C8BFA8',
                    backgroundColor: isOpen ? '#4A7C2F' : 'transparent',
                    color: isOpen ? '#fff' : '#8A7468',
                    transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                  }}
                  aria-hidden="true"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
              </button>

              <div
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{ maxHeight: isOpen ? '500px' : '0' }}
              >
                <div
                  className="pb-5 text-base leading-relaxed"
                  style={{ color: '#3D2B1A' }}
                  dangerouslySetInnerHTML={{ __html: item.answer }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
