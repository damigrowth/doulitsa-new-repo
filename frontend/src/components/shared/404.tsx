import React from 'react';
import Image from 'next/image';
import {
  buildCloudinaryUrl,
  extractPublicId,
} from '@/lib/utils/cloudinary';
// import LinkNP from '@/components/link';
// import { ArrowRightLong } from '@/components/icon/fa';

export default function Four0Four() {
  const errorImageUrl = React.useMemo(() => {
    const url =
      'https://res.cloudinary.com/ddejhvzbf/image/upload/v1750081347/Static/error-page-img_rr1uvk.svg';
    const publicId = extractPublicId(url);
    return publicId
      ? buildCloudinaryUrl(publicId, {
          width: 300,
          height: 300,
          crop: 'limit',
          quality: 'auto:good',
          format: 'auto',
          dpr: 'auto',
        })
      : url;
  }, []);

  return (
    <>
      <section className='our-error'>
        <div className='container'>
          <div className='row align-items-center'>
            <div className='col-xl-6 wow fadeInRight' data-wow-delay='300ms'>
              <div className='animate_content text-center text-xl-start'>
                <div className='animate_thumb'>
                  <Image
                    height={300}
                    width={300}
                    className='w-100'
                    src={errorImageUrl}
                    alt='error-page-img'
                  />
                </div>
              </div>
            </div>
            <div
              className='col-xl-5 offset-xl-1 wow fadeInLeft'
              data-wow-delay='300ms'
            >
              <div className='error_page_content text-center text-xl-start'>
                <div className='erro_code'>
                  40<span className='text-thm'>4</span>
                </div>
                <div className='h2 error_title'>
                  Ουπς! Η σελίδα που ψάχνεις δεν υπάρχει.
                </div>
                <p className='text fz15 mb20'>
                  Η σελίδα δεν είναι διαθέσιμη. Προσπάθησε να κάνεις διαφορετική
                  αναζήτηση ή χρησιμοποίησε το κουμπί πίσω στην Αρχική{' '}
                  <br className='d-none d-lg-block' />
                </p>
                {/* <LinkNP href='/' className='ud-btn btn-thm'> */}
                Πίσω στην Αρχική
                {/* <ArrowRightLong /> */}
                {/* </LinkNP> */}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
