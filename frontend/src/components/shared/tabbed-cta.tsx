'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { ArrowRight, Check } from 'lucide-react';
import NextLink from './next-link';

type TabButton = {
  title: string;
  href: string;
};

type CtaTabs = {
  id: string;
  title: string;
  content: string;
  button: TabButton;
};

interface TabbedCtaProps {
  data: CtaTabs[];
  footnote?: string;
}

export default function TabbedCta({ data, footnote }: TabbedCtaProps) {
  const defaultValue = data[0]?.id ?? 'professionals';

  return (
    <section className='py-16 lg:py-24'>
      <div className='container mx-auto px-4'>
        <div className='relative max-w-5xl mx-auto'>
          {/* Soft brand glow behind the card */}
          <div
            aria-hidden
            className='pointer-events-none absolute -inset-x-6 -top-8 -bottom-8 -z-10 opacity-60'
            style={{
              background:
                'radial-gradient(60% 60% at 15% 0%, hsl(var(--secondary) / 0.10) 0%, transparent 70%), radial-gradient(60% 60% at 100% 100%, hsl(var(--fourth) / 0.10) 0%, transparent 70%)',
            }}
          />

          <div className='rounded-3xl border border-border bg-white shadow-[0_24px_70px_-40px_hsl(var(--primary)/0.45)] overflow-hidden'>
            <Tabs defaultValue={defaultValue} className='w-full'>
              <div className='grid grid-cols-1 lg:grid-cols-12'>
                {/* Tab Navigation — branded side rail */}
                <div className='lg:col-span-4 bg-bluey/70 p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-border'>
                  <span className='inline-flex items-center gap-2 rounded-full bg-secondary/10 px-3 py-1 text-3sm font-semibold text-secondary mb-6'>
                    <span className='h-1.5 w-1.5 rounded-full bg-secondary' />
                    Ξεκίνα σήμερα
                  </span>
                  {footnote && (
                    <p className='text-body text-sm leading-relaxed mb-6'>
                      {footnote}
                    </p>
                  )}
                  <TabsList className='flex flex-col items-stretch h-auto p-0 bg-transparent gap-2'>
                    {data.map((tab) => (
                      <TabsTrigger
                        key={tab.id}
                        value={tab.id}
                        className='group justify-between text-md text-left px-4 py-4 rounded-xl bg-transparent border border-transparent shadow-none transition-all data-[state=active]:shadow-sm data-[state=active]:border-border data-[state=active]:bg-white data-[state=active]:text-primary'
                      >
                        <span className='font-semibold'>{tab.title}</span>
                        <ArrowRight className='w-4 h-4 opacity-0 -translate-x-1 transition-all group-data-[state=active]:opacity-100 group-data-[state=active]:translate-x-0' />
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                {/* Tab Content */}
                <div className='lg:col-span-8 p-6 lg:p-10'>
                  {data.map((tab) => (
                    <TabsContent
                      key={tab.id}
                      value={tab.id}
                      className='mt-0 focus-visible:outline-none data-[state=active]:animate-fade-in'
                    >
                      <div className='space-y-6'>
                        <h3 className='text-2xl font-bold text-dark'>
                          {tab.title}
                        </h3>
                        <p
                          className='text-body leading-relaxed [&_br]:hidden'
                          dangerouslySetInnerHTML={{ __html: tab.content }}
                        />
                        <div className='flex items-center gap-2 text-3sm text-secondary font-medium'>
                          <Check className='w-4 h-4' />
                          Δωρεάν εγγραφή — χωρίς κρυφά κόστη
                        </div>
                        <Button variant='submit' asChild size='lg'>
                          <NextLink
                            href={tab.button.href}
                            className='group inline-flex items-center gap-2'
                          >
                            {tab.button.title}
                            <ArrowRight className='w-4 h-4 transition-transform group-hover:translate-x-1' />
                          </NextLink>
                        </Button>
                      </div>
                    </TabsContent>
                  ))}
                </div>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </section>
  );
}
