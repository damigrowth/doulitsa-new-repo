import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { renderRichContent } from '@/lib/utils/formatting';
import React from 'react';

type ProfileBioProps = {
  bio: string | null;
  /** Skill labels, speciality first */
  skills?: string[];
};

export default function ProfileBio({ bio, skills = [] }: ProfileBioProps) {
  if (!bio && skills.length === 0) {
    return null;
  }

  return (
    <section>
      <Card className='rounded-2xl border-gray-100 shadow-sm'>
        <CardHeader className='pb-4'>
          <CardTitle className='text-lg font-semibold'>Σχετικά</CardTitle>
        </CardHeader>
        <CardContent className='space-y-6'>
          {bio && <div>{renderRichContent(bio)}</div>}

          {/* Skills - styled like the Tags section on the service page */}
          {skills.length > 0 && (
            <div className='pb-4'>
              <h6 className='text-sm font-semibold mb-3'>Δεξιότητες</h6>
              <div className='flex flex-wrap gap-1'>
                {skills.map((skill, index) => (
                  <Badge
                    key={index}
                    variant='outline'
                    className='inline-block text-sm font-medium mb-1.5 mr-1.5 py-1.5 px-3 text-center border border-gray-200 rounded-full text-body'
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
