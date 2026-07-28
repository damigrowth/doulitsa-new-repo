import { ImageIcon, Video, Volume2 } from 'lucide-react';
import { getCloudinaryMediaType } from '@/lib/utils/media';
import type { CloudinaryResource } from '@/lib/types/cloudinary';

interface MediaTypeIndicatorsProps {
  media: CloudinaryResource[] | null | undefined;
  className?: string;
}

/**
 * Displays small icons indicating what media types a service has (image, video, audio).
 * Used on archive service cards to hint at available media without showing it.
 */
export function MediaTypeIndicators({
  media,
  className,
}: MediaTypeIndicatorsProps) {
  if (!media || !Array.isArray(media) || media.length === 0) return null;

  // Detect which media types are present
  let hasImages = false;
  let hasVideos = false;
  let hasAudio = false;

  for (const item of media) {
    const type = getCloudinaryMediaType(item);
    if (type === 'image') hasImages = true;
    else if (type === 'video') hasVideos = true;
    else if (type === 'audio') hasAudio = true;
  }

  // Don't render if no recognized media types
  if (!hasImages && !hasVideos && !hasAudio) return null;

  return (
    <div className={`flex items-center gap-2 text-gray-400 ${className ?? ''}`}>
      {hasImages && <ImageIcon className='h-4 w-4' />}
      {hasVideos && <Video className='h-4 w-4' />}
      {hasAudio && <Volume2 className='h-4 w-4' />}
    </div>
  );
}
