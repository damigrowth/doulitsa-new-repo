import React from 'react';
import CookieSettingsButton from '@/components/consent/cookie-settings-button';
import Image from 'next/image';
import NextLink from '@/components/shared/next-link';

import {
  accountLinks,
  firstColumnLinks,
  legalLinks,
  proLinks,
  secondColumnLinks,
} from '@/constants/datasets/footer';

import Socials from '@/components/icon/socials';

export default function Footer() {
  return (
    <footer className='bg-dark pb-0 pt-[60px]'>
      <div className='container mx-auto px-4'>
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
          <div className='lg:col-span-6'>
            <div className='footer-widget mb-4 lg:mb-5'>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-8 justify-between'>
                <div>
                  <div className='link-style1 mb-3'>
                    <h3 className='mb-3 text-white font-semibold text-base'>
                      <NextLink
                        href={'/about'}
                        className='text-white hover:text-green-400 transition-colors'
                      >
                        Σχετικά
                      </NextLink>
                    </h3>
                    <div className='link-list space-y-2'>
                      {firstColumnLinks.map((item, i) => (
                        <NextLink
                          key={i}
                          href={`/${item.slug}`}
                          className='block text-gray-300 hover:text-white transition-colors'
                        >
                          {item.title}
                        </NextLink>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <div className='link-style1 mb-3'>
                    <h3 className='mb-3 text-white font-semibold text-base'>
                      <NextLink
                        href={'/categories'}
                        className='text-white hover:text-green-400 transition-colors'
                      >
                        Υπηρεσίες
                      </NextLink>
                    </h3>
                    <ul className='ps-0 space-y-2 list-none'>
                      {secondColumnLinks.map((item, i) => (
                        <li key={i}>
                          <NextLink
                            href={`/categories/${item.slug}`}
                            className='text-gray-300 hover:text-white transition-colors'
                          >
                            {item.label}
                          </NextLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div>
                  <div className='link-style1 mb-3'>
                    <h3 className='mb-3 text-white font-semibold text-base'>
                      <NextLink
                        href={'/dashboard'}
                        className='text-white hover:text-green-400 transition-colors'
                      >
                        Ο Λογαριασμός μου
                      </NextLink>
                    </h3>
                    <ul className='ps-0 space-y-2 list-none'>
                      {accountLinks.map((item, i) => (
                        <li key={i}>
                          <NextLink
                            href={item.slug}
                            className='text-gray-300 hover:text-white transition-colors'
                          >
                            {item.label}
                          </NextLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className='link-style1 mb-3 pt-3'>
                    <h3 className='text-white mb-3 font-semibold text-base'>
                      Επαγγελματικά Προφίλ
                    </h3>
                    <ul className='ps-0 space-y-2 list-none'>
                      {proLinks.map((item, i) => (
                        <li key={i}>
                          <NextLink
                            href={item.slug}
                            className='text-gray-300 hover:text-white transition-colors'
                          >
                            {item.label}
                          </NextLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className='lg:col-span-4 lg:col-start-9'>
            <div className='footer-widget mb-4 lg:mb-5'>
              <NextLink className='inline-block' href='/'>
                <Image
                  height={56}
                  width={180}
                  className='h-auto w-[180px]'
                  src='/doulitsa-logo.svg'
                  alt='Doulitsa logo'
                />
              </NextLink>
              <p className='mt-3 mb-8 lg:mb-10 text-lg font-bold text-white'>
                ... και κάνεις τη δουλειά σου!
              </p>
              <Socials />
            </div>
          </div>
        </div>
      </div>
      <div className='container mx-auto px-4 border-t border-white/10 py-4'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='text-center sm:text-left'>
            <p className='copyright-text mb-0 text-gray-400 font-heading'>
              © Doulitsa 2026 All rights reserved.
            </p>
          </div>
          <div className='flex flex-wrap justify-center gap-x-4 gap-y-1 sm:justify-end'>
            {legalLinks.map((item, i) => (
              <NextLink
                key={i}
                href={`/${item.slug}`}
                className='text-gray-400 font-heading hover:text-white transition-colors'
              >
                {item.label}
              </NextLink>
            ))}
            {/* Re-opens the cookie preferences modal (consent withdrawal). */}
            <CookieSettingsButton />
          </div>
        </div>
      </div>
    </footer>
  );
}
