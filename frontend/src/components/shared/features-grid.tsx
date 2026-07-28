import React from 'react';
import Image from 'next/image';
import { Star, Euro, Shield, LayoutDashboard } from 'lucide-react';
import { buildCloudinaryUrl, extractPublicId } from '@/lib/utils/cloudinary';

type FeatureItem = {
  title: string;
  desc: string;
  icon: string;
};

type FeaturesData = {
  title: string;
  subtitle?: string;
  image: string;
  alt: string;
  list: FeatureItem[];
};

type Props = {
  data: FeaturesData;
};

const iconMap = {
  'flaticon-badge': Star,
  'flaticon-wallet': Euro,
  'flaticon-security': Shield,
  'flaticon-dashboard': LayoutDashboard,
};

export default function FeaturesGrid({ data }: Props) {
  // Optimize image with crop: 'limit' to preserve aspect ratio
  // (image changes from 4:3 on mobile to square on desktop)
  const optimizedImageUrl = (() => {
    const publicId = extractPublicId(data.image);
    return publicId
      ? buildCloudinaryUrl(publicId, {
          width: 600,
          height: 600,
          crop: 'limit', // Preserve aspect ratio, don't upscale
          quality: 'auto:good',
          format: 'auto',
          dpr: 'auto',
        })
      : data.image;
  })();

  return (
    <section className='py-16 lg:py-24 bg-background'>
      <div className='container mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='grid lg:grid-cols-2 gap-12 lg:gap-16 items-center'>
          {/* Content Section */}
          <div className='order-2 lg:order-1'>
            <h2 className='text-2xl lg:text-3xl font-bold text-dark mb-6 leading-tight tracking-tight'>
              {data.title}
            </h2>
            {data.subtitle && (
              <p className='text-lg text-body mb-8 leading-relaxed'>
                {data.subtitle}
              </p>
            )}

            <div className='space-y-4'>
              {data.list.map((feature, index) => {
                const IconComponent =
                  iconMap[feature.icon as keyof typeof iconMap] || Star;
                return (
                  <div
                    key={index}
                    className='group flex gap-4 rounded-2xl border border-transparent p-4 -mx-4 transition-all duration-300 hover:border-border hover:bg-bluey/50 hover:shadow-sm'
                  >
                    <div className='flex-shrink-0 w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center transition-colors duration-300 group-hover:bg-secondary'>
                      <IconComponent className='w-6 h-6 text-secondary transition-colors duration-300 group-hover:text-white' />
                    </div>
                    <div className='flex-1'>
                      <h4 className='text-lg font-semibold text-dark mb-1'>
                        {feature.title}
                      </h4>
                      <p className='text-base text-body leading-relaxed'>
                        {feature.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Image Section */}
          <div className='order-1 lg:order-2'>
            <div className='relative'>
              {/* Decorative gradient frame */}
              <div
                aria-hidden
                className='absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-secondary/20 via-fourth/10 to-transparent blur-xl'
              />
              <div className='relative'>
                <Image
                  src={optimizedImageUrl}
                  alt={data.alt}
                  width={600}
                  height={600}
                  className='w-full h-auto rounded-[1.75rem] shadow-2xl object-cover aspect-[4/3] lg:aspect-square ring-1 ring-black/5'
                  loading='lazy'
                />
                <div className='absolute inset-0 rounded-[1.75rem] bg-gradient-to-t from-primary/20 to-transparent pointer-events-none' />

                {/* Floating rating badge — WOW detail */}
                <div className='absolute -bottom-5 -left-4 sm:-left-6 flex items-center gap-3 rounded-2xl bg-white/90 backdrop-blur px-4 py-3 shadow-xl ring-1 ring-black/5'>
                  <span className='flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-secondary to-fourth text-white'>
                    <Star className='h-5 w-5 fill-white' />
                  </span>
                  <div className='leading-tight'>
                    <p className='text-sm font-bold text-dark'>4.8/5 βαθμολογία ικανοποίησης</p>
                    <p className='text-3sm text-body'>από τους επαγγελματίες</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
