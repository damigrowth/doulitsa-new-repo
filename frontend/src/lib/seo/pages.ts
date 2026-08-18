'use server';

import { Meta } from './meta';
import { MetaData } from './metadata';
import * as blogApi from '@/lib/api/blog';
import { ApiError } from '@/lib/api/client';
import { stripHtmlTags } from '@/lib/utils/text/html';

/**
 * Service page metadata generation
 * Now accepts service ID instead of slug for better URL flexibility
 */
export async function getServiceMetadata(id: number) {
  const { meta } = await Meta({
    type: 'service',
    params: { id },
    titleTemplate: '%title% από %displayName%',
    descriptionTemplate: '%subcategory% - %subdivision% - %description%',
    size: 100,
    // URL will be constructed from the service slug after fetching
  });

  return meta;
}

/**
 * Profile page metadata generation
 */
export async function getProfileMetadata(username: string) {
  const { meta } = await Meta({
    type: 'profile',
    params: { username },
    titleTemplate: '%displayName% - %type% - %subcategorySingular%. %tagline%',
    descriptionTemplate: '%bio%',
    size: 160,
    url: `/profile/${encodeURIComponent(username)}`,
  });

  return meta;
}

/**
 * About page metadata generation
 */
export async function getAboutMetadata() {
  const { meta } = await Meta({
    titleTemplate: 'Σχετικά με τη Doulitsa',
    descriptionTemplate:
      'Σχετικά με τη Doulitsa, Ανακάλυψε εξειδικευμένους επαγγελματίες και υπηρεσίες από όλη την Ελλάδα. Από ψηφιακές υπηρεσίες έως τεχνικές εργασίες, έχουμε ό,τι χρειάζεσαι.',
    size: 160,
    url: '/about',
  });

  return meta;
}

/**
 * Contact page metadata generation
 */
export async function getContactMetadata() {
  const { meta } = await Meta({
    titleTemplate: 'Επικοινωνία - Doulitsa',
    descriptionTemplate:
      'Επικοινώνησε μαζί μας με όποιον τρόπο προτιμάς, θα χαρούμε να βοηθήσουμε!',
    size: 160,
    url: '/contact',
  });

  return meta;
}

/**
 * FAQ page metadata generation
 */
export async function getFaqMetadata() {
  const { meta } = await Meta({
    titleTemplate: 'Συχνές Ερωτήσεις - Doulitsa',
    descriptionTemplate:
      'Βρες απαντήσεις σε συχνές ερωτήσεις σχετικά με τη χρήση της πλατφόρμας.',
    size: 160,
    url: '/faq',
  });

  return meta;
}

/**
 * For Pros page metadata generation
 */
export async function getForProsMetadata() {
  const { meta } = await Meta({
    titleTemplate: 'Για επαγγελματίες',
    descriptionTemplate:
      'Εάν είστε Επαγγελματίας ή Επιχείρηση, μπορείτε να αποκτήσετε εύκολα προβολή στην πλατφόρμα μας.',
    size: 160,
    url: '/for-pros',
  });

  return meta;
}

/**
 * Privacy page metadata generation
 */
export async function getPrivacyMetadata() {
  const { meta } = await Meta({
    titleTemplate: 'Πολιτική Απορρήτου',
    descriptionTemplate:
      'Διαβάστε την πολιτική απορρήτου της Doulitsa για να μάθετε πώς συλλέγουμε, χρησιμοποιούμε και προστατεύουμε τα προσωπικά σας δεδομένα.',
    size: 160,
    url: '/privacy',
  });

  return meta;
}

/**
 * Terms page metadata generation
 */
export async function getTermsMetadata() {
  const { meta } = await Meta({
    titleTemplate: 'Όροι Χρήσης',
    descriptionTemplate:
      'Διαβάστε τους όρους χρήσης της πλατφόρμας Doulitsa. Μάθετε για τα δικαιώματα και τις υποχρεώσεις σας κατά τη χρήση των υπηρεσιών μας.',
    size: 160,
    url: '/terms',
  });

  return meta;
}

/**
 * Cancellation policy page metadata generation
 */
export async function getCancellationMetadata() {
  const { meta } = await Meta({
    titleTemplate: 'Πολιτική Ακύρωσης',
    descriptionTemplate:
      'Μάθετε για την πολιτική ακύρωσης συνδρομών της Doulitsa. Δικαίωμα ακύρωσης, επιστροφές χρημάτων και λήξη υπηρεσιών.',
    size: 160,
    url: '/politiki-akirosis',
  });

  return meta;
}

/**
 * Cookie policy page metadata generation
 */
