'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Music,
  FileVideo,
  FileImage,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
} from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import type { CloudinaryResource } from '@/lib/types/cloudinary';
import {
  getOptimizedImageUrl,
  getVideoThumbnailUrl,
  getThumbnailUrl,
  extractPublicId,
  IMAGE_SIZES,
} from '@/lib/utils/cloudinary';

interface MediaCarouselProps {
  media: CloudinaryResource[];
  className?: string;
  showThumbnails?: boolean;
  showControls?: boolean;
  compactMode?: boolean;
  autoplay?: boolean;
  aspectRatio?: 'square' | 'video' | 'portrait' | 'auto';
  noAudioFiles?: boolean;
}

export default function MediaCarousel({
  media,
  className,
  showThumbnails = true,
  showControls = true,
  compactMode = false,
  autoplay = false,
  aspectRatio = 'video',
  noAudioFiles = false,
}: MediaCarouselProps) {
  // Handle null or undefined media - show placeholder
  if (!media || media.length === 0) {
    return (
      <div
        className={cn(
          'w-full h-full bg-gray-100 flex items-center justify-center',
          className,
        )}
      >
        <ImageIcon className='w-12 h-12 text-gray-400' />
      </div>
    );
  }

  const filteredMedia = noAudioFiles
    ? media.filter((item) => item.resource_type !== 'audio')
    : media;

  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showVideo, setShowVideo] = useState<number | null>(null); // Track which video is playing
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!api) {
      return;
    }

    setCurrent(api.selectedScrollSnap());

    api.on('select', () => {
      const newIndex = api.selectedScrollSnap();
      setCurrent(newIndex);
      // Pause video/audio when changing slides
      if (videoRef.current) {
        videoRef.current.pause();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      setShowVideo(null); // Reset video to thumbnail when changing slides
    });
  }, [api]);

  const handleThumbnailClick = (index: number) => {
    api?.scrollTo(index);
  };

  const togglePlayPause = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const currentMedia = filteredMedia[current];

    if (currentMedia.resource_type === 'video' && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } else if (currentMedia.resource_type === 'audio' && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
    }
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
    }
    setIsMuted(!isMuted);
  };

  const getMediaIcon = (resourceType: string) => {
    switch (resourceType) {
      case 'video':
        return <FileVideo className='h-3 w-3' />;
      case 'audio':
        return <Music className='h-3 w-3' />;
      case 'image':
      default:
        return <FileImage className='h-3 w-3' />;
    }
  };

  const getValidUrl = (item: CloudinaryResource): string | null => {
    const url = item.secure_url || item.url;
    return url && url.trim() !== '' ? url : null;
  };

  const renderMediaContent = (item: CloudinaryResource, index: number) => {
    const mediaUrl = getValidUrl(item);

    switch (item.resource_type) {
      case 'video':
        if (!mediaUrl) {
          return (
            <div className='flex h-full w-full items-center justify-center bg-gray-100'>
              <p className='text-gray-500'>Video unavailable</p>
            </div>
          );
        }

        // Get video thumbnail - massive bandwidth savings (95%+)
        // Use context-aware sizing: smaller for archives (compactMode), larger for detail pages
        const publicId = extractPublicId(mediaUrl);
        const thumbnailSize = compactMode
          ? IMAGE_SIZES.cardLarge  // 600×338px for archive listings (md:w-96)
          : IMAGE_SIZES.carousel;  // 1200×675px for full-width carousels
        const thumbnailUrl = publicId
          ? getVideoThumbnailUrl(publicId, thumbnailSize.width, thumbnailSize.height)
          : null;

        // Show thumbnail with play overlay until clicked
        if (showVideo !== index && thumbnailUrl) {
          return (
            <div
              className='relative h-full w-full group cursor-pointer'
              onClick={() => {
                setShowVideo(index);
                setIsPlaying(true);
              }}
            >
              <Image
                src={thumbnailUrl}
                alt={item.original_filename || 'Video thumbnail'}
                fill
                className={compactMode ? 'object-cover' : 'object-contain'}
                sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
                priority={index === 0}
              />
              <div className='absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors'>
                <div className='rounded-full bg-black/50 p-6 backdrop-blur-sm group-hover:bg-black/60 transition-colors'>
                  <Play className='h-12 w-12 text-white' />
                </div>
              </div>
            </div>
          );
        }

        // Show actual video after click
        return (
          <div className='relative h-full w-full'>
            <video
              ref={index === current ? videoRef : null}
              src={mediaUrl}
              className={cn(
                'h-full w-full',
                compactMode ? 'object-cover' : 'object-contain',
              )}
              controls={false}
              onEnded={() => setIsPlaying(false)}
              muted={isMuted}
              autoPlay
            />
            {showControls && (
              <div
                className={cn(
                  'absolute flex items-center gap-2 rounded-full bg-black/50 backdrop-blur-sm bottom-4 left-1/2 -translate-x-1/2 px-4 py-2',
                )}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <button
                  onClick={togglePlayPause}
                  className={cn(
                    'rounded-full text-white transition-colors hover:bg-white/20',
                    compactMode ? 'p-1' : 'p-2',
                  )}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className={compactMode ? 'h-4 w-4' : 'h-5 w-5'} />
                  ) : (
                    <Play className={compactMode ? 'h-4 w-4' : 'h-5 w-5'} />
                  )}
                </button>
                <button
                  onClick={toggleMute}
                  className={cn(
                    'rounded-full text-white transition-colors hover:bg-white/20',
                    compactMode ? 'p-1' : 'p-2',
                  )}
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? (
                    <VolumeX className={compactMode ? 'h-4 w-4' : 'h-5 w-5'} />
                  ) : (
                    <Volume2 className={compactMode ? 'h-4 w-4' : 'h-5 w-5'} />
                  )}
                </button>
              </div>
            )}
          </div>
        );

      case 'audio':
        if (!mediaUrl) {
          return (
            <div className='flex h-full w-full items-center justify-center bg-gray-100'>
              <p className='text-gray-500'>Audio unavailable</p>
            </div>
          );
        }
        return (
          <div className='flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-700 p-8'>
            <div className='mb-8 rounded-full bg-white/10 p-8 backdrop-blur-sm'>
              <Music className='h-24 w-24 text-white' />
            </div>
            <audio
              ref={index === current ? audioRef : null}
              src={mediaUrl}
              className='hidden'
              onEnded={() => setIsPlaying(false)}
              muted={isMuted}
            />
            <div className='flex flex-col items-center gap-4'>
              <h3 className='text-center text-lg font-medium text-white'>
                {item.original_filename || 'Audio File'}
              </h3>
              <div className='flex items-center gap-2 rounded-full bg-black/50 px-6 py-3 backdrop-blur-sm'>
                <button
                  onClick={togglePlayPause}
                  className='rounded-full p-2 text-white transition-colors hover:bg-white/20'
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className='h-6 w-6' />
                  ) : (
                    <Play className='h-6 w-6' />
                  )}
                </button>
                <button
                  onClick={toggleMute}
                  className='rounded-full p-2 text-white transition-colors hover:bg-white/20'
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? (
                    <VolumeX className='h-6 w-6' />
                  ) : (
                    <Volume2 className='h-6 w-6' />
                  )}
                </button>
              </div>
            </div>
          </div>
        );

      case 'image':
      default:
        if (!mediaUrl) {
          return (
            <div className='flex h-full w-full items-center justify-center bg-gray-100'>
              <p className='text-gray-500'>Image unavailable</p>
            </div>
          );
        }
        // Use optimized Cloudinary URL for images - 85%+ bandwidth savings
        // Use context-aware sizing: smaller for archives (compactMode), larger for detail pages
        const imagePreset = compactMode ? 'cardLarge' : 'carousel';
        const optimizedUrl = getOptimizedImageUrl(item, imagePreset) || mediaUrl;
        return (
          <div className='relative h-full w-full'>
            <Image
              src={optimizedUrl}
              alt={item.original_filename || 'Portfolio image'}
              fill
              className={compactMode ? 'object-cover' : 'object-contain'}
              sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
              priority={index === 0}
              loading={index === 0 ? 'eager' : 'lazy'}
            />
          </div>
        );
    }
  };

  const getThumbnailContent = (item: CloudinaryResource) => {
    const mediaUrl = getValidUrl(item);

    if (item.resource_type === 'audio') {
      return (
        <div className='flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-700 to-gray-600'>
          <Music className='h-6 w-6 text-white/80' />
        </div>
      );
    }

    if (item.resource_type === 'video') {
      if (!mediaUrl) {
        return (
          <div className='flex h-full w-full items-center justify-center bg-gray-200'>
            <FileVideo className='h-6 w-6 text-gray-500' />
          </div>
        );
      }
      // Use video thumbnail instead of loading actual video - massive bandwidth savings
      const publicId = extractPublicId(mediaUrl);
      const thumbnailUrl = publicId
        ? getVideoThumbnailUrl(publicId, IMAGE_SIZES.thumbnail.width, IMAGE_SIZES.thumbnail.height)
        : null;

      if (thumbnailUrl) {
        return (
          <>
            <Image
              src={thumbnailUrl}
              alt={item.original_filename || 'Video thumbnail'}
              fill
              className='object-cover'
              sizes='80px'
            />
            <div className='absolute inset-0 flex items-center justify-center bg-black/30'>
              <Play className='h-6 w-6 text-white drop-shadow-lg' />
            </div>
          </>
        );
      }

      // Fallback to video element only if thumbnail generation fails
      return (
        <>
          <video
            className='h-full w-full object-cover'
            preload='none'
            playsInline
            muted
          >
            <source
              src={mediaUrl}
              type={item.format ? `video/${item.format}` : 'video/mp4'}
            />
          </video>
          <div className='absolute inset-0 flex items-center justify-center bg-black/30'>
            <Play className='h-6 w-6 text-white drop-shadow-lg' />
          </div>
        </>
      );
    }

    if (!mediaUrl) {
      return (
        <div className='flex h-full w-full items-center justify-center bg-gray-200'>
          <FileImage className='h-6 w-6 text-gray-500' />
        </div>
      );
    }

    // Use optimized thumbnail URL for images
    const optimizedThumbUrl = getOptimizedImageUrl(item, 'thumbnail') || mediaUrl;
    return (
      <Image
        src={optimizedThumbUrl}
        alt={item.original_filename || 'Image thumbnail'}
        fill
        className='object-cover'
        sizes='80px'
        loading='lazy'
      />
    );
  };

  if (!filteredMedia || filteredMedia.length === 0) {
    return (
      <div className='flex h-96 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50'>
        <p className='text-gray-500'>No media available</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'w-full',
        !showThumbnails && 'h-full',
        showThumbnails && 'space-y-4',
        className,
      )}
    >
      {/* Main Carousel */}
      <div
        className={cn(
          'relative',
          aspectRatio === 'auto' && !showThumbnails && 'h-full',
          compactMode && 'group',
        )}
      >
        <Carousel
          setApi={setApi}
          className={cn('w-full', aspectRatio === 'auto' && 'h-full')}
        >
          <CarouselContent className={aspectRatio === 'auto' ? 'h-full' : ''}>
            {filteredMedia.map((item, index) => (
              <CarouselItem
                key={`${item.public_id}-${index}`}
                className={aspectRatio === 'auto' ? 'h-full' : ''}
              >
                <div
                  className={cn(
                    'relative w-full overflow-hidden bg-gray-100',
                    aspectRatio === 'square' && 'aspect-square',
                    aspectRatio === 'video' && 'aspect-video',
                    aspectRatio === 'portrait' && 'aspect-[3/4]',
                    aspectRatio === 'auto' && 'h-full min-h-0',
                    !compactMode && 'rounded-lg',
                  )}
                >
                  {renderMediaContent(item, index)}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {showControls &&
            filteredMedia.length > 1 &&
            (compactMode ? (
              <>
                <CarouselPrevious className='left-0 rounded-tl-none rounded-bl-none rounded-tr-lg rounded-br-lg -translate-x-10 group-hover:translate-x-0 h-16 w-8 bg-black/40 backdrop-blur-sm border-0 text-white opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-black/60 text-white/60 hover:text-white' />
                <CarouselNext className='right-0 rounded-tr-none rounded-br-none rounded-tl-lg rounded-bl-lg translate-x-10 group-hover:translate-x-0 h-16 w-8 bg-black/40 backdrop-blur-sm border-0 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-black/60 text-white/60 hover:text-white' />
              </>
            ) : (
              <>
                <CarouselPrevious className='left-0 !opacity-100 !translate-x-0' />
                <CarouselNext className='right-0 !opacity-100 !translate-x-0' />
              </>
            ))}
        </Carousel>
      </div>

      {/* Thumbnail Navigation */}
      {showThumbnails && filteredMedia.length > 1 && (
        <div className='flex gap-2 overflow-x-auto py-2 px-1'>
          {filteredMedia.map((item, index) => (
            <button
              key={`thumb-${item.public_id}-${index}`}
              onClick={() => handleThumbnailClick(index)}
              className={cn(
                'relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border-2 transition-all',
                current === index
                  ? 'border-primary ring-2 ring-primary ring-offset-2'
                  : 'border-gray-200 opacity-70 hover:opacity-100',
              )}
              aria-label={`Go to media ${index + 1}`}
            >
              {getThumbnailContent(item)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
