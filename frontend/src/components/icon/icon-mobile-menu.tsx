import React from 'react';

export default function IconMobileMenu({
  className = '',
  width = 24,
  height = 24,
  strokeWidth = 2,
  color = 'currentColor',
  ...props
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox='0 0 24 24'
      fill='none'
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap='round'
      strokeLinejoin='round'
      className={className}
      aria-label='Mobile menu'
      role='img'
      {...props}
    >
      <line x1='3' y1='5' x2='21' y2='5' />
      <line x1='3' y1='12' x2='21' y2='12' />
      <line x1='7' y1='19' x2='21' y2='19' />
    </svg>
  );
}
