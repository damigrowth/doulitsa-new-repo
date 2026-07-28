import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { detectMediaType } from '@/lib/utils/media';
import AudioGallery from './audio-gallery';
import MediaCarousel from './media-carousel';

interface MediaGalleryProps {
  media: AppJson.CloudinaryResource[] | null;
  title?: string;
  showCards?: boolean;
  className?: string;
}

export default function MediaGallery({
  media,
  title = 'Γκαλερί',
  showCards = true,
  className,
}: MediaGalleryProps) {
  if (!media || !Array.isArray(media) || media.length === 0) {
    return null;
  }

  // Separate audio files from visual media using detectMediaType
  const audioFiles = media.filter((item) => detectMediaType(item) === 'audio');
  const visualMedia = media.filter((item) => detectMediaType(item) !== 'audio');

  return (
    <section className={`space-y-8 ${className || ''}`}>
      {/* Audio Gallery */}
      <AudioGallery audioFiles={audioFiles} />

      {/* Visual Media Carousel */}
      {visualMedia.length > 0 &&
        (showCards ? (
          <Card className='rounded-2xl border-gray-100 shadow-sm'>
            <CardHeader className='pb-4'>
              <CardTitle className='text-lg font-semibold'>{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <MediaCarousel media={visualMedia} className='w-full' />
            </CardContent>
          </Card>
        ) : (
          <div>
            <MediaCarousel media={visualMedia} className='w-full' />
          </div>
        ))}
    </section>
  );
}
