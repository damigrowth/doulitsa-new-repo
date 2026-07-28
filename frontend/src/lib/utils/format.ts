/**
 * FORMATTING UTILITIES
 * Common formatting functions for data display
 */

/**
 * Format currency values
 */
export function formatCurrency(
  amount: number,
  currency: string = 'EUR',
  locale: string = 'el-GR'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format numbers with locale-specific formatting
 */
export function formatNumber(
  number: number,
  options?: Intl.NumberFormatOptions,
  locale: string = 'el-GR'
): string {
  return new Intl.NumberFormat(locale, options).format(number);
}

/**
 * Format percentage values
 */
export function formatPercentage(
  value: number,
  decimals: number = 0,
  locale: string = 'el-GR'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

/**
 * Format phone numbers for display
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Greek phone number formatting
  if (cleaned.startsWith('30') && cleaned.length === 12) {
    return `+30 ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  }
  
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  
  return phone; // Return original if can't format
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format names for display
 */
export function formatName(
  firstName?: string,
  lastName?: string,
  displayName?: string
): string {
  if (displayName?.trim()) return displayName.trim();
  
  const parts = [firstName?.trim(), lastName?.trim()].filter(Boolean);
  return parts.join(' ') || 'Anonymous User';
}

/**
 * Format initials from name
 */
export function formatInitials(
  firstName?: string,
  lastName?: string,
  displayName?: string
): string {
  if (displayName?.trim()) {
    const words = displayName.trim().split(' ');
    return words.length > 1 
      ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
      : words[0].slice(0, 2).toUpperCase();
  }
  
  const first = firstName?.trim()?.[0]?.toUpperCase() || '';
  const last = lastName?.trim()?.[0]?.toUpperCase() || '';
  
  return first + last || 'AU';
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Format URLs for display (remove protocol)
 */
export function formatUrl(url: string): string {
  return url.replace(/^https?:\/\//, '');
}

/**
 * Format rating display
 */
export function formatRating(rating: number, maxRating: number = 5): string {
  return `${rating.toFixed(1)}/${maxRating}`;
}

/**
 * Format review count
 */
export function formatReviewCount(count: number): string {
  if (count === 0) return 'No reviews';
  if (count === 1) return '1 review';
  return `${formatNumber(count)} reviews`;
}

/**
 * Capitalize first letter of each word
 */
export function capitalize(text: string): string {
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Format username for display
 */
export function formatUsername(username: string): string {
  return `@${username}`;
}