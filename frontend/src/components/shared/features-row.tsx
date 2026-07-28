import React from 'react';
import { FileText, Layout, Shield, Headphones } from 'lucide-react';

interface ProcessStep {
  icon: string;
  title: string;
  description: string;
}

interface ProcessStepsData {
  title: string;
  subtitle: string;
  image: string;
  list: ProcessStep[];
}

interface FeaturesRowProps {
  data: ProcessStepsData;
}

const iconMap = {
  'flaticon-cv': FileText,
  'flaticon-web-design': Layout,
  'flaticon-secure': Shield,
  'flaticon-customer-service': Headphones,
};

export default function FeaturesRow({ data }: FeaturesRowProps) {
  return (
    <section className='py-16 lg:py-24 bg-silver/60'>
      <div className='container mx-auto px-4'>
        {/* Header */}
        <div className='mb-14 max-w-2xl'>
          <span className='inline-flex items-center gap-2 rounded-full bg-secondary/10 px-3 py-1 text-3sm font-semibold text-secondary mb-4'>
            Πώς λειτουργεί
          </span>
          <h2 className='text-2xl lg:text-3xl font-bold text-dark mb-4 tracking-tight'>
            {data.title}
          </h2>
          <p className='text-body text-lg leading-relaxed'>{data.subtitle}</p>
        </div>

        {/* Steps */}
        <div className='relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'>
          {/* Connecting line (desktop) */}
          <div
            aria-hidden
            className='hidden lg:block absolute top-9 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-secondary/30 to-transparent'
          />

          {data.list.map((step, index) => {
            const IconComponent =
              iconMap[step.icon as keyof typeof iconMap] || FileText;

            return (
              <div
                key={index}
                className='group relative rounded-2xl border border-border bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-30px_hsl(var(--primary)/0.5)] hover:border-secondary/30'
              >
                {/* Step number */}
                <span className='absolute right-5 top-5 text-4xl font-bold leading-none text-primary/[0.06] select-none'>
                  {String(index + 1).padStart(2, '0')}
                </span>

                {/* Icon */}
                <div className='relative z-[1] mb-6 inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary to-fourth text-white shadow-lg shadow-secondary/25 transition-transform duration-300 group-hover:scale-105'>
                  <IconComponent size={28} />
                </div>

                {/* Content */}
                <div className='space-y-2'>
                  <h4 className='text-base font-semibold text-dark leading-tight'>
                    {step.title}
                  </h4>
                  <p className='text-body text-sm leading-relaxed'>
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
