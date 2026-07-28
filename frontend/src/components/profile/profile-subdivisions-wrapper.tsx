'use client';

import React from 'react';

interface ServiceSubdivisionsBadgesProps {
  children: React.ReactNode;
}

export default function ProfileSubdivisionsWrapper({
  children,
}: ServiceSubdivisionsBadgesProps) {
  const handleClick = () => {
    const servicesSection = document.getElementById('services');
    if (servicesSection) {
      servicesSection.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  return (
    <div onClick={handleClick}>
      {children}
    </div>
  );
}
