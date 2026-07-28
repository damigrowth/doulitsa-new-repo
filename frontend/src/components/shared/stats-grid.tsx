import React from 'react';
import Image from 'next/image';
import NextLink from './next-link';
import { Button } from '@/components/ui/button';
import { ArrowRightLong } from '@/components/icon/fa';
import { buildCloudinaryUrl, extractPublicId } from '@/lib/utils/cloudinary';

type StatItem = {
  value: string;
  label: string;
  suffix: string;
};

type CommunityData = {
  content: {
    title: string;
    description: string;
    buttonText: string;
    buttonLink: string;
  };
  list: StatItem[];
  images: {
    leftTop: string;
    rightBottom: string;
  };
};

type Props = {
  data: CommunityData;
};

export default function StatsGrid({ data }: Props) {
  // Optimize decorative images
  const leftTopUrl = (() => {
    const publicId = extractPublicId(data.images.leftTop);
    return publicId
      ? buildCloudinaryUrl(publicId, {
          width: 198,
          height: 226,
          crop: 'limit', // Don't crop or upscale, just optimize
          quality: 'auto:good',
          format: 'auto',
          dpr: 'auto',
        })
      : data.images.leftTop;
  })();

  const rightBottomUrl = (() => {
    const publicId = extractPublicId(data.images.rightBottom);
    return publicId
      ? buildCloudinaryUrl(publicId, {
          width: 255,
          height: 181,
          crop: 'limit',
          quality: 'auto:good',
          format: 'auto',
          dpr: 'auto',
        })
      : data.images.rightBottom;
  })();

  return (
    <section className='bg-silver overflow-hidden max-w-4xl mx-auto rounded relative'>
      {/* Decorative Images */}
      <Image
        height={226}
        width={198}
        className='absolute -left-16 top-0 hidden lg:block'
        src={leftTopUrl}
        alt='object'
      />
      <Image
        height={181}
        width={255}
        className='absolute right-0 -bottom-12 hidden lg:block'
        src={rightBottomUrl}
        alt='object'
      />

      <div className='container mx-auto px-4 py-32'>
        <div className='grid lg:grid-cols-12 gap-8 items-center'>
          {/* Left Content Section */}
          <div className='lg:col-span-4 lg:col-start-2 mb-8 lg:mb-0'>
            <div className='space-y-6'>
              <h2 className='text-2xl lg:text-3xl font-bold text-dark leading-tight mb-6'>
                {data.content.title}
              </h2>
              <p className='text-primary text-sm leading-relaxed mb-6'>
                {data.content.description}
              </p>
              <Button
                asChild
                className='bg-fourth hover:bg-primary text-white border-2 border-fourth hover:border-primary transition-all duration-300 px-6 py-3 rounded font-medium'
              >
                <NextLink
                  href={data.content.buttonLink}
                  className='inline-flex items-center gap-2'
                >
                  {data.content.buttonText}
                  <ArrowRightLong className='h-4 w-4' />
                </NextLink>
              </Button>
            </div>
          </div>

          {/* Right Stats Section */}
          <div className='lg:col-span-6 lg:col-start-7'>
            <div className='flex flex-col sm:flex-row gap-6 items-center justify-center'>
              {/* First Column */}
              <div className='flex flex-col gap-6'>
                {/* First stat */}
                <div className='bg-card rounded-2xl p-8 text-center shadow-sm w-60 h-60 flex flex-col justify-center'>
                  <div className='flex items-baseline justify-center gap-1 mb-4'>
                    <div className='text-4xl lg:text-5xl font-bold text-dark leading-none'>
                      {data.list[0].value}
                    </div>
                    <span className='text-4xl lg:text-5xl font-bold text-dark leading-none'>
                      {data.list[0].suffix}
                    </span>
                  </div>
                  <p className='text-sm text-body leading-relaxed'>
                    {data.list[0].label}
                  </p>
                </div>

                {/* Second stat */}
                <div className='bg-card rounded-2xl p-8 text-center shadow-sm w-60 h-60 flex flex-col justify-center'>
                  <div className='flex items-baseline justify-center gap-1 mb-4'>
                    <div className='text-4xl lg:text-5xl font-bold text-dark leading-none'>
                      {data.list[1].value}
                    </div>
                    <span className='text-4xl lg:text-5xl font-bold text-dark leading-none'>
                      {data.list[1].suffix}
                    </span>
                  </div>
                  <p className='text-sm text-body leading-relaxed'>
                    {data.list[1].label}
                  </p>
                </div>
              </div>

              {/* Second Column */}
              <div className='flex items-center justify-center'>
                <div className='bg-card rounded-2xl p-8 text-center shadow-sm w-60 h-60 flex flex-col justify-center'>
                  <div className='mb-4'>
                    <div className='text-4xl lg:text-5xl font-bold text-dark leading-none'>
                      {data.list[2].value}
                    </div>
                  </div>
                  <p className='text-sm text-body leading-relaxed'>
                    {data.list[2].label}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
