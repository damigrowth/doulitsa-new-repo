import React from 'react';
import { ArrowRight } from 'lucide-react';
import NextLink from './next-link';

type CtaData = {
  title: string;
  description?: string;
  button: {
    text: string;
    link: string;
  };
};

type Props = {
  data: CtaData;
};

export default function CtaBanner({ data }: Props) {
  return (
    <section className='px-4 lg:px-6 py-12 lg:py-16'>
      <div className='relative max-w-5xl mx-auto overflow-hidden rounded-3xl bg-primary px-6 py-12 sm:px-12 sm:py-16 text-center shadow-[0_24px_70px_-30px_hsl(var(--primary)/0.7)]'>
        {/* Brand mesh gradient */}
        <div
          aria-hidden
          className='pointer-events-none absolute inset-0 opacity-90'
          style={{
            background:
              'radial-gradient(120% 120% at 0% 0%, hsl(var(--secondary) / 0.5) 0%, transparent 45%), radial-gradient(120% 120% at 100% 100%, hsl(var(--fourth) / 0.35) 0%, transparent 50%)',
          }}
        />
        {/* Glow orbs */}
        <div
          aria-hidden
          className='pointer-events-none absolute -top-16 left-1/4 h-52 w-52 rounded-full bg-secondary/30 blur-3xl'
        />
        <div
          aria-hidden
          className='pointer-events-none absolute -bottom-20 right-1/4 h-52 w-52 rounded-full bg-fourth/30 blur-3xl'
        />
        {/* Subtle grid texture */}
        <div
          aria-hidden
          className='pointer-events-none absolute inset-0 opacity-[0.1]'
          style={{
            backgroundImage:
              'linear-gradient(hsl(var(--primary-foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary-foreground)) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage:
              'radial-gradient(circle at 50% 30%, black, transparent 70%)',
          }}
        />

        <div className='relative z-10 mx-auto max-w-2xl'>
          <h2 className='text-white text-2xl md:text-4xl font-bold tracking-tight [text-wrap:balance] mb-4'>
            {data.title}
          </h2>
          {data.description && (
            <p className='text-white/90 text-base md:text-lg leading-relaxed mb-8 mx-auto max-w-xl'>
              {data.description}
            </p>
          )}
          <NextLink
            href={data.button.link}
            className='group inline-flex items-center gap-2 bg-white text-primary px-7 py-3.5 rounded-xl font-semibold shadow-lg shadow-black/10 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300'
          >
            {data.button.text}
            <ArrowRight className='w-4 h-4 transition-transform duration-300 group-hover:translate-x-1' />
          </NextLink>
        </div>
      </div>
    </section>
  );
}
