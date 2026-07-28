'use client';

import React from 'react';
import Image from 'next/image';
import { Quote } from 'lucide-react';
import {
  buildCloudinaryUrl,
  extractPublicId,
} from '@/lib/utils/cloudinary';

type TestimonialItem = {
  id: string;
  title: string;
  text: string;
  author: {
    name: string;
    category: string;
    image: string;
  };
  active?: boolean;
};

type TestimonialsData = {
  title: string;
  subtitle: string;
  list: TestimonialItem[];
};

type Props = {
  data: TestimonialsData;
};

function TestimonialContent({ testimonial }: { testimonial: TestimonialItem }) {
  return (
    <div className='text-center'>
      <div className='mb-12'>
        <Quote className='text-secondary text-5xl mx-auto mb-11' />
        <h4 className='text-primary text-2xl font-bold font-sans leading-8 max-w-3xl mx-auto'>
          {testimonial.text}
        </h4>
      </div>
    </div>
  );
}

function TestimonialNav({ testimonials }: { testimonials: TestimonialItem[] }) {
  const activeIndex = testimonials.findIndex(t => t.active) || 1;
  const [currentIndex, setCurrentIndex] = React.useState(activeIndex);

  // Optimize testimonial images to exact display size (70×70px)
  const optimizedTestimonials = testimonials.map((testimonial) => {
    const publicId = extractPublicId(testimonial.author.image);
    return {
      ...testimonial,
      author: {
        ...testimonial.author,
        image: publicId
          ? buildCloudinaryUrl(publicId, {
              width: 70,
              height: 70,
              crop: 'fill',
              gravity: 'face',
              quality: 'auto:good',
              format: 'auto',
              dpr: 'auto',
            })
          : testimonial.author.image,
      },
    };
  });

  return (
    <div className='relative'>
      {/* Content Display */}
      <div className='mb-8'>
        {optimizedTestimonials.map((testimonial, index) => (
          <div
            key={testimonial.id}
            className={`${index === currentIndex ? 'block' : 'hidden'}`}
          >
            <TestimonialContent testimonial={testimonial} />
          </div>
        ))}
      </div>

      {/* Navigation Pills */}
      <nav className='flex justify-center flex-wrap gap-4'>
        {optimizedTestimonials.map((testimonial, index) => (
          <button
            key={testimonial.id}
            onClick={() => setCurrentIndex(index)}
            className={`flex items-center bg-white rounded-full px-6 py-3 border transition-all hover:shadow-sm ${
              index === currentIndex
                ? 'shadow-sm border-third'
                : 'border-border hover:border-gray-300'
            }`}
          >
            <Image
              height={70}
              width={70}
              className='h-18 w-18 object-cover rounded-full mr-8'
              src={testimonial.author.image}
              alt={testimonial.author.name}
            />
            <div className='text-left'>
              <h6 className='text-dark font-medium text-base mb-0 leading-tight'>
                {testimonial.author.name}
                <br />
                <small className='text-body text-sm font-normal'>
                  {testimonial.author.category}
                </small>
              </h6>
            </div>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function TestimonialsSection({ data }: Props) {
  return (
    <section className='py-20'>
      <div className='container mx-auto px-6'>
        <div className='flex flex-wrap items-center justify-center'>
          {/* Title Section */}
          <div className='w-full lg:w-1/2 mx-auto mb-16'>
            <div className='text-center'>
              <h2 className='title text-2xl lg:text-3xl font-bold mb-4 text-dark'>
                {data.title}
              </h2>
              <p className='paragraph text-body leading-relaxed mt-3'>
                {data.subtitle}
              </p>
            </div>
          </div>
        </div>

        <div className='flex justify-center'>
          <div className='w-full xl:w-5/6 mx-auto'>
            <TestimonialNav testimonials={data.list} />
          </div>
        </div>
      </div>
    </section>
  );
}