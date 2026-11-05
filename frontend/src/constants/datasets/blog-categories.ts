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
  // Slugs MUST match OLD prod + Django (`backend/apps/blog/constants.py`) and
  // the stored `blog_articles.categorySlug` rows (P1-22). An earlier rename to
  // the service-taxonomy spellings broke admin saves in 5 categories and 404'd
  // the old /articles/<category> URLs — do not "fix" these spellings.
  { slug: 'dimiourgia-periechomenou', label: 'Δημιουργία Περιεχομένου', description: 'Άρθρα σχετικά με τη δημιουργία περιεχομένου και content marketing.', order: 5, emoji: '🎥' },
  { slug: 'ekdiloseis', label: 'Εκδηλώσεις', description: 'Εκδηλώσεις, events και networking για επαγγελματίες.', order: 6, emoji: '🎶' },
  { slug: 'eyexia-frontida', label: 'Ευεξία & Φροντίδα', description: 'Άρθρα για ευεξία, φροντίδα και ισορροπία εργασίας-ζωής.', order: 7, emoji: '💖' },
  { slug: 'mathimata', label: 'Μαθήματα', description: 'Εκπαιδευτικά μαθήματα και tutorials για επαγγελματίες.', order: 8, emoji: '🎓' },
  { slug: 'marketingk', label: 'Μάρκετινγκ', description: 'Στρατηγικές μάρκετινγκ και προώθησης για freelancers.', order: 9, emoji: '🎯' },
  { slug: 'pliroforiki', label: 'Πληροφορική', description: 'Τεχνολογία, λογισμικό και ψηφιακά εργαλεία.', order: 10, emoji: '💻' },
  { slug: 'technika', label: 'Τεχνικά', description: 'Τεχνικά άρθρα και οδηγοί για εξειδικευμένα θέματα.', order: 11, emoji: '🪛' },
  { slug: 'ypostirixi', label: 'Υποστήριξη', description: 'Οδηγοί υποστήριξης και επίλυσης προβλημάτων.', order: 12, emoji: '🤝' },
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
