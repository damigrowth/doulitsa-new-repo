import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight } from 'lucide-react';
import NextLink from './next-link';
import { getOptimizedImageUrl } from '@/lib/utils/cloudinary';

type ContentData = {
  heading: string;
  description: string;
  image: string;
  list: string[];
  button: {
    text: string;
    link: string;
  };
};

type Props = {
  data: ContentData;
};

export default function ContentHero({ data }: Props) {
  return (
    <section className='pb-0 pt-10 lg:pt-28'>
      <div className='container mx-auto px-4 lg:px-5'>
        <div className='flex flex-col md:flex-row items-center'>
          <div className='w-full md:w-1/2 mb-8 sm:mb-8'>
            <Image
              src={
                getOptimizedImageUrl(data.image, 'cardLarge') || data.image
              }
              alt='content hero'
              width={600}
              height={400}
              className='w-full h-full object-cover'
            />
          </div>

          <div className='w-full md:w-1/2 xl:w-5/12 xl:ml-auto'>
            <h2 className='mb-6 text-2xl font-bold text-gray-800'>
              {data.heading}
            </h2>

            <p className='mb-6 text-gray-600'>{data.description}</p>

            <ul className='mb-5 space-y-5'>
              {data.list.map((item, index) => (
                <li
                  key={index}
                  className='flex items-center text-gray-800 font-normal'
                >
                  <CheckCircle className='h-5 w-5 text-green-500 mr-3 flex-shrink-0' />
                  {item}
                </li>
              ))}
            </ul>

            <Button
              asChild
              variant='outline'
              className='mt-6 border-fourth text-fourth hover:bg-fourth hover:text-white'
            >
              <NextLink href={data.button.link} className='flex items-center gap-2'>
                {data.button.text}
                <ArrowRight className='h-4 w-4' />
              </NextLink>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
