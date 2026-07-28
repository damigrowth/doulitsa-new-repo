import React from 'react';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon name (should match the exported icon name) */
  name: string;
  /** Icon size in pixels or CSS unit */
  size?: number | string;
  /** Custom className */
  className?: string;
  /** Icon color (defaults to currentColor) */
  color?: string;
  /** Icon title for accessibility */
  title?: string;
}
