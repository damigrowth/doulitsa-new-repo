import React from 'react';
import { isHtmlContent } from '@/lib/utils/text/html';
import { sanitizeRichText } from '@/lib/utils/text/sanitize';
import { formatText } from './text';

/**
 * Render content that may be HTML (from Tiptap) or plain text (legacy).
 * Sanitizes HTML content for security before rendering.
 */
export function renderRichContent(content: string): React.ReactNode {
  if (isHtmlContent(content)) {
    const sanitized = sanitizeRichText(content);
    return (
      <div
        className='rich-text'
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    );
  }

  // Legacy plain text fallback
  return <>{formatText(content)}</>;
}
