import React from 'react';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import {
  buildCloudinaryUrl,
  extractPublicId,
} from '@/lib/utils/cloudinary';

type HeroData = {
  title: string;
  description: string;
};

type DecorativeImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  animated?: boolean;
};

type Props = {
  data: HeroData;
  backgroundImage?: string;
  backgroundColor?: string;
  decorativeImages?: DecorativeImage[];
  buttonConfig?: {
    text: string;
    href: string;
    icon?: React.ReactNode | string;
  };
  className?: string;
  contentClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
};

const getImagePositionClasses = (position: DecorativeImage['position']) => {
  switch (position) {
    case 'top-left':
      return 'absolute left-0 top-0';
    case 'top-right':
      return 'absolute right-0 top-0';
    case 'bottom-left':
      return 'absolute left-0 bottom-0';
    case 'bottom-right':
      return 'absolute right-0 bottom-0';
    default:
      return 'absolute left-0 top-0';
  }
};

const getIconComponent = (icon: React.ReactNode | string | undefined) => {
  if (typeof icon === 'string') {
    switch (icon) {
      case 'ArrowRight':
        return <ArrowRight className='w-4 h-4' />;
      default:
        return null;
    }
  }
  return icon;
};

export default function HeroBanner({
  data,
  backgroundImage = 'https://res.cloudinary.com/ddejhvzbf/image/upload/v1750251218/Static/cta-about-banner_brm1gg.webp',
  backgroundColor,
  decorativeImages,
  buttonConfig,
  className = '',
  contentClassName = '',
  titleClassName = 'text-3xl md:text-[2.6rem] md:leading-[1.1]',
  descriptionClassName = 'text-base md:text-lg',
}: Props) {
  // Optimize background image
  const optimizedBgImage = React.useMemo(() => {
    if (!backgroundImage) return null;
    const publicId = extractPublicId(backgroundImage);
    return publicId
      ? buildCloudinaryUrl(publicId, {
          width: 1200,
          height: 675,
          crop: 'limit',
          quality: 'auto:good',
          format: 'auto',
          dpr: 'auto',
        })
      : backgroundImage;
  }, [backgroundImage]);

  // Optimize decorative images
  const optimizedDecorativeImages = React.useMemo(() => {
    if (!decorativeImages) return [];
    return decorativeImages.map((image) => {
      const publicId = extractPublicId(image.src);
      return {
        ...image,
        src: publicId
          ? buildCloudinaryUrl(publicId, {
              width: image.width,
              height: image.height,
              crop: 'limit',
              quality: 'auto:good',
              format: 'auto',
              dpr: 'auto',
            })
          : image.src,
      };
    });
  }, [decorativeImages]);

  // Determine container classes based on whether we're using background image or color
  const usingColor = Boolean(backgroundColor);
  const containerClasses = usingColor
    ? `${backgroundColor} px-5 lg:px-20`
    : '';

  return (
    <section
      className={`mt-16 lg:mt-20 pt-14 px-4 lg:px-6 pb-6 ${className}`}
    >
      <div
        className={`max-w-5xl mx-auto rounded-3xl relative flex items-center overflow-hidden min-h-[20rem] py-12 shadow-[0_20px_60px_-25px_hsl(var(--primary)/0.6)] ${containerClasses}`}
      >
        {/* Background Image (only if no backgroundColor) */}
        {!usingColor && optimizedBgImage && (
          <Image
            src={optimizedBgImage}
            alt='Banner background'
            fill
            className='object-cover rounded-3xl'
            priority
          />
        )}

        {/* Brand mesh gradient + glow (only on color variant for a premium look) */}
        {usingColor && (
          <>
            <div
              aria-hidden
              className='pointer-events-none absolute inset-0 opacity-90'
              style={{
                background:
                  'radial-gradient(120% 120% at 100% 0%, hsl(var(--secondary) / 0.55) 0%, transparent 45%), radial-gradient(120% 120% at 0% 100%, hsl(var(--fourth) / 0.35) 0%, transparent 50%)',
              }}
            />
            {/* Glow orbs */}
            <div
              aria-hidden
              className='pointer-events-none absolute -top-16 -right-10 h-56 w-56 rounded-full bg-fourth/30 blur-3xl'
            />
            <div
              aria-hidden
              className='pointer-events-none absolute -bottom-20 left-1/4 h-52 w-52 rounded-full bg-secondary/30 blur-3xl'
            />
            {/* Subtle grid texture */}
            <div
              aria-hidden
              className='pointer-events-none absolute inset-0 opacity-[0.12]'
              style={{
                backgroundImage:
                  'linear-gradient(hsl(var(--primary-foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary-foreground)) 1px, transparent 1px)',
                backgroundSize: '44px 44px',
                maskImage:
                  'radial-gradient(circle at 30% 30%, black, transparent 70%)',
              }}
            />
          </>
        )}

        {/* Decorative Images */}
        {optimizedDecorativeImages.map((image, index) => (
          <Image
            key={index}
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            className={`z-[1] drop-shadow-xl ${getImagePositionClasses(image.position)} ${
              image.animated
                ? `${index === 0 ? 'animate-bounce-left' : 'animate-bounce-right'}`
                : ''
            }`}
          />
        ))}

        {/* Content */}
        <div
          className={`container mx-auto px-4 relative z-10 ${contentClassName}`}
        >
          <div className='w-full xl:w-7/12 max-w-2xl'>
            <h1
              className={`text-white font-bold mb-4 md:mb-6 tracking-tight [text-wrap:balance] ${titleClassName}`}
            >
              {data.title}
            </h1>
            <p
              className={`text-white/90 mb-8 leading-relaxed max-w-xl ${descriptionClassName}`}
            >
              {data.description}
            </p>
            {buttonConfig && (
              <a
                href={buttonConfig.href}
                className='group inline-flex items-center gap-2 bg-white text-primary px-7 py-3.5 rounded-xl font-semibold shadow-lg shadow-black/10 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300'
              >
                {buttonConfig.text}
                <span className='transition-transform duration-300 group-hover:translate-x-1'>
                  {getIconComponent(buttonConfig.icon)}
                </span>
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
