import React from 'react';
import { cn } from '@/lib/utils';
import { iconsData } from './icons-data';
import type { IconProps } from './types';

/**
 * Icon component for rendering Simple Icons SVGs
 *
 * @example
 * // Basic usage
 * <Icon name="facebook" />
 *
 * @example
 * // With custom size and color
 * <Icon name="facebook" size={32} color="#1877F2" />
 *
 * @example
 * // With custom className and accessibility
 * <Icon name="facebook" className="hover:scale-110" title="Visit our Facebook" />
 */
export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  className,
  color = 'currentColor',
  title,
  ...props
}) => {
  const iconSize = typeof size === 'number' ? `${size}px` : size;
  const iconData = iconsData[name];

  if (!iconData) {
    // Fallback for missing icons
    return (
      <svg
        width={iconSize}
        height={iconSize}
        viewBox='0 0 24 24'
        fill='none'
        stroke={color}
        className={cn('flex-shrink-0', className)}
        role={title ? 'img' : 'presentation'}
        aria-label={title || `${name} icon (not found)`}
        {...props}
      >
        <rect x='2' y='2' width='20' height='20' rx='2' strokeWidth='2' />
        <path d='M8 12h8M12 8v8' strokeWidth='2' />
        <text x='12' y='16' textAnchor='middle' fontSize='10' fill={color}>
          ?
        </text>
      </svg>
    );
  }

  return (
    <svg
      role='img'
      viewBox='0 0 24 24'
      xmlns='http://www.w3.org/2000/svg'
      width={iconSize}
      height={iconSize}
      fill={color}
      className={cn('flex-shrink-0', className)}
      aria-label={title || iconData.title}
      {...props}
    >
      <path d={iconData.path} />
    </svg>
  );
};

export default Icon;
