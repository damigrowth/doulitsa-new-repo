import React from 'react';
import MediaGallery from '../shared/media-gallery';

type Props = {
  media: AppJson.Media;
};

export default function ServiceMedia({ media }: Props) {
  return <MediaGallery media={media} title='Γκαλερί' showCards={true} />;
}
