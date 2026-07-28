import NextLink from '@/components/shared/next-link';
import UserAvatar from '@/components/shared/user-avatar';
import RatingDisplay from '@/components/shared/rating-display';
import type { BlogArticleDetailAuthor } from '@/lib/types/blog';

interface AuthorWithMeta extends BlogArticleDetailAuthor {
  subcategoryLabel: string | null;
}

interface AuthorBoxProps {
  authors: AuthorWithMeta[];
}

export default function AuthorBox({ authors }: AuthorBoxProps) {
  const isDoulitsaTeamOnly =
    !authors ||
    authors.length === 0 ||
    (authors.length === 1 && authors[0].profile.username === 'doulitsa');

  if (isDoulitsaTeamOnly) {
    return (
      <div className="flex items-start gap-4 p-6 border border-gray-200 rounded-2xl bg-white">
        <NextLink href="/articles" className="shrink-0">
          <UserAvatar
            displayName="Doulitsa Team"
            image="/favicon.ico"
            size="lg"
            showBorder={false}
            showShadow={false}
          />
        </NextLink>
        <div className="min-w-0 flex flex-col gap-1">
          <NextLink
            href="/articles"
            className="font-semibold text-gray-900 hover:text-primary transition-colors"
          >
            Doulitsa Team
          </NextLink>
          <span className="text-sm text-muted-foreground">Αναζήτηση Υπηρεσιών</span>
        </div>
      </div>
    );
  }

  const visibleAuthors = authors.filter(
    (a) => a.profile.username !== 'doulitsa',
  );

  if (visibleAuthors.length === 0) return null;

  return (
    <div className="space-y-4">
      {visibleAuthors.map((author) => {
        const profile = author.profile;
        const href = `/profile/${profile.username}`;
        const rating = profile.rating ?? 0;
        const reviewCount = profile.reviewCount ?? 0;

        return (
          <div
            key={profile.id}
            className="flex items-start gap-4 p-6 border border-gray-200 rounded-2xl bg-white"
          >
            <NextLink
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0"
            >
              <UserAvatar
                displayName={profile.displayName || undefined}
                image={profile.image}
                size="lg"
                showBorder={false}
                showShadow={false}
              />
            </NextLink>
            <div className="min-w-0 flex flex-col gap-1">
              <NextLink
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-gray-900 hover:text-primary transition-colors"
              >
                {profile.displayName}
              </NextLink>
              {author.subcategoryLabel && (
                <span className="text-sm text-muted-foreground">
                  {author.subcategoryLabel}
                </span>
              )}
              {reviewCount > 0 && (
                <RatingDisplay
                  rating={rating}
                  reviewCount={reviewCount}
                  size="sm"
                  variant="compact"
                  className="text-xs"
                />
              )}
              {profile.authorBio && (
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {profile.authorBio}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
