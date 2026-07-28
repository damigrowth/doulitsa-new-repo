import { sanitizeRichText } from '@/lib/utils/text/sanitize';

interface ArticleContentProps {
  content: string;
}

export default function ArticleContent({ content }: ArticleContentProps) {
  const sanitized = sanitizeRichText(content);

  return (
    <div
      className="article-prose
        [&>h2]:text-xl [&>h2]:sm:text-2xl [&>h2]:font-bold [&>h2]:text-gray-900 [&>h2]:mt-10 [&>h2]:mb-4
        [&>h3]:text-lg [&>h3]:sm:text-xl [&>h3]:font-bold [&>h3]:text-gray-900 [&>h3]:mt-8 [&>h3]:mb-3
        [&>p]:text-base [&>p]:leading-relaxed [&>p]:text-gray-700 [&>p]:mb-4
        [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:mb-4 [&>ul]:space-y-1
        [&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:mb-4 [&>ol]:space-y-1
        [&_li]:text-base [&_li]:leading-relaxed [&_li]:text-gray-700
        [&_strong]:font-semibold [&_strong]:text-gray-900
        [&_em]:italic
        [&>p:first-child]:text-base [&>p:first-child]:sm:text-lg [&>p:first-child]:leading-relaxed [&>p:first-child]:text-gray-800
        [&>blockquote]:border-l-4 [&>blockquote]:border-primary [&>blockquote]:pl-6 [&>blockquote]:py-2 [&>blockquote]:my-8 [&>blockquote]:italic [&>blockquote]:text-gray-600
        [&>blockquote_p]:text-lg [&>blockquote_p]:leading-relaxed [&>blockquote_p]:mb-2
        [&>blockquote_cite]:text-sm [&>blockquote_cite]:not-italic [&>blockquote_cite]:font-medium [&>blockquote_cite]:text-gray-900
        [&_img]:rounded-xl [&_img]:my-6
      "
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
