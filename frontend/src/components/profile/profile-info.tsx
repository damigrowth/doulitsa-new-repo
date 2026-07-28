import React from 'react';
import {
  Headphones,
  Calendar,
  Globe2,
  Phone,
  Mail,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/icon/brands';
import type { ProfileInfoProps } from '@/lib/types/components';
import ContactReveal from './contact-reveal';
import { StartChatDialog } from '@/components/messages/start-chat-dialog';
import { getYearsOfExperience } from '@/lib/utils/misc/experience';

/**
 * Modern ProfileInfo Component
 * Displays profile information sidebar with contact details and coverage areas
 */

export default function ProfileInfo({
  rate,
  coverage,
  commencement,
  experience,
  website,
  phone,
  viber,
  whatsapp,
  email,
  visibility,
  profileUserId,
  profileDisplayName,
}: ProfileInfoProps) {
  // Format website URL by removing protocol
  const formattedWebsite = website ? website.replace(/^https?:\/\//, '') : null;

  // Build coverage array from coverage data
  const covers: string[] = [];
  if (coverage?.online) covers.push('Online');
  if (coverage?.onbase) covers.push('Στην έδρα');
  if (coverage?.onsite) covers.push('Στον χώρο σας');

  // Get years of experience (prefer stored value, fallback to calculated)
  const yearsOfExperience = getYearsOfExperience(commencement, experience);

  return (
    <Card className='rounded-2xl bg-muted/60 border border-gray-100 shadow-sm'>
      {rate ? (
        <CardHeader className='pb-0'>
          <h3 className='text-2xl font-bold text-foreground'>
            {rate}€
            <span className='text-sm font-medium text-muted-foreground ml-1'>
              / ώρα
            </span>
          </h3>
        </CardHeader>
      ) : null}

      <CardContent className='space-y-0'>
        <div className=''>
          {/* Service Coverage */}
          {covers.length > 0 && (
            <div className='flex items-center justify-between py-5 border-b border-border'>
              <div className='flex items-center gap-2'>
                <Headphones className='h-4 w-4 text-third' />
                <span className='text-sm font-medium text-foreground'>
                  Εξυπηρετεί
                </span>
              </div>
              <div className='flex flex-wrap justify-end gap-1'>
                {covers.map((cover, index) => (
                  <Badge
                    key={index}
                    variant='muted'
                    className='rounded-full border-transparent bg-primary/10 text-primary text-sm font-semibold px-3 py-1'
                  >
                    {cover}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Years of Experience */}
          {yearsOfExperience !== null && commencement && (
            <div className='flex items-center justify-between py-5 border-b border-border'>
              <div className='flex items-center gap-2'>
                <Calendar className='h-4 w-4 text-third' />
                <span className='text-sm font-medium text-foreground'>
                  Έτη Εμπειρίας
                </span>
              </div>
              <span className='text-sm text-muted-foreground'>
                {yearsOfExperience} (από {commencement})
              </span>
            </div>
          )}

          {/* Website */}
          {formattedWebsite && (
            <div className='flex items-center justify-between py-5 border-b border-border'>
              <div className='flex items-center gap-2'>
                <Globe2 className='h-4 w-4 text-third' />
                <span className='text-sm font-medium text-foreground'>
                  Ιστοσελίδα
                </span>
              </div>
              <a
                href={website}
                target='_blank'
                rel='noopener noreferrer'
                className='inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline'
                title={formattedWebsite}
              >
                Επίσκεψη
                <ExternalLink className='h-3.5 w-3.5' />
              </a>
            </div>
          )}

          {/* Phone - always shown when a phone exists */}
          {phone && (
            <div className='flex items-center justify-between py-5 border-b border-border'>
              <div className='flex items-center gap-2'>
                <Phone className='h-4 w-4 text-third' />
                <span className='text-sm font-medium text-foreground'>
                  Τηλέφωνο
                </span>
              </div>
              <div className='flex items-center gap-2'>
                {/* Social links */}
                {viber && (
                  <a
                    href={`viber://chat/?number=%2B30${String(viber).replace(/\D/g, '')}`}
                    title={`Viber: ${viber}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-[#665CAC] hover:opacity-80 transition-opacity'
                  >
                    <Icon name='viber' size={18} color='#665CAC' />
                  </a>
                )}
                {whatsapp && (
                  <a
                    href={`whatsapp://send?phone=%2B30${String(whatsapp).replace(/\D/g, '')}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    title={`WhatsApp: ${whatsapp}`}
                    className='text-[#25D366] hover:opacity-80 transition-opacity'
                  >
                    <Icon name='whatsapp' size={18} color='#25D366' />
                  </a>
                )}

                {/* Phone reveal/display */}
                <ContactReveal type='phone' value={phone} />
              </div>
            </div>
          )}

          {/* Email - only show if visibility allows and email exists */}
          {email && visibility?.email === true && (
            <div className='flex items-center justify-between py-5 border-b border-border'>
              <div className='flex items-center gap-2'>
                <Mail className='h-4 w-4 text-third' />
                <span className='text-sm font-medium text-foreground'>
                  Email
                </span>
              </div>
              <ContactReveal type='email' value={email} />
            </div>
          )}
        </div>

        {/* Contact Button */}
        {profileUserId && profileDisplayName && (
          <div className='pt-6'>
            <StartChatDialog
              recipientId={profileUserId}
              recipientName={profileDisplayName}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
