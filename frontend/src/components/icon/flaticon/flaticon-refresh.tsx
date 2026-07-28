import React from 'react';

interface FlaticonRefreshProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  color?: string;
}

/**
 * Flaticon Refresh Icon
 * For subscription/payment refresh cycles
 */
export default function FlaticonRefresh({
  className = '',
  size = 24,
  color = 'currentColor',
  ...props
}: FlaticonRefreshProps) {
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
        <path d='M203.53125 290.15625A10.03125 10.03125 0 0 1 196.875 271.875A129.9375 129.9375 0 0 0 167.25 21.65625L179.4375 45.9375A10.03125 10.03125 0 1 1 161.53125 55.3125L140.625 14.4375A10.21875 10.21875 0 0 1 150 0A150 150 0 0 1 203.53125 290.15625zM159.375 285.84375A10.125 10.125 0 0 1 150 300A150 150 0 0 1 96.46875 9.84375A10.03125 10.03125 0 0 1 103.125 28.125A129.9375 129.9375 0 0 0 133.21875 278.8125L121.03125 254.53125A10.03125 10.03125 0 0 1 138.9375 245.15625L159.375 285.5625z' />
      </g>
    </svg>
  );
}
