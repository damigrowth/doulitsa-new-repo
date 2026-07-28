/**
 * Shuffle featured items to the front in random order,
 * preserving the original order of non-featured items.
 *
 * Uses Fisher-Yates shuffle on the featured subset.
 */
export function shuffleFeatured<
  T extends { featured: boolean | null },
>(items: T[]): T[] {
  const featured = items.filter((item) => item.featured);
  const rest = items.filter((item) => !item.featured);

  // Fisher-Yates shuffle
  for (let i = featured.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [featured[i], featured[j]] = [featured[j], featured[i]];
  }

  return [...featured, ...rest];
}
