import React from 'react';

interface PulsatingDotProps {
  color?: string;
  size?: number;
}

export const PulsatingDot: React.FC<PulsatingDotProps> = ({
  color = 'rgb(255, 152, 0)',
  size = 10,
}) => {
  return (
    <div className='relative' style={{ width: size, height: size }}>
      {/* Pulsating ring */}
      <div
        className='absolute animate-ping'
        style={{
          border: `3px solid ${color}`,
          borderRadius: '50%',
          height: size * 1.5,
          width: size * 1.5,
          left: -size / 3,
          top: -size / 3,
          opacity: 0.75,
        }}
      />
      {/* Static circle */}
      <div
        className='absolute rounded-full'
        style={{
          width: size,
          height: size,
          backgroundColor: color,
          top: 0,
          left: 0,
        }}
      />
    </div>
  );
};
