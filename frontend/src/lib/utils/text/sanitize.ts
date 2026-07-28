import sanitizeHtml from 'sanitize-html';

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'strong', 'em', 'h2', 'h3', 'ul', 'ol', 'li', 'br', 'img'],
  allowedAttributes: {
    img: ['src', 'alt', 'width', 'height'],
  },
  allowedSchemes: ['https'],
};

/**
 * Sanitize HTML content for safe rendering.
 * Allows only basic formatting tags from the Tiptap editor.
 */
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}
