import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AudioGalleryProps {
  audioFiles: AppJson.CloudinaryResource[];
  className?: string;
}

export default function AudioGallery({
  audioFiles,
  className,
}: AudioGalleryProps) {
  if (!audioFiles || audioFiles.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className='pb-4'>
        <CardTitle className='font-bold text-foreground mb-2'>
          Αρχεία Ήχου
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {audioFiles.map((audioFile, index) => (
          <div key={`audio-${audioFile.public_id}-${index}`}>
            <div className='flex-grow min-w-0'>
              <h4 className='font-normal text-sm truncate'>
                {audioFile.original_filename || `Audio ${index + 1}`}
              </h4>
              <audio controls className='w-full mt-2' preload='metadata'>
                <source src={audioFile.secure_url || audioFile.url} />
                Your browser does not support the audio element.
              </audio>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
