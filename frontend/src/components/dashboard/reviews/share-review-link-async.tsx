import { ShareReviewLink } from './share-review-link';

import { getSession } from '@/actions/auth/server';
export async function ShareReviewLinkAsync({
  className,
}: {
  className?: string;
}) {
  // Check if user is a professional (only professionals see share link)
  const session = (await (async () => { const r = await getSession(); return r.success && r.data?.user ? { user: r.data.user, session: r.data.session } : null; })());

  const isProfessional =
    session?.user?.role === 'freelancer' ||
    session?.user?.role === 'company';

  // Return null if not a professional
  if (!isProfessional || !session?.user?.username) {
    return null;
  }

  return (
    <ShareReviewLink username={session.user.username} className={className} />
  );
}
