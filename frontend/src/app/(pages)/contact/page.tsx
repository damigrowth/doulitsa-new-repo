import { Phone, Mail } from 'lucide-react';
import { ContactForm } from '@/components/forms';
import { getContactMetadata } from '@/lib/seo/pages';
import HeroBanner from '@/components/shared/hero-banner';
import FaqSection from '@/components/shared/faq-section';
import { data } from '@/constants/datasets/contact';

export async function generateMetadata() {
  return getContactMetadata();
}

export default function ContactPage() {
  const { contact, faq } = data;

  const siteKey = process.env.RECAPTCHA_SITE_KEY;

  return (
    <>
      <HeroBanner data={data.banner} />

      <section>
        <div className='container mx-auto px-4 mb-0 lg:mb-28'>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
            {/* Contact Information */}
            <div className='mt-10'>
              <div className='mb-10'>
                <h4 className='text-xl font-semibold mb-6 text-foreground'>
                  {contact.title}
                </h4>
                <p className='text-body'>{contact.description}</p>
              </div>

              {/* Phone Contact */}
              <div className='flex items-start mb-8'>
                <div className="relative inline-block text-primary z-10 mr-8 flex-shrink-0 before:content-[''] before:bg-orangy before:rounded-full before:absolute before:-bottom-2.5 before:-right-5 before:h-10 before:w-10 before:-z-10">
                  <Phone size={32} />
                </div>
                <div>
                  <h5 className='text-lg font-medium mb-1 text-foreground'>
                    {contact.phone.title}
                  </h5>
                  <p className='text-body mb-0'>{contact.phone.number}</p>
                </div>
              </div>

              {/* Email Contact */}
              <div className='flex items-start mb-8'>
                <div className="relative inline-block text-primary z-10 mr-8 flex-shrink-0 before:content-[''] before:bg-orangy before:rounded-full before:absolute before:-bottom-2.5 before:-right-5 before:h-10 before:w-10 before:-z-10">
                  <Mail size={32} />
                </div>
                <div>
                  <h5 className='text-lg font-medium mb-1 text-foreground'>
                    {contact.email.title}
                  </h5>
                  <p
                    className='text-body mb-0 break-words'
                    style={{ lineBreak: 'anywhere' }}
                  >
                    {contact.email.address}
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className='relative'>
              <ContactForm formData={contact.form} siteKey={siteKey} />
            </div>
          </div>
        </div>
      </section>

      <FaqSection data={faq} />
    </>
  );
}