export async function getCookiesMetadata() {
  const { meta } = await Meta({
    titleTemplate: 'Πολιτική Cookies',
    descriptionTemplate:
      'Ποια cookies χρησιμοποιεί το doulitsa.gr, για ποιον σκοπό, για πόσο διάστημα και πώς μπορείτε να αλλάξετε ή να ανακαλέσετε τις επιλογές σας.',
    size: 160,
    url: '/cookies',
  });

  return meta;
}

/**
 * Login page metadata generation
 */
export async function getLoginMetadata() {
  const { meta } = await Meta({
    titleTemplate: 'Είσοδος - Doulitsa',
    descriptionTemplate:
      'Συνδέσου στον λογαριασμό σου για να αποκτήσεις πρόσβαση στις υπηρεσίες της Doulitsa.',
    size: 160,
    url: '/login',
  });

  return meta;
}

/**
 * Register page metadata generation
 */
export async function getRegisterMetadata() {
  const { meta } = await Meta({
    titleTemplate: 'Εγγραφή - Doulitsa',
    descriptionTemplate:
      'Δημιούργησε τον λογαριασμό σου στην Doulitsa και ξεκίνησε να προσφέρεις ή να αναζητάς υπηρεσίες.',
    size: 160,
    url: '/register',
  });

  return meta;
}

/**
 * Reset Password page metadata generation
 */
export async function getResetPasswordMetadata() {
  const { meta } = await Meta({
    titleTemplate: 'Επαναφορά κωδικού - Doulitsa',
    descriptionTemplate:
      'Ορίστε τον νέο κωδικό πρόσβασης για τον λογαριασμό σας στην Doulitsa.',
    size: 160,
    url: '/reset-password',
  });

  return meta;
}

/**
 * Forgot Password page metadata generation
 */
export async function getForgotPasswordMetadata() {
  const { meta } = await Meta({
    titleTemplate: 'Ξέχασες τον κωδικό σου - Doulitsa',
    descriptionTemplate:
      'Ανακτήστε τον κωδικό πρόσβασης του λογαριασμού σας στην Doulitsa με λίγα απλά βήματα.',
    size: 160,
    url: '/forgot-password',
  });

  return meta;
}

/**
 * Register Success page metadata generation
 */
export async function getRegisterSuccessMetadata() {
  const { meta } = await Meta({
    titleTemplate: 'Επιβεβαίωση Email - Doulitsa',
    descriptionTemplate:
      'Επιβεβαιώστε τη διεύθυνση email σας για να ολοκληρώσετε την εγγραφή σας στην Doulitsa.',
    size: 160,
    url: '/register/success',
  });

  return meta;
}

/**
 * Onboarding page metadata generation
 */
export async function getOnboardingMetadata() {
  const { meta } = await Meta({
    titleTemplate: 'Ολοκλήρωση Εγγραφής - Doulitsa',
    descriptionTemplate:
      'Ολοκληρώστε την εγγραφή σας στην Doulitsa συμπληρώνοντας το προφίλ σας.',
    size: 160,
    url: '/onboarding',
  });

  return meta;
}

/**
 * OAuth Setup page metadata generation
 */
export async function getOAuthSetupMetadata() {
  const { meta } = await Meta({
    titleTemplate: 'Ολοκλήρωση Εγγραφής - Doulitsa',
    descriptionTemplate:
      'Ολοκληρώστε την εγγραφή σας συμπληρώνοντας τα στοιχεία σας.',
    size: 160,
    url: '/oauth-setup',
  });

  return meta;
}

/**
 * Home page metadata generation with performance optimizations
 */
export async function getHomeMetadata() {
  const { meta } = await Meta({
    titleTemplate:
      'Doulitsa - Βρες Επαγγελματίες και Υπηρεσίες για Κάθε Ανάγκη',
    descriptionTemplate:
      'Ανακάλυψε εξειδικευμένους επαγγελματίες και υπηρεσίες από όλη την Ελλάδα. Από ψηφιακές υπηρεσίες έως τεχνικές εργασίες, έχουμε ό,τι χρειάζεσαι.',
    size: 160,
    url: '/',
  });

  return meta;
}

/**
 * Dashboard metadata generation (title-only, no indexing)
 */
