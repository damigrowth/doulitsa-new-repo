import React from 'react';
import Image from 'next/image';
import { Search, MessageCircle, Shield } from 'lucide-react';
import { buildCloudinaryUrl, extractPublicId } from '@/lib/utils/cloudinary';

type StepItem = {
  icon: string;
  title: string;
  description: string;
};

type ProcessData = {
  image: string;
  title: string;
  subtitle: string;
  list: StepItem[];
};

type Props = {
  data: ProcessData;
};

const iconMap = {
  'flaticon-cv': Search,
  'flaticon-web-design': MessageCircle,
  'flaticon-secure': Shield,
};

export default function ProcessSteps({ data }: Props) {
  // Optimize image to exact 701x701 dimensions
  const optimizedImage = (() => {
    const publicId = extractPublicId(data.image);
    return publicId
      ? buildCloudinaryUrl(publicId, {
          width: 701,
          height: 701,
          crop: 'fill',
          quality: 'auto:good',
          format: 'auto',
          dpr: 'auto',
        })
      : data.image;
  })();

  return (
    <section className='relative mx-auto max-w-4xl h-[900px] flex items-center lg:px-5 lg:pt-15 lg:pb-15 '>
      {/* Background pseudo-element equivalent - matches .cta-banner-about2:before */}
      <div className='absolute inset-y-0 left-0 w-[71%] bg-bluey rounded-lg lg:rounded-none' />

      {/* Background Image - hidden on mobile, visible on xl+ */}
      <div className='hidden xl:flex absolute inset-y-0 right-0 items-center'>
        <Image
          height={701}
          width={701}
          src={optimizedImage}
          alt='process steps'
        />
      </div>

      <div className='container mx-auto px-6 relative z-10'>
        <div className='flex flex-wrap'>
          <div className='w-full md:w-11/12'>
            <div className='mb-16'>
              <h2 className='title text-xl lg:text-2xl font-bold capitalize mb-4 text-dark'>
                {data.title}
              </h2>
              <p className='text-body leading-relaxed'>{data.subtitle}</p>
            </div>
          </div>
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4'>
          {data.list.map((step, index) => {
            const IconComponent =
              iconMap[step.icon as keyof typeof iconMap] || Search;
            return (
              <div
                key={index}
                className='bg-white p-4 rounded-xl shadow-sm relative mb-6'
              >
                <IconComponent className='text-primary text-3xl mb-4 block' />
                <h4 className='text-dark font-semibold text-lg mt-5 mb-2'>
                  {step.title}
                </h4>
                <p className='text-body leading-relaxed mb-0'>
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
