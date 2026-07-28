import React from 'react';
import { Icon } from '@/components/icon/brands';

const socialLinks = [
  {
    name: 'instagram',
    label: 'Instagram',
    href: 'https://www.instagram.com/doulitsagr/',
  },
  {
    name: 'facebook',
    label: 'Facebook',
    href: 'https://www.facebook.com/doulitsa.gr',
  },
  {
    name: 'linkedin',
    label: 'Linkedin',
    href: 'https://www.linkedin.com/company/doulitsa',
  },
  {
    name: 'tiktok',
    label: 'TikTok',
    href: 'https://www.tiktok.com/@doulitsa',
  },
];

export default function Socials() {
  return (
    <div className='social-widget'>
      <div className='social-style1 flex items-center space-x-5'>
        {socialLinks.map((item) => (
          <a
            key={item.name}
            href={item.href}
            aria-label={item.label}
            className='text-white hover:text-green-400 transition-colors'
            target='_blank'
            rel='noopener noreferrer'
          >
            <Icon name={item.name} size={32} className='inline-block' />
          </a>
        ))}
      </div>
    </div>
  );
}
