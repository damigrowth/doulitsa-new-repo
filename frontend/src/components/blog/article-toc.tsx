'use client';

import { useEffect, useState } from 'react';

interface TocItem {
  id: string;
  text: string;
}

interface ArticleTocProps {
  content: string;
}

function parseHeadings(html: string): TocItem[] {
  const headings: TocItem[] = [];
  const regex = /<h2[^>]*>(.*?)<\/h2>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]*>/g, '').trim();
    if (text) {
      const id = text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      headings.push({ id, text });
    }
  }

  return headings;
}

export default function ArticleToc({ content }: ArticleTocProps) {
  const [activeId, setActiveId] = useState<string>('');
  const headings = parseHeadings(content);

  useEffect(() => {
    // Add IDs to H2 elements in the article
    const articleEl = document.querySelector('.article-prose');
    if (!articleEl) return;

    const h2Elements = articleEl.querySelectorAll('h2');
    h2Elements.forEach((h2, index) => {
      if (headings[index]) {
        h2.id = headings[index].id;
      }
    });

    // Observe heading visibility
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-80px 0px -70% 0px' },
    );

    h2Elements.forEach((h2) => observer.observe(h2));

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 2) return null;

  const handleClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav className="hidden lg:block sticky top-24">
      <h4 className="text-sm font-semibold text-gray-900 mb-4">
        Περιεχόμενα
      </h4>
      <ul className="space-y-2 border-l border-gray-200">
        {headings.map((heading) => (
          <li key={heading.id}>
            <button
              onClick={() => handleClick(heading.id)}
              className={`block w-full text-left pl-4 py-1 text-sm transition-colors border-l-2 -ml-px ${
                activeId === heading.id
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-muted-foreground hover:text-gray-900'
              }`}
            >
              {heading.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
