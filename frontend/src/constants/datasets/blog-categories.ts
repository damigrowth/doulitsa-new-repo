/**
 * Static blog categories
 * These are fixed and don't need admin management.
 */

export interface BlogCategory {
  slug: string;
  label: string;
  description: string;
  order: number;
  emoji?: string;
}

export const BLOG_CATEGORIES: BlogCategory[] = [
  { slug: 'nea', label: 'Νέα', description: 'Τα τελευταία νέα και ενημερώσεις από τον κόσμο των freelancers.', order: 0, emoji: '📰' },
  { slug: 'anakoinoseis', label: 'Ανακοινώσεις', description: 'Επίσημες ανακοινώσεις και ενημερώσεις της πλατφόρμας.', order: 1, emoji: '📣' },
  { slug: 'tips', label: 'Tips', description: 'Χρήσιμα tips και κόλπα για επαγγελματίες.', order: 2, emoji: '💡' },
  { slug: 'diy', label: 'DIY', description: 'Οδηγοί Do-It-Yourself για πρακτικές λύσεις.', order: 3, emoji: '🔨' },
  { slug: 'symvoules', label: 'Συμβουλές', description: 'Συμβουλές και καθοδήγηση για επαγγελματική ανάπτυξη.', order: 4, emoji: '🎯' },
  // Slugs deliberately match the canonical service-taxonomy slugs (see
  // `serviceTaxonomies` in `service-taxonomies.ts`). The original CMS export
  // had typos here (`marketingk`, `technika`, `eyexia-frontida`,
  // `ypostirixi`, `dimiourgia-periechomenou`) — they were renamed and a SQL
  // migration was run to rewrite existing `blog_articles.categorySlug` rows.
  { slug: 'dimiourgia-periexomenou', label: 'Δημιουργία Περιεχομένου', description: 'Άρθρα σχετικά με τη δημιουργία περιεχομένου και content marketing.', order: 5, emoji: '🎥' },
  { slug: 'ekdiloseis', label: 'Εκδηλώσεις', description: 'Εκδηλώσεις, events και networking για επαγγελματίες.', order: 6, emoji: '🎶' },
  { slug: 'eveksia-frontida', label: 'Ευεξία & Φροντίδα', description: 'Άρθρα για ευεξία, φροντίδα και ισορροπία εργασίας-ζωής.', order: 7, emoji: '💖' },
  { slug: 'mathimata', label: 'Μαθήματα', description: 'Εκπαιδευτικά μαθήματα και tutorials για επαγγελματίες.', order: 8, emoji: '🎓' },
  { slug: 'marketing', label: 'Μάρκετινγκ', description: 'Στρατηγικές μάρκετινγκ και προώθησης για freelancers.', order: 9, emoji: '🎯' },
  { slug: 'pliroforiki', label: 'Πληροφορική', description: 'Τεχνολογία, λογισμικό και ψηφιακά εργαλεία.', order: 10, emoji: '💻' },
  { slug: 'texnika', label: 'Τεχνικά', description: 'Τεχνικά άρθρα και οδηγοί για εξειδικευμένα θέματα.', order: 11, emoji: '🪛' },
  { slug: 'ypostiriksi', label: 'Υποστήριξη', description: 'Οδηγοί υποστήριξης και επίλυσης προβλημάτων.', order: 12, emoji: '🤝' },
];

/**
 * Get a blog category by slug
 */
export function getBlogCategoryBySlug(slug: string): BlogCategory | undefined {
  return BLOG_CATEGORIES.find((cat) => cat.slug === slug);
}

/**
 * Get all blog categories (already ordered)
 */
export function getAllBlogCategories(): BlogCategory[] {
  return BLOG_CATEGORIES;
}
