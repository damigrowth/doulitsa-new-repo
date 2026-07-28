import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import TaxonomyTabs from '@/components/shared/taxonomy-tabs';
import { getArticle } from '@/actions/blog/get-article';
import { getArticles, getRelatedArticles } from '@/actions/blog/get-articles';
import {
  getAllBlogCategories,
  getBlogCategoryBySlug,
} from '@/constants/datasets/blog-categories';
import { resolveCoverUrl, resolveCategoryLabel, estimateReadTime } from '@/lib/utils/blog';
import { findProById } from '@/lib/taxonomies';
import {
  ArticleCard,
  ArticleHeader,
  ArticleContent,
  ArticleToc,
  AuthorBox,
  BlogPagination,
  BlogSectionHeader,
  HorizontalArticleCard,
  CompactArticleRow,
} from '@/components/blog';
import DynamicBreadcrumb from '@/components/shared/dynamic-breadcrumb';
import { ArticleSchema } from '@/lib/seo/schema/article-schema';

export const dynamicParams = true;
export const dynamic = 'force-dynamic'; // no-store API client & ISR conflict at runtime (next start) -> render on demand

interface SlugPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; search?: string }>;
}


export async function generateStaticParams() {
  return getAllBlogCategories().map((cat) => ({ slug: cat.slug }));
}

export async function generateMetadata({
  params,
}: SlugPageProps): Promise<Metadata> {
  const { slug } = await params;

  const category = getBlogCategoryBySlug(slug);
  if (category) {
    return {
      title: `${category.label} - Άρθρα | Doulitsa`,
      description:
        category.description ||
        `Διαβάστε άρθρα στην κατηγορία ${category.label}`,
    };
  }

  const result = await getArticle(slug);
  if (!result.success || !result.data) {
    return { title: 'Άρθρο | Doulitsa' };
  }

  const article = result.data;
  const coverUrl =
    typeof article.coverImage === 'object'
      ? article.coverImage?.secure_url
      : typeof article.coverImage === 'string'
        ? article.coverImage
        : undefined;

  return {
    title: `${article.title} | Doulitsa`,
    description: article.excerpt || undefined,
    openGraph: {
      title: article.title,
      description: article.excerpt || undefined,
      type: 'article',
      publishedTime: article.publishedAt
        ? new Date(article.publishedAt).toISOString()
        : undefined,
      ...(coverUrl ? { images: [{ url: coverUrl }] } : {}),
    },
  };
}

