import type { Metadata } from 'next';
import { getArticles } from '@/actions/blog/get-articles';
import { resolveCoverUrl, resolveCategoryLabel } from '@/lib/utils/blog';
import {
  ArticleCard,
  BlogPagination,
  BlogSectionHeader,
  FeaturedArticleHero,
  CompactArticleRow,
} from '@/components/blog';
import TaxonomyTabs from '@/components/shared/taxonomy-tabs';

export const dynamic = 'force-dynamic'; // no-store API client & ISR conflict at runtime (next start) -> render on demand

export const metadata: Metadata = {
  title: 'Άρθρα | Doulitsa',
  description:
    'Διαβάστε τα τελευταία άρθρα και οδηγούς για freelancers και επαγγελματίες στην Ελλάδα.',
};

interface ArticlesPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
  }>;
}


export default async function ArticlesPage({
  searchParams,
}: ArticlesPageProps) {
  const { page: pageParam, search } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageParam || '1'));

  const articlesResult = await getArticles({
    page: currentPage,
    limit: 12,
    ...(search ? { search } : {}),
  });

  const allArticles = articlesResult.success
    ? articlesResult.data!.articles
    : [];
  const totalPages = articlesResult.success
    ? articlesResult.data!.totalPages
    : 0;

  // Page 1: split into featured hero, grid cards, and compact list
  const featuredArticle =
    currentPage === 1 ? allArticles.find((a) => a.featured) : null;
  const remainingArticles = featuredArticle
    ? allArticles.filter((a) => a.id !== featuredArticle.id)
    : allArticles;
  const gridArticles = remainingArticles.slice(0, 6);
  const recentArticles = currentPage === 1 ? remainingArticles.slice(6) : [];

  return (
    <div className="bg-muted min-h-screen pt-20">
      <TaxonomyTabs />
      <div className="max-w-[872px] mx-auto px-5 sm:px-10 lg:px-0 pt-10">
        {allArticles.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Δεν βρέθηκαν άρθρα
            </h3>
            <p className="text-muted-foreground">
              Δεν υπάρχουν διαθέσιμα άρθρα αυτή τη στιγμή.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-11">
            {/* Featured Hero (page 1 only) */}
            {currentPage === 1 && featuredArticle && (
              <FeaturedArticleHero
                article={featuredArticle}
                categoryLabel={resolveCategoryLabel(featuredArticle.categorySlug)}
                coverUrl={resolveCoverUrl(featuredArticle.coverImage, 'carousel')}
                hideAuthor
              />
            )}

            {/* Articles Grid — 3 columns */}
            {gridArticles.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gridArticles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    categoryLabel={resolveCategoryLabel(article.categorySlug)}
                    coverUrl={resolveCoverUrl(article.coverImage, 'cardLarge')}
                    hideAuthor
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* "Πρόσφατα" compact list section */}
        {currentPage === 1 && recentArticles.length > 0 && (
          <div className="mt-16">
            <BlogSectionHeader label="Πρόσφατα" />
            <div>
              {recentArticles.map((article) => (
                <CompactArticleRow
                  key={article.id}
                  article={article}
                  categoryLabel={resolveCategoryLabel(article.categorySlug)}
                  hideAuthor
                />
              ))}
            </div>
          </div>
        )}

        {/* Pagination */}
        <div className="mt-12 pb-16">
          <BlogPagination
            currentPage={currentPage}
            totalPages={totalPages}
            baseUrl="/articles"
          />
        </div>
      </div>
    </div>
  );
}
