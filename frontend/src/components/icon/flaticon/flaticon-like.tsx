import React from 'react';

interface FlaticonLikeProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  color?: string;
}

/**
 * Flaticon Like Icon
 * For like/favorite categories
 */
export default function FlaticonLike({
  className = '',
  size = 24,
  color = 'currentColor',
  ...props
}: FlaticonLikeProps) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 300 300'
      width={size}
      height={size}
      fill={color}
      className={className}
      aria-hidden='true'
      focusable='false'
      {...props}
    >
      <g transform='scale(1, -1) translate(0, -300)'>
        <path d='M150 15A42.28125 42.28125 0 0 0 117.09375 30.6562500000001L23.625 145.3125A82.03125 82.03125 0 1 0 150 249.0000000000001A83.0625 83.0625 0 0 0 159.9375 261.0000000000001A82.03125 82.03125 0 0 0 276.375 145.3125L182.625 30.6562500000001A42.1875 42.1875 0 0 0 150 15zM82.03125 265.03125A62.0625 62.0625 0 0 1 38.15625 159.375L38.8125 158.625L132.5625 43.5937500000001A23.15625 23.15625 0 0 1 167.34375 43.5937500000001L261.09375 158.6250000000001L261.75 159.3750000000001A62.0625 62.0625 0 1 1 159.375 223.6875000000001A10.03125 10.03125 0 0 0 140.625 223.6875000000001A62.0625 62.0625 0 0 1 82.03125 265.0312500000001z' />
      </g>
    </svg>
  );
}