export async function getDashboardMetadata(title: string) {
  return {
    title: `${title} - Doulitsa`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

/**
 * Categories page metadata generation
 */
export async function getCategoriesMetadata() {
  const { meta } = await Meta({
    titleTemplate: 'Κατηγορίες | Doulitsa',
    descriptionTemplate:
      'Ανακάλυψε τις κατηγορίες υπηρεσιών που χρειάζεσαι απο τους επαγγελματίες μας.',
    size: 150,
    url: '/categories',
  });

  return meta;
}

/**
 * Directory page metadata generation
 */
export async function getDirectoryMetadata() {
  const { meta } = await Meta({
    titleTemplate: 'Επαγγελματικός Κατάλογος | Doulitsa',
    descriptionTemplate:
      'Ανακάλυψε επαγγελματίες και επιχειρήσεις σε όλες τις κατηγορίες. Βρες τον κατάλληλο επαγγελματία για τη δουλειά σου.',
    size: 150,
    url: '/directory',
  });

  return meta;
}

/**
 * Directory category page metadata generation
 */
export async function getDirectoryCategoryMetadata(categorySlug: string) {
  const { meta } = await Meta({
    type: 'proCategory',
    params: { categorySlug, type: 'freelancer' },
    titleTemplate: '%arcCategoryPlural% - Επαγγελματικός Κατάλογος',
    descriptionTemplate:
      'Βρες τους Καλύτερους Επαγγελματίες και Επιχειρήσεις, δες τις υπηρεσίες τους, αξιολογήσεις και τιμές. %arcCategoryPlural%',
    size: 200,
    url: `/dir/${categorySlug}`,
  });
  return meta;
}

/**
 * Directory subcategory page metadata generation
 */
export async function getDirectorySubcategoryMetadata(
  categorySlug: string,
  subcategorySlug: string,
) {
  const { meta } = await Meta({
    type: 'proSubcategory',
    params: { categorySlug, subcategorySlug, type: 'freelancer' },
    titleTemplate: '%arcSubcategoryPlural% - Επαγγελματικός Κατάλογος',
    descriptionTemplate:
      'Βρες τους Καλύτερους Επαγγελματίες και Επιχειρήσεις, δες τις υπηρεσίες τους, αξιολογήσεις και τιμές. %arcCategoryPlural%',
    size: 200,
    url: `/dir/${categorySlug}/${subcategorySlug}`,
  });
  return meta;
}

/**
 * Category archive page metadata generation
 */
export async function getCategoryMetadata(categorySlug: string) {
  const { meta } = await Meta({
    type: 'serviceCategory',
    params: { categorySlug },
    titleTemplate: '%label% - Βρες τις καλύτερες Υπηρεσίες στη Doulitsa',
    descriptionTemplate: '%arcCategoryDesc%',
    size: 160,
    url: `/categories/${categorySlug}`,
  });

  return meta;
}

/**
 * Services archive page metadata generation
 */
export async function getServicesMetadata() {
  const { meta } = await Meta({
    titleTemplate: 'Υπηρεσίες | Doulitsa',
    descriptionTemplate:
      'Ανακάλυψε τις υπηρεσίες που θα καλύψουν τις ανάγκες σου.',
    size: 150,
    url: '/ipiresies',
  });

  return meta;
}

/**
 * Service subcategory archive page metadata generation
 */
export async function getServiceSubcategoryMetadata(subcategorySlug: string) {
  const { meta } = await Meta({
    type: 'serviceSubcategory',
    params: { subcategorySlug },
    titleTemplate: '%label% - Βρες τις καλύτερες Υπηρεσίες στη Doulitsa',
    descriptionTemplate: '%description%',
    size: 100,
    url: `/ipiresies/${subcategorySlug}`,
  });

  return meta;
}

/**
 * Service subdivision archive page metadata generation
 */
export async function getServiceSubdivisionMetadata(
  subcategorySlug: string,
  subdivisionSlug: string,
) {
  const { meta } = await Meta({
    type: 'serviceSubdivision',
    params: { subcategorySlug, subdivisionSlug },
    titleTemplate: '%label% - Βρες τις καλύτερες Υπηρεσίες στη Doulitsa',
    descriptionTemplate: '%description%',
    size: 100,
    url: `/ipiresies/${subcategorySlug}/${subdivisionSlug}`,
  });

  return meta;
}

/**
 * Pros archive page metadata generation
 */
export async function getProsMetadata() {
  const { meta } = await Meta({
    titleTemplate: 'Επαγγελματίες | Doulitsa',
    descriptionTemplate:
      'Βρες τους Καλύτερους Επαγγελματίες, δες τις υπηρεσίες τους, αξιολογήσεις και τιμές.',
    size: 150,
    url: '/dir?type=pros',
  });

  return meta;
}

/**
 * Companies archive page metadata generation
 */
export async function getCompaniesMetadata() {
  const { meta } = await Meta({
    titleTemplate: 'Επιχειρήσεις | Doulitsa',
    descriptionTemplate:
      'Βρες τις Καλύτερες Επιχειρήσεις, δες τις υπηρεσίες τους, αξιολογήσεις και τιμές.',
    size: 150,
    url: '/dir?type=companies',
  });

  return meta;
}

/**
 * Pro category archive page metadata generation
 */
export async function getProCategoryMetadata(categorySlug: string) {
  const { meta } = await Meta({
    type: 'proCategory',
    params: { categorySlug, type: 'freelancer' },
    titleTemplate: '%arcCategoryPlural% - Αναζήτηση για Επαγγελματίες',
    descriptionTemplate:
      'Βρες τους Καλύτερους Επαγγελματίες, δες τις υπηρεσίες τους, αξιολογήσεις και τιμές. %arcCategoryPlural%',
    size: 200,
    url: `/dir/${categorySlug}?type=pros`,
  });
  return meta;
}

/**
 * Pro subcategory archive page metadata generation
 */
export async function getProSubcategoryMetadata(
  categorySlug: string,
  subcategorySlug: string,
) {
  const { meta } = await Meta({
    type: 'proSubcategory',
    params: { categorySlug, subcategorySlug, type: 'freelancer' },
    titleTemplate: '%arcCategoryPlural% - Αναζήτηση για Επαγγελματίες',
    descriptionTemplate:
      'Βρες τους Καλύτερους Επαγγελματίες, δες τις υπηρεσίες τους, αξιολογήσεις και τιμές. %arcCategoryPlural%',
    size: 200,
    url: `/dir/${categorySlug}/${subcategorySlug}?type=pros`,
  });
  return meta;
}

/**
 * Company category archive page metadata generation
 */
export async function getCompanyCategoryMetadata(categorySlug: string) {
  const { meta } = await Meta({
    type: 'proCategory',
    params: { categorySlug, type: 'company' },
    titleTemplate: '%arcCategoryPlural% - Αναζήτηση για Επιχειρήσεις',
    descriptionTemplate:
      'Βρες τις Καλύτερες Επιχειρήσεις, δες τις υπηρεσίες τους, αξιολογήσεις και τιμές. %arcCategoryPlural%',
    size: 200,
    url: `/dir/${categorySlug}?type=companies`,
  });
  return meta;
}

/**
 * Company subcategory archive page metadata generation
 */
export async function getCompanySubcategoryMetadata(
  categorySlug: string,
  subcategorySlug: string,
) {
  const { meta } = await Meta({
    type: 'proSubcategory',
    params: { categorySlug, subcategorySlug, type: 'company' },
    titleTemplate: '%arcSubcategoryPlural% - Αναζήτηση για Επιχειρήσεις',
    descriptionTemplate:
      'Βρες τις Καλύτερες Επιχειρήσεις, δες τις υπηρεσίες τους, αξιολογήσεις και τιμές.  %arcCategoryPlural%',
    size: 200,
    url: `/dir/${categorySlug}/${subcategorySlug}?type=companies`,
  });
  return meta;
}

// ============================================================================
// BLOG METADATA
// ============================================================================

/**
 * Blog archive page metadata
 */
export async function getBlogArchiveMetadata() {
  const { meta } = await Meta({
    titleTemplate: 'Άρθρα | Doulitsa',
    descriptionTemplate:
      'Διάβασε χρήσιμα άρθρα και συμβουλές από επαγγελματίες σε όλη την Ελλάδα.',
    size: 160,
    url: '/articles',
  });

  return meta;
}

/**
 * Blog category page metadata
 */
export async function getBlogCategoryMetadata(categorySlug: string) {
  const { getBlogCategoryBySlug } = await import('@/constants/datasets/blog-categories');
  const category = getBlogCategoryBySlug(categorySlug);

  const label = category?.label || categorySlug;
  const description =
    category?.description ||
    `Άρθρα στην κατηγορία ${label} από επαγγελματίες στη Doulitsa.`;

  const { meta } = await Meta({
    titleTemplate: `${label} - Άρθρα | Doulitsa`,
    descriptionTemplate: description,
    size: 160,
    url: `/articles/${categorySlug}`,
  });

  return meta;
}

/**
 * Blog article detail page metadata
 */
export async function getArticleMetadata(slug: string) {
  let article: {
    title: string;
    excerpt: string | null;
    content: string;
    coverImage: unknown;
    categorySlug: string | null;
  } | null = null;
  try {
    article = (await blogApi.getArticle(slug)) as typeof article;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    return null;
  }

  if (!article) {
    return null;
  }

  const description =
    article.excerpt || stripHtmlTags(article.content).slice(0, 160);

  // Extract URL from CloudinaryResource JSON or string
  const coverUrl =
    article.coverImage && typeof article.coverImage === 'object'
      ? (article.coverImage as any).secure_url
      : article.coverImage;

  const { meta } = await MetaData({
    title: `${article.title} | Doulitsa`,
    description,
    size: 160,
    image: coverUrl || undefined,
    url: `/articles/${article.categorySlug || 'uncategorized'}/${slug}`,
  });

  return meta;
}