export default async function ArticleOrCategoryPage({
  params,
  searchParams,
}: SlugPageProps) {
  const { slug } = await params;
  const { page: pageParam, search } = await searchParams;

  // Check if slug matches a blog category → render category page
  const category = getBlogCategoryBySlug(slug);

  if (category) {
    const currentPage = Math.max(1, parseInt(pageParam || '1'));

    const articlesResult = await getArticles({
      page: currentPage,
      limit: 12,
      categorySlug: slug,
      ...(search ? { search } : {}),
    });

    const allArticles = articlesResult.success
      ? articlesResult.data!.articles
      : [];
    const totalPages = articlesResult.success
      ? articlesResult.data!.totalPages
      : 0;

    const featuredCards = currentPage === 1 ? allArticles.slice(0, 3) : [];
    const compactArticles =
      currentPage === 1 ? allArticles.slice(3) : allArticles;

    const othersResult =
      currentPage === 1 ? await getArticles({ page: 1, limit: 6 }) : null;
    const otherArticles = othersResult?.success
      ? othersResult
          .data!.articles.filter(
            (a) => !featuredCards.some((f) => f.id === a.id),
          )
          .slice(0, 6)
      : [];

    return (
      <div className="bg-muted min-h-screen pt-20">
        <TaxonomyTabs />
        <div className="max-w-[872px] mx-auto px-5 sm:px-10 lg:px-0 pt-10 pb-16">
          {/* Category header */}
          <div className="mb-8">
            <h1 className="text-3xl font-medium text-gray-900">
              {category.label}
            </h1>
            {category.description && (
              <p className="mt-2 text-muted-foreground">
                {category.description}
              </p>
            )}
          </div>

          {allArticles.length === 0 ? (
            <div className="text-center py-16">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Δεν βρέθηκαν άρθρα
              </h3>
              <p className="text-muted-foreground">
                Δεν υπάρχουν άρθρα σε αυτή την κατηγορία.
              </p>
            </div>
          ) : (
            <>
              {featuredCards.length > 0 && (
                <div>
                  {featuredCards.map((article) => (
                    <HorizontalArticleCard
                      key={article.id}
                      article={article}
                      categoryLabel={resolveCategoryLabel(article.categorySlug)}
                      coverUrl={resolveCoverUrl(article.coverImage, 'cardLarge')}
                    />
                  ))}
                </div>
              )}

              {compactArticles.length > 0 && (
                <div className="mt-16">
                  <BlogSectionHeader label="Πρόσφατα" />
                  <div>
                    {compactArticles.map((article) => (
                      <CompactArticleRow
                        key={article.id}
                        article={article}
                        categoryLabel={resolveCategoryLabel(article.categorySlug)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {otherArticles.length > 0 && (
                <div className="mt-16">
                  <BlogSectionHeader label="Δείτε Ακόμα" />
                  <div>
                    {otherArticles.map((article) => (
                      <CompactArticleRow
                        key={article.id}
                        article={article}
                        categoryLabel={resolveCategoryLabel(article.categorySlug)}
                        hideDetails
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-12">
                <BlogPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  baseUrl={`/articles/${slug}`}
                />
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Otherwise render article page
  const result = await getArticle(slug);
  if (!result.success || !result.data) {
    notFound();
  }

  const article = result.data;
  const categoryData = article.categorySlug
    ? getBlogCategoryBySlug(article.categorySlug)
    : null;

  const relatedResult = article.categorySlug
    ? await getRelatedArticles(article.categorySlug, article.slug, 4)
    : null;
  const relatedArticles =
    relatedResult?.success && relatedResult.data ? relatedResult.data : [];

  // Resolve all data server-side before passing to components
  const articleCoverUrl = resolveCoverUrl(article.coverImage, 'full');
  const articleCategoryLabel = resolveCategoryLabel(article.categorySlug);
  const readTime = estimateReadTime(article.content);

  const authors = article.authors.map((a) => ({
    ...a,
    subcategoryLabel: findProById(a.profile.subcategory)?.label ?? null,
  }));

  return (
    <div className="bg-muted min-h-screen pt-20">
      <TaxonomyTabs />
      <ArticleSchema
        slug={article.slug}
        title={article.title}
        excerpt={article.excerpt}
        coverImage={article.coverImage}
        publishedAt={article.publishedAt}
        updatedAt={article.updatedAt}
        authors={article.authors.map((a) => a.profile)}
      />

      {/* Hero section — wider container for image */}
      <div className="px-5 sm:px-10 lg:px-16 pt-4">
        {/* Breadcrumb */}
        <div className="max-w-[872px] mx-auto mb-2">
          <DynamicBreadcrumb
            className="!py-1"
            segments={[
              { label: 'Άρθρα', href: '/articles' },
              ...(categoryData
                ? [
                    {
                      label: categoryData.label,
                      href: `/articles/${article.categorySlug}`,
                    },
                  ]
                : []),
            ]}
          />
        </div>

        {/* Article Header */}
        <ArticleHeader
          title={article.title}
          categorySlug={article.categorySlug}
          categoryLabel={articleCategoryLabel}
          readTime={readTime}
          publishedAt={article.publishedAt}
          coverUrl={articleCoverUrl}
        />
      </div>

      {/* Article body — 872px max, TOC sidebar + content */}
      <div className="max-w-[872px] mx-auto px-5 sm:px-10 lg:px-0 py-16">
        <div className="flex gap-12">
          {/* TOC sidebar — 180px, sticky */}
          <aside className="hidden lg:block w-[180px] shrink-0">
            {article.content && <ArticleToc content={article.content} />}
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0 flex flex-col gap-12">
            {article.content && (
              <ArticleContent content={article.content} />
            )}

            {/* Author section */}
            <div className="pt-8">
              <p className="text-[13px] font-mono font-medium uppercase tracking-normal text-muted-foreground mb-4">
                Δημοσιεύθηκε από
              </p>
              <AuthorBox authors={authors} />
            </div>
          </div>
        </div>
      </div>

      {/* Full-width divider */}
      <div className="max-w-[872px] mx-auto px-5 sm:px-10 lg:px-0">
        <div className="h-px bg-black/[0.08]" />
      </div>

      {/* Related articles */}
      {relatedArticles.length > 0 && (
        <div className="max-w-[872px] mx-auto px-5 sm:px-10 lg:px-0 py-16">
          <BlogSectionHeader label="Σχετικά Άρθρα" className="mb-7" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {relatedArticles.map((related) => (
              <ArticleCard
                key={related.id}
                article={related}
                categoryLabel={resolveCategoryLabel(related.categorySlug)}
                coverUrl={resolveCoverUrl(related.coverImage, 'cardLarge')}
                hideAuthor
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
