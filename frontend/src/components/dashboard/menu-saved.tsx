import NextLink from '@/components/shared/next-link';
import { Heart } from 'lucide-react';

export default function SavedMenu() {
  return (
    <div className='hidden sm:flex'>
      <NextLink
        href='/dashboard/saved'
        className='text-center mr-1 flex'
        style={{ color: '#122f5e' }}
      >
        <Heart className='w-5 h-5 flex' />
      </NextLink>
    </div>
  );
}
