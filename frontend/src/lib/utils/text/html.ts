/**
 * Strip all HTML tags from a string, returning plain text only.
 * Used for character counting, normalization, and Zod validation.
 */
export function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Detect if a string contains HTML tags.
 * Used for backward compatibility rendering (legacy plain text vs new HTML).
 */
export function isHtmlContent(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}
